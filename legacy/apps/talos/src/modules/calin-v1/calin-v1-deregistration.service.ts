import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { Page } from 'puppeteer';
import { CalinV1CoreService } from './calin-v1-core.service';
import {
  CALIN_SELECTORS,
  CALIN_BROWSER_FUNCTIONS,
  CALIN_RETRY_CONFIG,
} from './calin-v1.constants';
import {
  safeClick,
  safeReload,
  callBrowserFunction,
  waitForPageIdle,
  withRetry,
} from '../../helpers/puppeteer-helpers';

const {
  TIAMAT_API,
  TIAMAT_API_KEY,
} = process.env;

const TIAMAT_API_OPTIONS = { headers: { 'X-API-KEY': TIAMAT_API_KEY } };

/**
 * Service for deregistering meters from the CALIN V1 system.
 *
 * Deregistration flow (reverse of registration):
 * 1. Unassign meter from DCU
 * 2. Delete customer account
 * 3. Remove meter from Meter Management
 */
@Injectable()
export class CalinV1DeregistrationService {
  constructor(
    private readonly httpService: HttpService,
    private readonly coreService: CalinV1CoreService,
  ) {}

  /**
   * Deregisters a meter from CALIN.
   * Steps: Login → Unassign from DCU → Delete Customer Account → Remove Meter
   *
   * Each step has individual retry logic with screenshots on failure.
   *
   * @param external_reference - The meter's external reference to deregister
   */
  public async deregisterMeter(external_reference: string): Promise<void> {
    const browser = await this.coreService.startBrowser();
    let success: boolean;
    let failureReason: string | undefined;
    let page: Page | null = null;

    try {
      page = await browser.newPage();
      page.setDefaultNavigationTimeout(60000);

      // Navigate and wait for network to settle (CALIN uses EasyUI which loads dynamically)
      await page.goto(this.coreService.calinUrl, { waitUntil: 'networkidle0' });
      await this.coreService.login(page);
      console.info(`[deregisterMeter] Logged in for meter: ${ external_reference }`);

      // Step 1: Unassign from DCU (with retry)
      const step1Result = await withRetry(
        async () => {
          await this.unassignFromDCU(page, external_reference);
          console.info(`[deregisterMeter] Step 1 completed: Unassigned ${ external_reference } from DCU`);
        },
        {
          maxRetries: CALIN_RETRY_CONFIG.MAX_STEP_RETRIES,
          description: `Deregistration Step 1 (unassignFromDCU) for ${ external_reference }`,
          page: page,
        },
      );

      if (!step1Result.success) {
        throw step1Result.error || new Error('Step 1 failed after all retries');
      }

      // Step 2: Delete customer account (with retry)
      const step2Result = await withRetry(
        async () => {
          await this.deleteCustomerAccount(page, external_reference);
          console.info(`[deregisterMeter] Step 2 completed: Deleted customer account for ${ external_reference }`);
        },
        {
          maxRetries: CALIN_RETRY_CONFIG.MAX_STEP_RETRIES,
          description: `Deregistration Step 2 (deleteCustomerAccount) for ${ external_reference }`,
          page: page,
        },
      );

      if (!step2Result.success) {
        throw step2Result.error || new Error('Step 2 failed after all retries');
      }

      // Step 3: Remove meter (with retry)
      const step3Result = await withRetry(
        async () => {
          await this.removeMeter(page, external_reference);
          console.info(`[deregisterMeter] Step 3 completed: Removed ${ external_reference } from CALIN`);
        },
        {
          maxRetries: CALIN_RETRY_CONFIG.MAX_STEP_RETRIES,
          description: `Deregistration Step 3 (removeMeter) for ${ external_reference }`,
          page: page,
        },
      );

      if (!step3Result.success) {
        throw step3Result.error || new Error('Step 3 failed after all retries');
      }

      console.info(`[deregisterMeter] Completed deregistration for meter ${ external_reference }`);
      success = true;
    }
    catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[deregisterMeter] Failed for meter ${ external_reference }: ${ errorMessage }`);
      success = false;
      failureReason = errorMessage;
    }
    finally {
      await browser.close();
      console.info(`====== DEREGISTRATION OF "${ external_reference }" ${ success ? 'SUCCESSFUL' : 'FAILED' } ======`);
    }

    // Notify Tiamat of the result
    await this.httpService.axiosRef.post(
      `${ TIAMAT_API }/meter-installs/deregistration-result`,
      {
        external_reference,
        result: success ? 'SUCCESSFUL' : 'FAILED',
        ...(failureReason && { failure_reason: failureReason }),
      },
      TIAMAT_API_OPTIONS,
    );
  }

  /**
   * Unassigns a meter from its DCU in CALIN.
   * This is Step 1 of deregistration (reverse of registration Step 3).
   *
   * Flow: Reload → Navigate to DCU Meter File tab → Search → Select → Delete → Confirm
   *
   * @param page - Puppeteer page instance (must be logged in)
   * @param externalReference - Full meter external reference to unassign
   */
  private async unassignFromDCU(page: Page, externalReference: string): Promise<void> {
    console.info(`====== REMOVING "${ externalReference }" FROM DCU METER FILE ======`);

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

    // Wait for page JS to load (needed for search function to be available)
    await waitForPageIdle(page);

    // Search for the meter's DCU assignment
    await callBrowserFunction(
      page,
      CALIN_BROWSER_FUNCTIONS.SEARCH_DCU_METER_FILE,
      externalReference,
      externalReference,
    );

    // Wait for search results to load
    await waitForPageIdle(page);

    // Select the first (and should be only) result row
    await safeClick(page, CALIN_SELECTORS.DATA_TABLE.FIRST_ROW, {
      description: 'Select meter assignment row',
      useJsClick: true,
    });

    await waitForPageIdle(page);

    // Delete the selected assignment
    await callBrowserFunction(page, CALIN_BROWSER_FUNCTIONS.DELETE_METER_FROM_DCU_METER_FILE);

    await waitForPageIdle(page);

    // Confirm deletion in dialog
    await safeClick(page, CALIN_SELECTORS.DIALOG.CONFIRM_BUTTON, {
      description: 'Confirm deletion',
      useJsClick: true,
    });

    console.info(`[unassignFromDCU] Completed for meter: ${ externalReference }`);
  }

  /**
   * Deletes a customer account for a meter in CALIN.
   * This is Step 2 of deregistration (reverse of registration Step 2).
   *
   * Flow: Reload → Navigate to Open an Account tab → Search → Select → Delete → Confirm
   *
   * Note: After page reload, the Customer Management accordion is open by default,
   * so we can directly click the submenu without expanding the accordion first.
   *
   * @param page - Puppeteer page instance (must be logged in)
   * @param externalReference - Full meter external reference
   */
  private async deleteCustomerAccount(page: Page, externalReference: string): Promise<void> {
    console.info(`====== DELETING CUSTOMER ACCOUNT FOR "${ externalReference }" ======`);

    // Reload page to ensure clean state (Customer Management accordion opens by default)
    await safeReload(page);
    await waitForPageIdle(page);

    // Navigate to Open an Account tab (no accordion click needed - already open after reload)
    await safeClick(page, CALIN_SELECTORS.SUBMENU.OPEN_AN_ACCOUNT, {
      description: 'Click Open an Account submenu',
      useJsClick: true,
    });

    // Wait for page JS to load (needed for search function to be available)
    await waitForPageIdle(page);

    // Search for the customer account
    await callBrowserFunction(
      page,
      CALIN_BROWSER_FUNCTIONS.SEARCH_CUSTOMER_METER_PRICE,
      externalReference,
      externalReference,
    );

    // Wait for search results to load
    await waitForPageIdle(page);

    // Select the first (and should be only) result row
    await safeClick(page, CALIN_SELECTORS.DATA_TABLE.FIRST_ROW, {
      description: 'Select customer account row',
      useJsClick: true,
    });

    await waitForPageIdle(page);

    // Delete the selected account
    await callBrowserFunction(page, CALIN_BROWSER_FUNCTIONS.DELETE_METER_ACCOUNT);

    await waitForPageIdle(page);

    // Confirm deletion in dialog
    await safeClick(page, CALIN_SELECTORS.DIALOG.CONFIRM_BUTTON, {
      description: 'Confirm deletion',
      useJsClick: true,
    });

    console.info(`[deleteCustomerAccount] Completed for meter: ${ externalReference }`);
  }

  /**
   * Removes a meter from CALIN Meter Management.
   * This is Step 3 of deregistration (reverse of registration Step 1).
   *
   * Flow: Reload → Navigate to Meter Management tab → Search → Select → Delete → Confirm
   *
   * @param page - Puppeteer page instance (must be logged in)
   * @param externalReference - Full meter external reference to remove
   */
  private async removeMeter(page: Page, externalReference: string): Promise<void> {
    console.info(`====== REMOVING "${ externalReference }" FROM METER MANAGEMENT ======`);

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

    // Wait for page JS to load (needed for search function to be available)
    await waitForPageIdle(page);

    // Search for the meter
    await callBrowserFunction(
      page,
      CALIN_BROWSER_FUNCTIONS.SEARCH_METER,
      externalReference,
      externalReference,
    );

    // Wait for search results to load
    await waitForPageIdle(page);

    // Select the first (and should be only) result row
    await safeClick(page, CALIN_SELECTORS.DATA_TABLE.FIRST_ROW, {
      description: 'Select meter row',
      useJsClick: true,
    });

    await waitForPageIdle(page);

    // Delete the selected meter
    await callBrowserFunction(page, CALIN_BROWSER_FUNCTIONS.DELETE_METER);

    await waitForPageIdle(page);

    // Confirm deletion in dialog
    await safeClick(page, CALIN_SELECTORS.DIALOG.CONFIRM_BUTTON, {
      description: 'Confirm deletion',
      useJsClick: true,
    });

    console.info(`[removeMeter] Completed for meter: ${ externalReference }`);
  }
}
