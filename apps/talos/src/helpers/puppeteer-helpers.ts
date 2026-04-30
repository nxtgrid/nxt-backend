import { Page, ElementHandle, ImageFormat } from 'puppeteer';

/**
 * Default timeout for waiting operations (in milliseconds)
 */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Default delay between retries (in milliseconds)
 */
const DEFAULT_RETRY_DELAY_MS = 2000;

/**
 * Default path for debug screenshots
 */
const DEFAULT_SCREENSHOT_PATH = process.env.UPLOAD_FOLDER || '/var/tmp';

/**
 * Options for safe click operations
 */
interface SafeClickOptions {
  /** Timeout in milliseconds for waiting for the element */
  timeout?: number;
  /** Whether to scroll the element into view before clicking */
  scrollIntoView?: boolean;
  /** Additional delay after click (use sparingly, prefer waitForNetworkIdle or waitForSelector) */
  delayAfterClick?: number;
  /** Description for logging purposes */
  description?: string;
  /**
   * Use JavaScript click (element.click()) instead of Puppeteer's simulated mouse click.
   * Useful for elements where Puppeteer's coordinate-based click doesn't trigger events properly.
   */
  useJsClick?: boolean;
}

/**
 * Options for safe type operations
 */
interface SafeTypeOptions {
  /** Timeout in milliseconds for waiting for the element */
  timeout?: number;
  /** Whether to clear existing value before typing */
  clearExisting?: boolean;
  /** Delay between keystrokes in milliseconds */
  typeDelay?: number;
  /** Description for logging purposes */
  description?: string;
  /**
   * Use JavaScript to set the value directly instead of simulating keystrokes.
   * Useful for EasyUI inputs that don't respond to Puppeteer's keyboard simulation.
   * This sets el.value directly and dispatches input/change events.
   */
  useJsInput?: boolean;
}

/**
 * Options for combobox selection
 */
interface ComboboxSelectOptions {
  /** Timeout in milliseconds for waiting for elements */
  timeout?: number;
  /** Description for logging purposes */
  description?: string;
}

/**
 * Options for retry wrapper
 */
interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  delayMs?: number;
  /** Description for logging purposes */
  description?: string;
  /** Whether to take a screenshot on each failure */
  screenshotOnFailure?: boolean;
  /** Page instance for taking screenshots */
  page?: Page;
  /** Path prefix for debug screenshots */
  screenshotPath?: string;
}

/**
 * Result of a retry operation
 */
interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
}

/**
 * Waits for an element to be present and visible, then clicks it safely.
 * This is the recommended way to click elements instead of using page.click() directly.
 *
 * @param page - The Puppeteer page instance
 * @param selector - CSS selector for the element to click
 * @param options - Configuration options
 * @throws Error if element is not found or not clickable within timeout
 *
 * @example
 * ```typescript
 * await safeClick(page, '#submitButton', { description: 'Submit form' });
 * ```
 */
export async function safeClick(
  page: Page,
  selector: string,
  options: SafeClickOptions = {},
): Promise<void> {
  const {
    timeout = DEFAULT_TIMEOUT_MS,
    scrollIntoView = true,
    delayAfterClick,
    description,
    useJsClick = false,
  } = options;

  const logPrefix = description ? `[${ description }]` : '';

  try {
    // Wait for the element to be present in DOM
    await page.waitForSelector(selector, {
      visible: true,
      timeout,
    });

    // Get the element handle
    const element = await page.$(selector);
    if (!element) {
      throw new Error(`Element not found after waitForSelector: ${ selector }`);
    }

    // Scroll into view if needed
    if (scrollIntoView) {
      await element.evaluate(el => {
        el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
      });
      // Small delay to let scroll complete
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 100)));
    }

    // Wait for element to be clickable (not covered by another element)
    await waitForElementClickable(page, element, timeout);

    // Perform the click
    if (useJsClick) {
      // Use native JavaScript click - bypasses Puppeteer's coordinate-based click
      // Useful for elements where simulated mouse events don't trigger properly
      await element.evaluate(el => (el as HTMLElement).click());
    }
    else {
      // Use Puppeteer's simulated mouse click at element center
      await element.click();
    }

    console.info(`${ logPrefix } Clicked: ${ selector }`.trim());

    // Optional delay after click
    if (delayAfterClick && delayAfterClick > 0) {
      await page.evaluate(
        ms => new Promise(resolve => setTimeout(resolve, ms)),
        delayAfterClick,
      );
    }
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`${ logPrefix } Failed to click "${ selector }": ${ errorMessage }`.trim());
  }
}

