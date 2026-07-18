import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import FormData from 'form-data';
import { createReadStream, existsSync, rmSync, mkdirSync } from 'fs';
import path from 'path';
import { sleep } from '@helpers/utilities';
import { v4 as uuidv4 } from 'uuid';
import { Browser, ImageFormat, Page } from 'puppeteer';
import { launch } from 'puppeteer';
import {
  CALIN_SELECTORS,
  CALIN_RETRY_CONFIG,
} from './calin-v1.constants';
import {
  safeClick,
  safeSetValue,
  waitForElement,
} from '../../helpers/puppeteer-helpers';

const {
  HEADLESS_CHROME,
  UPLOAD_FOLDER,
  CAPTCHA_API,
  CAPTCHA_API_KEY,
  CALIN_V1_URL,
  CALIN_V1_COMPANY_NAME,
  CALIN_V1_USERNAME,
  CALIN_V1_PASSWORD,
} = process.env;

/**
 * Core service for CALIN V1 browser automation.
 * Handles browser lifecycle, login, and captcha solving.
 *
 * This service is injected by registration and deregistration services.
 */
@Injectable()
export class CalinV1CoreService {
  constructor(
    private readonly httpService: HttpService,
  ) {}

  /**
   * URL for the CALIN V1 interface
   */
  get calinUrl(): string {
    return CALIN_V1_URL;
  }

  /**
   * Launches a new browser instance with a clean profile.
   * The profile directory is recreated each time to ensure a fresh state.
   *
   * @returns Browser instance
   */
  async startBrowser(): Promise<Browser> {
    const userDataDir = path.resolve('./tmp/chrome-profile');

    // Remove the directory if it already exists
    if (existsSync(userDataDir)) {
      rmSync(userDataDir, { recursive: true, force: true });
    }

    // Recreate the directory
    mkdirSync(userDataDir, { recursive: true });

    const browser = await launch({
      headless: 'true' === HEADLESS_CHROME,
      userDataDir,
      args: [
        '--no-sandbox',
        '--disable-features=AutofillServerCommunication,PasswordManagerOnboarding,CredentialLeakDialog,PasswordImport',
        '--disable-save-password-bubble',
        '--password-store=basic',
        '--no-default-browser-check',
        '--no-first-run',
        '--disable-extensions',
      ],
    });

    return browser;
  }

