import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { sleep } from '@helpers/utilities';
import { Page } from 'puppeteer';
import { MeterPhaseEnum } from '@core/types/supabase-types';
import { RegisterCalinV1MeterDto } from './dto/register-calin-v1-meter.dto';
import { CalinV1CoreService } from './calin-v1-core.service';
import {
  CALIN_SELECTORS,
  CALIN_BROWSER_FUNCTIONS,
  CALIN_METER_PHASE_VALUES,
  CALIN_DCU_CONFIG,
  CALIN_RETRY_CONFIG,
  CALIN_TIMING,
} from './calin-v1.constants';
import {
  safeClick,
  safeType,
  safeReload,
  selectFromCombobox,
  callBrowserFunction,
  waitForPageIdle,
  withRetry,
  clickInVisiblePanel,
  getVisiblePanel,
  takeDebugScreenshot,
} from '../../helpers/puppeteer-helpers';

const {
  TIAMAT_API,
  TIAMAT_API_KEY,
  CONCURRENT_SESSIONS,
} = process.env;

const TIAMAT_API_OPTIONS = { headers: { 'X-API-KEY': TIAMAT_API_KEY } };
const ALLOWED_CONCURRENT_SESSIONS = Number(CONCURRENT_SESSIONS || 10);

/**
 * Service for registering meters in the CALIN V1 system.
 *
 * Registration flow:
 * 1. Add meter to Meter Management
 * 2. Create customer account for the meter
 * 3. Assign meter to DCU
 */
@Injectable()
export class CalinV1RegistrationService {
  runningRegistrations = 0;
  deferredRegistrations: RegisterCalinV1MeterDto[] = [];

  constructor(
    private readonly httpService: HttpService,
    private readonly coreService: CalinV1CoreService,
  ) {}