/**
 * Clicks on a child element within the currently visible parent element.
 * Finds the visible panel among multiple matching elements and clicks the child within it.
 *
 * Useful for EasyUI-style dropdowns where multiple panels exist in DOM but only one is visible.
 *
 * @param page - The Puppeteer page instance
 * @param parentSelector - CSS selector that matches multiple parent elements (e.g., '.panel.combo-p')
 * @param childSelector - CSS selector for the element to click within the visible parent
 * @param options - Configuration options
 *
 * @example
 * await clickInVisiblePanel(page, '.panel.combo-p', '.datagrid-btable tr:first-of-type');
 */
export async function clickInVisiblePanel(
  page: Page,
  parentSelector: string,
  childSelector: string,
  options: { timeout?: number; description?: string; useJsClick?: boolean } = {},
): Promise<void> {
  const { timeout = DEFAULT_TIMEOUT_MS, description, useJsClick = true } = options;
  const logPrefix = description ? `[${ description }]` : '';

  try {
    // Wait for at least one parent element to exist
    await page.waitForSelector(parentSelector, { timeout });

    // Poll until we find a visible parent
    const startTime = Date.now();
    let visibleParent: ElementHandle | null = null;

    while (Date.now() - startTime < timeout) {
      const parents = await page.$$(parentSelector);

      for (const parent of parents) {
        const isVisible = await parent.evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });

        if (isVisible) {
          visibleParent = parent;
          break;
        }
      }

      if (visibleParent) break;

      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 100)));
    }

    if (!visibleParent) {
      throw new Error(`No visible element found for selector "${ parentSelector }"`);
    }

    // Find the child element within the visible parent
    const childElement = await visibleParent.$(childSelector);

    if (!childElement) {
      throw new Error(`Child element "${ childSelector }" not found in visible panel`);
    }

    // Scroll into view
    await childElement.evaluate(el => {
      el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
    });
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 100)));

    // Perform the click
    if (useJsClick) {
      await childElement.evaluate(el => (el as HTMLElement).click());
    }
    else {
      await childElement.click();
    }

    console.info(`${ logPrefix } Clicked "${ childSelector }" in visible panel`.trim());
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`${ logPrefix } Failed to click in visible panel: ${ errorMessage }`.trim());
  }
}

/**
 * Gets the currently visible panel among multiple matching elements.
 * Optionally returns a child element within that panel.
 *
 * Useful for EasyUI-style dropdowns where multiple panels exist in DOM but only one is visible.
 *
 * @param page - The Puppeteer page instance
 * @param parentSelector - CSS selector that matches multiple parent elements
 * @param childSelector - CSS selector for element within the panel (optional, returns panel if not provided)
 * @param options - Configuration options
 * @returns ElementHandle for the found element, or null if not found
 *
 * @example
 * const table = await getVisiblePanel(page, '.panel.combo-p', '.datagrid-btable');
 */
export async function getVisiblePanel(
  page: Page,
  parentSelector: string,
  childSelector?: string,
  options: { timeout?: number } = {},
): Promise<ElementHandle | null> {
  const { timeout = DEFAULT_TIMEOUT_MS } = options;

  try {
    await page.waitForSelector(parentSelector, { timeout });

    // Poll until we find a visible parent
    const startTime = Date.now();
    let visibleParent: ElementHandle | null = null;

    while (Date.now() - startTime < timeout) {
      const parents = await page.$$(parentSelector);

      for (const parent of parents) {
        const isVisible = await parent.evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });

        if (isVisible) {
          visibleParent = parent;
          break;
        }
      }

      if (visibleParent) break;

      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 100)));
    }

    if (!visibleParent) {
      console.warn(`No visible element found for selector "${ parentSelector }"`);
      return null;
    }

    if (!childSelector) {
      return visibleParent;
    }

    return await visibleParent.$(childSelector);
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to get visible panel: ${ errorMessage }`);
    return null;
  }
}

/**
 * Waits for an input element to be present, then types into it safely.
 *
 * @param page - The Puppeteer page instance
 * @param selector - CSS selector for the input element
 * @param text - Text to type into the element
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * await safeType(page, '#username', 'john@example.com', { clearExisting: true });
 * ```
 */