  /**
   * Logs into the CALIN V1 interface.
   * Handles CAPTCHA solving via external service with retry logic.
   *
   * @param page - Puppeteer page instance (should be on the login page)
   * @throws Error if login fails after all retry attempts
   */
  async login(page: Page): Promise<void> {
    console.info('====== LOGGING IN ======');
    for (let attempt = 1; attempt <= CALIN_RETRY_CONFIG.MAX_LOGIN_RETRIES; attempt++) {
      try {
        console.info(`[login] Attempt ${ attempt }/${ CALIN_RETRY_CONFIG.MAX_LOGIN_RETRIES }`);

        // Get CAPTCHA solution from external service
        const captchaScreenshotPath = await this.takeScreenshotOfCaptcha(page);
        console.info(`[login] Captcha screenshot saved at: ${ captchaScreenshotPath }`);

        const captchaSolution = await this.getCaptchaSolution(captchaScreenshotPath);
        console.info(`[login] Captcha solution received: ${ captchaSolution }`);

        // Fill in the login form
        // Note: EasyUI creates hidden inputs for form submission, so we use visible: false
        await safeSetValue(page, CALIN_SELECTORS.LOGIN.COMPANY_INPUT, CALIN_V1_COMPANY_NAME, {
          description: 'Enter company name',
          visible: false,
        });

        await safeSetValue(page, CALIN_SELECTORS.LOGIN.USERNAME_INPUT, CALIN_V1_USERNAME, {
          description: 'Enter username',
          visible: false,
        });

        await safeSetValue(page, CALIN_SELECTORS.LOGIN.PASSWORD_INPUT, CALIN_V1_PASSWORD, {
          description: 'Enter password',
          visible: false,
        });

        await safeSetValue(page, CALIN_SELECTORS.LOGIN.CAPTCHA_INPUT, captchaSolution, {
          description: 'Enter captcha solution',
          visible: false,
        });

        // Click login button
        await safeClick(page, CALIN_SELECTORS.LOGIN.LOGIN_BUTTON, {
          description: 'Click Login button',
        });

        // Wait for and click the main tab to confirm login success
        await safeClick(page, CALIN_SELECTORS.LOGIN.MAIN_TAB, {
          description: 'Click main tab after login',
        });

        console.info('[login] Login successful');
        return;
      }
      catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[login] Attempt ${ attempt } failed: ${ errorMessage }`);

        if (attempt === CALIN_RETRY_CONFIG.MAX_LOGIN_RETRIES) {
          throw new Error(`[login] Failed after ${ CALIN_RETRY_CONFIG.MAX_LOGIN_RETRIES } attempts. Last error: ${ errorMessage }`);
        }

        console.info('[login] Retrying...');
      }
    }
  }

  /**
   * Takes a screenshot of the CAPTCHA image element.
   *
   * @param page - Puppeteer page instance
   * @returns Path to the saved screenshot
   */
  private async takeScreenshotOfCaptcha(page: Page): Promise<string> {
    const screenshotPath: `${ string }.${ ImageFormat }` = `${ UPLOAD_FOLDER }/${ uuidv4() }.png`;

    // Wait for the captcha image to be present
    const captchaElement = await waitForElement(page, CALIN_SELECTORS.LOGIN.CAPTCHA_IMAGE, {
      visible: true,
    });

    if (!captchaElement) {
      throw new Error('[takeScreenshotOfCaptcha] Captcha image element not found');
    }

    await captchaElement.screenshot({ path: screenshotPath });
    return screenshotPath;
  }

  /**
   * Sends a captcha image to the solving service and polls for the solution.
   *
   * @param fullPath - Path to the captcha screenshot
   * @returns The solved captcha text
   * @throws Error if captcha cannot be solved after all retries
   */
  private async getCaptchaSolution(fullPath: string): Promise<string> {
    const transactionId = await this.sendImageToCaptchaSolver(fullPath);

    for (let attempt = 1; attempt <= CALIN_RETRY_CONFIG.MAX_CAPTCHA_RETRIES; attempt++) {
      // Wait for the captcha service to process the image
      await sleep(CALIN_RETRY_CONFIG.CAPTCHA_FETCH_DELAY_MS);

      try {
        const solution = await this.fetchSolutionFromCaptchaSolver(transactionId);
        if (typeof solution === 'string' && solution.length > 0) {
          // Check if the service is still processing (note: typo is from the API)
          if (solution === 'CAPCHA_NOT_READY') {
            console.info(`[getCaptchaSolution] Attempt ${ attempt }: Captcha not ready yet, will retry...`);
            continue;
          }
          return solution;
        }
        console.warn(`[getCaptchaSolution] Empty or invalid response on attempt ${ attempt }`);
      }
      catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[getCaptchaSolution] Attempt ${ attempt } failed: ${ errorMessage }`);
      }
    }

    throw new Error(`[getCaptchaSolution] Failed after ${ CALIN_RETRY_CONFIG.MAX_CAPTCHA_RETRIES } attempts`);
  }

  private sendImageToCaptchaSolver(fullPath: string): Promise<string> {
    const data = new FormData();
    data.append('file', createReadStream(fullPath));

    const config = {
      method: 'post',
      url: `${ CAPTCHA_API }/in.php?key=${ CAPTCHA_API_KEY }&json=true`,
      headers: {
        ...data.getHeaders(),
      },
      data: data,
    };

    return this.httpService
      .axiosRef(config)
      .then(res => res.data.request);
  }

  private fetchSolutionFromCaptchaSolver(transactionId: string): Promise<string> {
    const config = {
      method: 'get',
      url: `${ CAPTCHA_API }/res.php?key=${ CAPTCHA_API_KEY }&json=true&id=${ transactionId }&action=get`,
      headers: {},
    };

    return this.httpService
      .axiosRef(config)
      .then(res => res.data.request);
  }
}