  /**
   * Registers a meter in CALIN and notifies Tiamat of the result.
   * Handles concurrent session limiting with a deferred queue.
   *
   * @param dto - Registration data including meter reference, phase, and DCU
   */
  public async registerMeter(dto: RegisterCalinV1MeterDto): Promise<void> {
    console.info('====== [REGISTER METER] ======', dto);
    if (this.runningRegistrations >= ALLOWED_CONCURRENT_SESSIONS) {
      this.deferredRegistrations.push(dto);
      return;
    }

    this.runningRegistrations++;

    let success: boolean;
    let failureReason: string | undefined;

    try {
      await this.doMeterRegistration(dto);
      success = true;
    }
    catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[registerMeter] Failed for: ${ dto.external_reference }`, err);
      success = false;
      failureReason = errorMessage;
    }
    finally {
      this.runningRegistrations--;
      const nextInLine = this.deferredRegistrations.shift();
      if (nextInLine) this.registerMeter(nextInLine);
      console.info(`====== REGISTRATION OF "${ dto.external_reference }" ${ success ? 'SUCCESSFUL' : 'FAILED' } ======`);
    }

    // Notify Tiamat of the result
    await this.httpService.axiosRef.post(
      `${ TIAMAT_API }/meter-installs/registration-result`,
      {
        external_reference: dto.external_reference,
        result: success ? 'SUCCESSFUL' : 'FAILED',
        ...(failureReason && { failure_reason: failureReason }),
      },
      TIAMAT_API_OPTIONS,
    );
  }

  /**
   * Performs the complete meter registration workflow.
   * Steps: Login → Add Meter → Create Customer Account → Assign to DCU
   *
   * Each step has individual retry logic with screenshots on failure.
   *
   * @param dto - Registration data including meter reference, phase, and DCU
   */
  private async doMeterRegistration({
    external_reference,
    meter_phase,
    dcu_external_reference,
  }: RegisterCalinV1MeterDto): Promise<void> {
    const browser = await this.coreService.startBrowser();
    let page: Page | null = null;

    try {
      page = await browser.newPage();
      page.setDefaultNavigationTimeout(60000);

      // Navigate and login (login has its own internal retry logic)
      await page.goto(this.coreService.calinUrl, { waitUntil: 'networkidle0' });
      await this.coreService.login(page);
      console.info(`[doMeterRegistration] Logged in for meter: ${ external_reference }`);

      // Step 1: Add meter to CALIN (with retry)
      const step1Result = await withRetry(
        async () => {
          await this.addMeter(page, external_reference, meter_phase);
          console.info(`[doMeterRegistration] Step 1 completed: Added meter ${ external_reference }`);
        },
        {
          maxRetries: CALIN_RETRY_CONFIG.MAX_STEP_RETRIES,
          description: `Registration Step 1 (addMeter) for ${ external_reference }`,
          page: page,
        },
      );

      if (!step1Result.success) {
        throw step1Result.error || new Error('Step 1 failed after all retries');
      }

      // Wait for CALIN backend to process the meter before it appears in dropdowns
      console.info('[doMeterRegistration] Waiting for meter to propagate in CALIN...');
      await sleep(CALIN_TIMING.METER_PROPAGATION_DELAY_MS);

      // Step 2: Create customer account (with retry)
      const step2Result = await withRetry(
        async () => {
          await this.createCustomerAccount(page, external_reference);
          console.info(`[doMeterRegistration] Step 2 completed: Created customer account for ${ external_reference }`);
        },
        {
          maxRetries: CALIN_RETRY_CONFIG.MAX_STEP_RETRIES,
          description: `Registration Step 2 (createCustomerAccount) for ${ external_reference }`,
          page: page,
        },
      );

      if (!step2Result.success) {
        throw step2Result.error || new Error('Step 2 failed after all retries');
      }

      // Step 3: Assign meter to DCU (with retry)
      const step3Result = await withRetry(
        async () => {
          await this.assignMeterToDCU(page, external_reference, dcu_external_reference);
          console.info(`[doMeterRegistration] Step 3 completed: Assigned ${ external_reference } to DCU ${ dcu_external_reference }`);
        },
        {
          maxRetries: CALIN_RETRY_CONFIG.MAX_STEP_RETRIES,
          description: `Registration Step 3 (assignMeterToDCU) for ${ external_reference }`,
          page: page,
        },
      );

      if (!step3Result.success) {
        throw step3Result.error || new Error('Step 3 failed after all retries');
      }

      console.info(`[doMeterRegistration] Completed for meter ${ external_reference } -> DCU ${ dcu_external_reference }`);
    }
    finally {
      await browser.close();
    }
  }

  /**
   * Adds a meter to the CALIN Meter Management system.
   * This is Step 1 of meter registration.
   *
   * Flow: Reload → Navigate to Meter Management tab → Fill form → Save
   *
   * @param page - Puppeteer page instance (must be logged in)
   * @param externalReference - Full meter external reference (e.g., "47001891341")
   * @param meterPhase - Whether the meter is single or three phase
   */
  private async addMeter(page: Page, externalReference: string, meterPhase: MeterPhaseEnum): Promise<void> {
    console.info(`====== ADDING "${ externalReference }" TO METER MANAGEMENT ======`);

    // Reload page to ensure clean state
    await safeReload(page);
    await waitForPageIdle(page);

    // Navigate to Meter Management accordion → Meter Management tab
    await safeClick(page, CALIN_SELECTORS.ACCORDION_MENU.METER_MANAGEMENT_PANEL, {
      description: 'Open Meter Management accordion',
      useJsClick: true,
    });

    await safeClick(page, CALIN_SELECTORS.SUBMENU.METER_MANAGEMENT, {
      description: 'Click Meter Management submenu',
      useJsClick: true,
    });

    await waitForPageIdle(page);

    // Directly call add meter function
    await callBrowserFunction(page, CALIN_BROWSER_FUNCTIONS.ADD_METER);
    await waitForPageIdle(page);

    // Extract meter ID from external reference (remove prefix and suffix)
    // e.g., "47001891341" -> "0018913"
    const meterId = externalReference.substring(2, externalReference.length - 1);

    // Fill in the meter form
    await safeType(page, CALIN_SELECTORS.METER_MANAGEMENT.FIELDS.METER_ID_FIRST_INPUT, meterId, {
      description: 'Enter Meter ID in first input',
      useJsInput: true,
    });

    await safeType(page, CALIN_SELECTORS.METER_MANAGEMENT.FIELDS.METER_ID_SECOND_INPUT, meterId, {
      description: 'Enter Meter ID in second input',
      useJsInput: true,
    });

    // Select meter phase type from dropdown
    const phaseDisplayValue = meterPhase === 'SINGLE_PHASE'
      ? CALIN_METER_PHASE_VALUES.SINGLE_PHASE
      : CALIN_METER_PHASE_VALUES.THREE_PHASE;

    await selectFromCombobox(
      page,
      CALIN_SELECTORS.METER_MANAGEMENT.FIELDS.METER_TYPE_DROPDOWN,
      phaseDisplayValue,
      { description: 'Select meter phase type' },
    );

    // Save the new meter
    await callBrowserFunction(page, CALIN_BROWSER_FUNCTIONS.SAVE_METER);

    console.info(`[addMeter] Completed for meter: ${ externalReference }`);
  }

  /**
   * Creates a customer account for a meter in CALIN.
   * This is Step 2 of meter registration - required for the meter to receive tokens.
   *
   * Flow: Reload → Navigate to Open an Account tab → Select dropdowns → Save
   *
   * Note: After page reload, the Customer Management accordion is open by default,
   * so we can directly click the submenu without expanding the accordion first.
   *
   * @param page - Puppeteer page instance (must be logged in)
   * @param externalReference - Full meter external reference (e.g., "47001891341")
   */
  private async createCustomerAccount(page: Page, externalReference: string): Promise<void> {
    console.info(`====== CREATING CUSTOMER ACCOUNT FOR "${ externalReference }" ======`);

    // Reload page to ensure clean state (Customer Management accordion opens by default)
    await safeReload(page);
    await waitForPageIdle(page);

    // Navigate to Open an Account tab (no accordion click needed - already open after reload)
    await safeClick(page, CALIN_SELECTORS.SUBMENU.OPEN_AN_ACCOUNT, {
      description: 'Click Open an Account submenu',
      useJsClick: true,
    });

    await waitForPageIdle(page);

    // Open the "Add Account" dialog
    await callBrowserFunction(page, CALIN_BROWSER_FUNCTIONS.ADD_METER_ACCOUNT);
    await waitForPageIdle(page);

    const { DROPDOWN_PANELS } = CALIN_SELECTORS.ACCOUNT_MANAGEMENT;

    // Select from Customer No dropdown (click trigger → select first row in visible panel)
    await safeClick(page, CALIN_SELECTORS.ACCOUNT_MANAGEMENT.FIELDS.DROPDOWN_CUSTOMER_NO, {
      description: 'Open Customer No dropdown',
      useJsClick: true,
    });

    await clickInVisiblePanel(
      page,
      DROPDOWN_PANELS.PANEL_SELECTOR,
      DROPDOWN_PANELS.FIRST_ROW_SELECTOR,
      { description: 'Select first option from Customer No' },
    );

    // Select from Price ID dropdown
    await safeClick(page, CALIN_SELECTORS.ACCOUNT_MANAGEMENT.FIELDS.DROPDOWN_PRICE_ID, {
      description: 'Open Price ID dropdown',
      useJsClick: true,
    });
    await clickInVisiblePanel(
      page,
      DROPDOWN_PANELS.PANEL_SELECTOR,
      DROPDOWN_PANELS.FIRST_ROW_SELECTOR,
      { description: 'Select first option from Price ID' },
    );

    // Select the specific meter from Meter No dropdown
    await safeClick(page, CALIN_SELECTORS.ACCOUNT_MANAGEMENT.FIELDS.DROPDOWN_METER_NO, {
      description: 'Open Meter No dropdown',
      useJsClick: true,
    });
    await this.findAndClickMeterInDropdown(page, externalReference);

    // Save the customer account
    await callBrowserFunction(page, CALIN_BROWSER_FUNCTIONS.SAVE_CUSTOMER_METER_PRICE);

    console.info(`[createCustomerAccount] Completed for meter: ${ externalReference }`);
  }

  /**
   * Finds a meter in the dropdown table by its external reference and clicks it.
   * Gets the visible dropdown panel and searches for the meter row within it.
   *
   * @param page - Puppeteer page instance
   * @param externalReference - Meter external reference to find and click
   * @throws Error if meter is not found in the table
   */
  private async findAndClickMeterInDropdown(page: Page, externalReference: string): Promise<void> {
    const { DROPDOWN_PANELS } = CALIN_SELECTORS.ACCOUNT_MANAGEMENT;

    // Get the table from the currently visible dropdown panel
    const tableElement = await getVisiblePanel(
      page,
      DROPDOWN_PANELS.PANEL_SELECTOR,
      DROPDOWN_PANELS.TABLE_SELECTOR,
      { timeout: 30000 },
    );

    if (!tableElement) {
      throw new Error('[findAndClickMeterInDropdown] Could not find meter table in dropdown panel');
    }

    // Extract all cell values from the table
    const result = await tableElement.evaluate(table => {
      const columns = table.querySelectorAll('td');
      return Array.from(columns, column => (column as HTMLElement).innerText);
    });

    // Find the index of the meter in the array
    const cellIndex = result.findIndex(cellText => cellText === externalReference);

    if (cellIndex === -1) {
      throw new Error(
        `[findAndClickMeterInDropdown] Meter "${ externalReference }" not found in dropdown table. ` +
        `Available values: ${ result.slice(0, 10).join(', ') }${ result.length > 10 ? '...' : '' }`,
      );
    }

    // The table has 2 columns per row, so divide by 2 to get row index
    const rowIndex = Math.floor(cellIndex / 2);
    console.info(`[findAndClickMeterInDropdown] Found meter "${ externalReference }" at row index: ${ rowIndex }`);

    // Get all rows in the table and click the correct one
    const rows = await tableElement.$$('tr');

    if (rowIndex >= rows.length) {
      throw new Error(
        `[findAndClickMeterInDropdown] Row index ${ rowIndex } out of bounds (table has ${ rows.length } rows)`,
      );
    }

    const targetRow = rows[rowIndex];

    // Click the row using JavaScript click for reliability
    await targetRow.evaluate(el => (el as HTMLElement).click());

    console.info(`[findAndClickMeterInDropdown] Clicked meter row at index ${ rowIndex }`);
  }

  /**
   * Assigns a meter to a DCU (Data Concentrator Unit) in CALIN.
   * This is Step 3 of meter registration - links the meter to its communication hardware.
   *
   * Flow: Reload → Navigate to DCU Meter File tab → Fill form → Save
   *
   * @param page - Puppeteer page instance (must be logged in)
   * @param meterExternalReference - Full meter external reference (e.g., "47001891341")
   * @param dcuExternalReference - DCU external reference to assign the meter to
   */
  private async assignMeterToDCU(
    page: Page,
    meterExternalReference: string,
    dcuExternalReference: string,
  ): Promise<void> {
    console.info(`====== ASSIGNING "${ meterExternalReference }" TO DCU "${ dcuExternalReference }" METER FILE ======`);

    // Reload page to ensure clean state
    await safeReload(page);
    await waitForPageIdle(page);

    // Navigate to Meter Management accordion → DCU Meter File tab
    await safeClick(page, CALIN_SELECTORS.ACCORDION_MENU.METER_MANAGEMENT_PANEL, {
      description: 'Open Meter Management accordion',
      useJsClick: true,
    });

    await safeClick(page, CALIN_SELECTORS.SUBMENU.DCU_METER_FILE, {
      description: 'Click DCU Meter File submenu',
      useJsClick: true,
    });

    await waitForPageIdle(page);

    // Open the "Add DCU Assignment" form
    await callBrowserFunction(page, CALIN_BROWSER_FUNCTIONS.ADD_METER_TO_DCU_METER_FILE);
    await waitForPageIdle(page);

    // Select DCU from dropdown
    await selectFromCombobox(
      page,
      CALIN_SELECTORS.DCU_FILE_MANAGEMENT.FIELDS.DCU_DROPDOWN,
      dcuExternalReference,
      { description: 'Select DCU' },
    );

    // await takeDebugScreenshot(
    //   page,
    //   'AFTER_SELECTING_DCU',
    // );

    // Select Meter from dropdown
    await selectFromCombobox(
      page,
      CALIN_SELECTORS.DCU_FILE_MANAGEMENT.FIELDS.METER_DROPDOWN,
      meterExternalReference,
      { description: 'Select Meter' },
    );

    // await takeDebugScreenshot(
    //   page,
    //   'AFTER_SELECTING_METER',
    // );

    // Select communication protocol (LoRa)
    await selectFromCombobox(
      page,
      CALIN_SELECTORS.DCU_FILE_MANAGEMENT.FIELDS.PROTOCOL_DROPDOWN,
      CALIN_DCU_CONFIG.PROTOCOL,
      { description: 'Select Protocol' },
    );

    // await takeDebugScreenshot(
    //   page,
    //   'AFTER_SELECTING_PROTOCOL',
    // );

    // Select baud rate (9600)
    await selectFromCombobox(
      page,
      CALIN_SELECTORS.DCU_FILE_MANAGEMENT.FIELDS.BAUD_RATE_DROPDOWN,
      CALIN_DCU_CONFIG.BAUD_RATE,
      { description: 'Select Baud Rate' },
    );

    // await takeDebugScreenshot(
    //   page,
    //   'AFTER_SELECTING_BAUD_RATE',
    // );

    // Save the DCU-meter assignment
    await callBrowserFunction(page, CALIN_BROWSER_FUNCTIONS.SAVE_DCU_METER_FILE);

    await takeDebugScreenshot(
      page,
      'AFTER_SAVE',
    );

    console.info(`[assignMeterToDCU] Completed for meter: ${ meterExternalReference } -> DCU: ${ dcuExternalReference }`);
  }
}