export async function safeType(
  page: Page,
  selector: string,
  text: string,
  options: SafeTypeOptions = {},
): Promise<void> {
  const {
    timeout = DEFAULT_TIMEOUT_MS,
    clearExisting = true,
    typeDelay = 0,
    description,
    useJsInput = false,
  } = options;

  const logPrefix = description ? `[${ description }]` : '';

  try {
    // Wait for the element to be present
    await page.waitForSelector(selector, {
      visible: true,
      timeout,
    });

    const element = await page.$(selector);
    if (!element) {
      throw new Error(`Element not found after waitForSelector: ${ selector }`);
    }

    if (useJsInput) {
      // Use JavaScript to set value directly - works better with EasyUI inputs
      await element.evaluate((el: HTMLInputElement, value: string) => {
        el.focus();
        el.value = value;
        // Dispatch events to trigger EasyUI's handlers
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, text);
    }
    else {
      // Click to focus the element
      await element.click();

      // Clear existing value if needed
      if (clearExisting) {
        await element.evaluate((el: HTMLInputElement) => {
          el.value = '';
        });
      }

      // Type the text character by character
      await element.type(text, { delay: typeDelay });
    }

    console.info(`${ logPrefix } Typed into: ${ selector }`.trim());
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`${ logPrefix } Failed to type into "${ selector }": ${ errorMessage }`.trim());
  }
}

/**
 * Sets the value of an input element directly (faster than typing character by character).
 * Useful for filling in forms where keystroke simulation is not needed.
 *
 * @param page - The Puppeteer page instance
 * @param selector - CSS selector for the input element
 * @param value - Value to set
 * @param options - Configuration options
 * @param options.visible - Whether to wait for the element to be visible (default: true).
 *                          Set to false for hidden inputs (e.g., EasyUI form inputs).
 */
export async function safeSetValue(
  page: Page,
  selector: string,
  value: string,
  options: { timeout?: number; description?: string; visible?: boolean } = {},
): Promise<void> {
  const { timeout = DEFAULT_TIMEOUT_MS, description, visible = true } = options;
  const logPrefix = description ? `[${ description }]` : '';

  try {
    await page.waitForSelector(selector, { visible, timeout });

    await page.$eval(
      selector,
      (el: HTMLInputElement, val: string) => {
        el.value = val;
      },
      value,
    );

    console.info(`${ logPrefix } Set value for: ${ selector }`.trim());
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`${ logPrefix } Failed to set value for "${ selector }": ${ errorMessage }`.trim());
  }
}

/**
 * Selects an option from a combobox dropdown by clicking the dropdown trigger
 * and then finding and clicking the option with matching text.
 *
 * This handles the EasyUI combobox pattern used in the CALIN interface.
 *
 * @param page - The Puppeteer page instance
 * @param dropdownTriggerSelector - CSS selector for the dropdown trigger/arrow button
 * @param optionText - The text of the option to select
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * await selectFromCombobox(page, '#meterType > span > a', 'Single Phase Meter');
 * ```
 */
export async function selectFromCombobox(
  page: Page,
  dropdownTriggerSelector: string,
  optionText: string,
  options: ComboboxSelectOptions = {},
): Promise<void> {
  const { timeout = DEFAULT_TIMEOUT_MS, description } = options;
  const logPrefix = description ? `[${ description }]` : '';

  try {
    // Click the dropdown trigger to open the options
    await safeClick(page, dropdownTriggerSelector, {
      timeout,
      description: `${ description } - open dropdown`,
      useJsClick: true,
    });

    // Poll for a visible combobox item and click the matching option
    const startTime = Date.now();
    let clicked = false;

    while (Date.now() - startTime < timeout) {
      // Find and click the option with matching text (only if visible)
      clicked = await page.evaluate((text: string) => {
        const items = document.querySelectorAll('.combobox-item');
        for (const item of items) {
          const style = window.getComputedStyle(item);
          const isVisible = style.display !== 'none' && style.visibility !== 'hidden';

          if (isVisible && item.textContent?.trim() === text) {
            (item as HTMLElement).click();
            return true;
          }
        }
        return false;
      }, optionText);

      if (clicked) break;

      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 100)));
    }

    if (!clicked) {
      throw new Error(`Combobox option "${ optionText }" not found or not visible within timeout`);
    }

    // Brief wait for dropdown to close
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 100)));

    console.info(`${ logPrefix } Selected combobox option: "${ optionText }"`.trim());
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${ logPrefix } Failed to select "${ optionText }" from combobox "${ dropdownTriggerSelector }": ${ errorMessage }`.trim(),
    );
  }
}

/**
 * Finds a row in a datagrid table that contains the specified text and clicks it.
 *
 * @param page - The Puppeteer page instance
 * @param tableSelector - CSS selector for the table or table container
 * @param searchText - Text to search for in the table rows
 * @param options - Configuration options
 * @returns The index of the found row
 */
export async function findAndClickTableRow(
  page: Page,
  tableSelector: string,
  searchText: string,
  options: { timeout?: number; description?: string } = {},
): Promise<number> {
  const { timeout = DEFAULT_TIMEOUT_MS, description } = options;
  const logPrefix = description ? `[${ description }]` : '';

  try {
    await page.waitForSelector(tableSelector, { visible: true, timeout });

    const result = await page.evaluate(
      ({ selector, text }) => {
        const table = document.querySelector(selector);
        if (!table) return { found: false, index: -1 };

        const rows = table.querySelectorAll('tr');
        for (let i = 0; i < rows.length; i++) {
          if (rows[i].textContent?.includes(text)) {
            (rows[i] as HTMLElement).click();
            return { found: true, index: i };
          }
        }
        return { found: false, index: -1 };
      },
      { selector: tableSelector, text: searchText },
    );

    if (!result.found) {
      throw new Error(`Row containing "${ searchText }" not found in table`);
    }

    console.info(`${ logPrefix } Clicked table row containing: "${ searchText }"`.trim());
    return result.index;
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${ logPrefix } Failed to find and click row with "${ searchText }": ${ errorMessage }`.trim(),
    );
  }
}

/**
 * Waits for the page to be idle (no pending network requests).
 * Useful after actions that trigger API calls.
 *
 * @param page - The Puppeteer page instance
 * @param options - Configuration options
 */
export async function waitForPageIdle(
  page: Page,
  options: { timeout?: number; idleTime?: number } = {},
): Promise<void> {
  const { timeout = DEFAULT_TIMEOUT_MS, idleTime = 500 } = options;

  try {
    await page.waitForNetworkIdle({
      timeout,
      idleTime,
    });
  }
  catch {
    // Network idle timeout is often not critical, just log and continue
    console.warn('waitForNetworkIdle timed out, continuing anyway');
  }
}

/**
 * Takes a debug screenshot with a timestamp and context name.
 *
 * @param page - The Puppeteer page instance
 * @param context - A descriptive name for the screenshot context
 * @param basePath - Base path for saving screenshots
 * @returns The full path to the saved screenshot
 */
export async function takeDebugScreenshot(
  page: Page,
  context: string,
  basePath: string = '/var/tmp',
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sanitizedContext = context.replace(/[^a-zA-Z0-9-_]/g, '_');
  const filename = `${ timestamp }_${ sanitizedContext }`;
  const fullPath: `${ string }.${ ImageFormat }` = `${ basePath }/${ filename }.png`;

  try {
    await page.screenshot({
      path: fullPath,
      fullPage: true,
    });
    console.info(`Debug screenshot saved: ${ fullPath }`);
    return fullPath;
  }
  catch (error) {
    console.error(`Failed to take debug screenshot: ${ error }`);
    return '';
  }
}

/**
 * Executes a function with retry logic.
 * Will retry the function up to maxRetries times with a delay between attempts.
 *
 * @param fn - The async function to execute
 * @param options - Configuration options
 * @returns Result object with success status, result/error, and attempt count
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => addMeter(page, meterId),
 *   { maxRetries: 3, description: 'Add meter' }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    delayMs = DEFAULT_RETRY_DELAY_MS,
    description = 'operation',
    screenshotOnFailure = true,
    page,
    screenshotPath = DEFAULT_SCREENSHOT_PATH,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return {
        success: true,
        result,
        attempts: attempt,
      };
    }
    catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `[${ description }] Attempt ${ attempt }/${ maxRetries } failed: ${ lastError.message }`,
      );

      // Take screenshot on failure if requested
      if (screenshotOnFailure && page) {
        await takeDebugScreenshot(
          page,
          `${ description }_attempt${ attempt }_failure`,
          screenshotPath,
        );
      }

      // Don't wait after the last attempt
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: maxRetries,
  };
}

/**
 * Calls a function defined in the browser's global scope.
 * Includes proper error handling for functions that might not exist.
 *
 * @param page - The Puppeteer page instance
 * @param functionName - Name of the global function to call
 * @param args - Arguments to pass to the function
 */
export async function callBrowserFunction(
  page: Page,
  functionName: string,
  ...args: unknown[]
): Promise<unknown> {
  return page.evaluate(
    ({ fnName, fnArgs }) => {

      const fn = (window as any)[fnName];
      if (typeof fn !== 'function') {
        throw new Error(`Function "${ fnName }" not found in browser context`);
      }
      return fn(...fnArgs);
    },
    { fnName: functionName, fnArgs: args },
  );
}

/**
 * Waits for an element to be clickable (visible and not covered by another element).
 * This is an internal helper used by safeClick.
 *
 * @param page - The Puppeteer page instance
 * @param element - The element handle to check
 * @param timeout - Maximum time to wait in milliseconds
 */
async function waitForElementClickable(
  page: Page,
  element: ElementHandle,
  timeout: number,
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const isClickable = await element.evaluate(el => {
      const rect = el.getBoundingClientRect();

      // Check if element has dimensions
      if (rect.width === 0 || rect.height === 0) {
        return false;
      }

      // Check if element is in viewport
      if (
        rect.top < 0 ||
        rect.left < 0 ||
        rect.bottom > window.innerHeight ||
        rect.right > window.innerWidth
      ) {
        // Element might be scrollable into view, that's OK
      }

      // Check if element is covered by another element
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const elementAtPoint = document.elementFromPoint(centerX, centerY);

      // The element at that point should be the element itself or a descendant
      return el === elementAtPoint || el.contains(elementAtPoint);
    });

    if (isClickable) {
      return;
    }

    // Wait a bit before checking again
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 100)));
  }

  throw new Error('Element not clickable within timeout');
}

/**
 * Navigates to a URL and waits for the page to be fully loaded.
 *
 * @param page - The Puppeteer page instance
 * @param url - The URL to navigate to
 * @param options - Configuration options
 */
export async function safeGoto(
  page: Page,
  url: string,
  options: { timeout?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2' } = {},
): Promise<void> {
  const { timeout = DEFAULT_TIMEOUT_MS, waitUntil = 'networkidle0' } = options;

  await page.goto(url, {
    waitUntil,
    timeout,
  });
}

/**
 * Reloads the page and waits for it to be fully loaded.
 *
 * @param page - The Puppeteer page instance
 * @param options - Configuration options
 */
export async function safeReload(
  page: Page,
  options: { timeout?: number } = {},
): Promise<void> {
  const { timeout = DEFAULT_TIMEOUT_MS } = options;

  await page.reload({
    waitUntil: [ 'networkidle0', 'domcontentloaded' ],
    timeout,
  });
}

/**
 * Waits for an element to be present in the DOM (doesn't need to be visible).
 *
 * @param page - The Puppeteer page instance
 * @param selector - CSS selector for the element
 * @param options - Configuration options
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options: { timeout?: number; visible?: boolean } = {},
): Promise<ElementHandle | null> {
  const { timeout = DEFAULT_TIMEOUT_MS, visible = false } = options;

  return page.waitForSelector(selector, {
    visible,
    timeout,
  });
}
