import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { v4 as uuidv4 } from 'uuid';
import { sleep } from '@helpers/utilities';
import FormData from 'form-data';
import * as fs from 'fs';
import * as puppeteer from 'puppeteer';
import { Meter } from '@core/modules/meters/entities/meter.entity';
import { MeterPhaseEnum } from '@core/types/supabase-types';
import path from 'path';
import { DcuForInstallDto } from '../dto/dcu-for-install.dto';

// todo: when migrating to monorepo,
// add types will be inferred from the core library
@Injectable()
export class CalinV1Service {
  // this is the array storing the chrome sessions that are running simultaneously
  concurrentSessions: any[] = [];

  // these are two in memory vars that we use to show what meter import talos
  // was last busy with. the services that call talos are going to be
  // asking periodically what the last item the
  meterImportId;
  lastStatus: string;
  sleepUnit: number;

  constructor(private readonly httpService: HttpService) {
    this.sleepUnit = parseInt(process.env.SLEEP_UNIT);
  }

  private _getSolution(transactionId: string): Promise<string> {
    const config = {
      method: 'get',
      url: `${ process.env.CAPTCHA_API }/res.php?key=${ process.env.CAPTCHA_API_KEY }&json=true&id=${ transactionId }&action=get`,
      headers: {},
    };

    return this.httpService
      .axiosRef(config)
      .then(res => res.data.request);
  }

  private _sendImage(fullPath): Promise<string> {
    const data = new FormData();
    data.append('file', fs.createReadStream(fullPath));

    const config = {
      method: 'post',
      url: `${ process.env.CAPTCHA_API }/in.php?key=${ process.env.CAPTCHA_API_KEY }&json=true`,
      headers: {
        ...data.getHeaders(),
      },
      data: data,
    };

    return this.httpService
      .axiosRef(config)
      .then(res => res.data.request);
  }

  private async getCaptchaSolution(fullPath): Promise<string> {
    const transactionId = await this._sendImage(fullPath);

    let solution: string;
    for (let i = 0; i < 5; i++) {
      await sleep(20000);
      try {
        solution = await this._getSolution(transactionId);
        if (typeof solution == 'string') {
          return solution;
        }
      }
      catch (err) {
        console.error(err);
        console.error(
          'An error occurred while trying to fetch CAPTCHA solution. Retrying...',
        );
      }
    }

    throw Error('Could not retrieve CAPTCHA even after retrying..');
  }

  private async takeScreenshotOfCaptcha(page) {
    const fullPath = `${ process.env.UPLOAD_FOLDER }/${ uuidv4() }.png`;
    const element = await page.$('#valiCode');
    await element.screenshot({ path: fullPath });
    return fullPath;
  }

  private async login(page) {
    for (let i = 0; i < 10; i++) {
      try {
        console.info('logging in');
        const codeScreenshotPath = await this.takeScreenshotOfCaptcha(page);
        console.info(`Screenshot saved at ${ codeScreenshotPath }`);
        const solution = await this.getCaptchaSolution(codeScreenshotPath);
        console.info(solution);
        const company = process.env.CALIN_V1_COMPANY_NAME;
        const username = process.env.CALIN_V1_USERNAME;
        const password = process.env.CALIN_V1_PASSWORD;
        await page.$eval(
          'input[name=Companyname]',
          (el, company) => (el.value = company),
          company,
        );
        await page.$eval(
          'input[name=Username]',
          (el, username) => (el.value = username),
          username,
        );
        await page.$eval(
          'input[name=Password]',
          (el, password) => (el.value = password),
          password,
        );
        await page.$eval(
          'input[name=verifycode]',
          (el, solution) => {
            el.value = solution;
          },
          solution,
        );

        await page.click('#Login');
        await sleep(this.sleepUnit);
        await page.click('#divContent > div.tabs-header > div.tabs-wrap > ul > li > a > span.tabs-title.tabs-with-icon');
        return sleep(this.sleepUnit);
      }
      catch (err) {
        console.error(err);
        console.info(`Could not login. Trying ${ i + 1 }/10 times...`);
      }
    }
  }

  private async unassignFromDCU(page, externalReference) {
    await sleep(this.sleepUnit * 2);
    await page.click('#accordionMenu > div:nth-child(3)');
    await sleep(this.sleepUnit);
    await page.click(
      '#accordionMenu > div:nth-child(3) > div.panel-body.accordion-body > a:nth-child(5)',
    );
    await sleep(this.sleepUnit * 2);

    await page.evaluate(externalReference => {
      SearchDCUMeterFile(externalReference, externalReference);
    }, externalReference);

    await sleep(this.sleepUnit);
    await page.click('#datagrid-row-r1-2-0 > td:nth-child(1) > div');

    await sleep(this.sleepUnit);
    await page.click(
      '#toolbarDCUMeterFile > a:nth-child(5) > span > span.l-btn-text',
    );
    await sleep(this.sleepUnit);

    await page.click(
      'body > div.panel.window.messager-window > div.dialog-button.messager-button > a:nth-child(1) > span > span',
    );

    return sleep(this.sleepUnit);
  }


  public async createMeter(page, externalReference, meterPhase: MeterPhaseEnum) {
    console.info('creating meter..');
    await page.reload({ waitUntil: [ 'networkidle0', 'domcontentloaded' ] });
    await sleep(this.sleepUnit);
    console.info(0);
    await page.click('#accordionMenu > div:nth-child(3) > div.panel-header.accordion-header > div.panel-title');

    await sleep(this.sleepUnit);

    // const codeScreenshotPath = await self.takeScreenshotOfCaptcha(page);
    // console.info(`Screenshot saved at ${ codeScreenshotPath }`);
    console.info(1);
    await page.click(
      '#accordionMenu > div:nth-child(3) > div.panel-body.accordion-body > a:nth-child(1)',
    );

    console.info(2);
    await sleep(this.sleepUnit);
    console.info(3);

    await page.click('#toolbarMeterNew > a:nth-child(1) > span > span.l-btn-text');
    console.info(4);
    await sleep(this.sleepUnit);
    console.info(5);
    const meterId = externalReference.substring(
      2,
      externalReference.length - 1,
    );

    await sleep(this.sleepUnit);
    await page.focus('#METER_ID1');
    await page.keyboard.type(meterId);

    await page.focus('#REMARK1');
    await page.keyboard.type(meterId);

    await sleep(this.sleepUnit);
    await page.click('#fmMeterNew1 > div:nth-child(3) > span > span > a');
    await sleep(this.sleepUnit);

    let phase;

    if (meterPhase === 'SINGLE_PHASE') {
      phase = 'Single Phase Meter';
    }
    else if (meterPhase === 'THREE_PHASE') {
      phase = 'Three Phase Meter';
    }
    else {
      throw new Error('Invalid phase specified for meter');
    }

    await page.evaluate(sol => {
      (
        [ ...document.querySelectorAll('.combobox-item') ].find(
          element => element.textContent === sol,
        ) as HTMLElement
      ).click();
    }, phase); //'Single Phase Meter'
    await sleep(this.sleepUnit);

    await page.evaluate(() => {
      SaveMeterNew1();
    });

    return sleep(this.sleepUnit);
  }

  private async createDcu(
    page,
    externalReference: string,
    name: string,
    location: string,
  ) {
    await sleep(this.sleepUnit * 2);
    await page.click('#accordionMenu > div:nth-child(3)');
    await sleep(this.sleepUnit);
    await page.click(
      '#accordionMenu > div:nth-child(3) > div.panel-body.accordion-body > a:nth-child(4)',
    );
    await sleep(this.sleepUnit);
    await page.click('#toolbarDCU > a:nth-child(2) > span > span.l-btn-text');
    await sleep(this.sleepUnit);

    await sleep(this.sleepUnit);
    await page.focus('#DCU_ID');
    await page.keyboard.type(externalReference);

    await page.focus('#DCU_NAME');
    await page.keyboard.type(`${ name } - via Talos`);

    await page.focus('#DCU_LOCATION');
    await page.keyboard.type(`${ location } - via Talos`);

    await sleep(this.sleepUnit);

    await page.evaluate(() => {
      SaveDCU();
    });

    return sleep(this.sleepUnit);
  }

  async createCustomerAccount(page, externalReference) {
    for (let attempt = 0; attempt < 2; attempt++) {

      try {
        await page.reload({ waitUntil: [ 'networkidle0', 'domcontentloaded' ] });
        await sleep(this.sleepUnit);
        await page.click('#accordionMenu > div:nth-child(1)');
        await page.click(
          '#accordionMenu > div:nth-child(1) > div.panel-body.accordion-body > a:nth-child(4)',
        );
        await sleep(this.sleepUnit);
        await page.click(
          '#toolbarCustomerMeterPrice > a:nth-child(1) > span > span.l-btn-text',
        );
        await sleep(this.sleepUnit);
        await page.click(
          '#fmCustomerMeterPrice > div:nth-child(2) > span > span > a',
        );
        await sleep(this.sleepUnit);
        await page.click('#datagrid-row-r3-2-0 > td:nth-child(1)');
        await sleep(this.sleepUnit);
        await page.click(
          '#fmCustomerMeterPrice > div:nth-child(4) > span > span > a',
        );
        await sleep(this.sleepUnit);
        await page.click('#datagrid-row-r5-2-0 > td:nth-child(1) > div');
        await sleep(this.sleepUnit);
        await page.click(
          '#fmCustomerMeterPrice > div:nth-child(3) > span > span > a',
        );
        await sleep(this.sleepUnit);
        const result = await page.evaluate(() => {
          const rows = document.querySelectorAll(
            'body > div:nth-child(10) > div > div > div > div > div.datagrid-view2 > div.datagrid-body > table',
          );
          return Array.from(rows, row => {
            const columns = row.querySelectorAll('td');
            return Array.from(columns, column => column.innerText);
          });
        });
        const array = result[0];
        const index = array.findIndex(i => {
          return i === externalReference;
        });

        if (index === -1) {
          console.info(`Index found for meter ${ externalReference } is: ${ index }`);
          throw new Error(`Could not find meter ${ externalReference } in customer account creation`);
        }

        const modIndex = index / 2;
        await page.click(`#datagrid-row-r4-2-${ modIndex }`);
        await sleep(this.sleepUnit);

        await page.evaluate(() => {
          SaveCustomerMeterPrice();
        });

        return sleep(this.sleepUnit);
      }
      catch (err) {
        console.error(`Error occurred when creating customer account for meter ${ externalReference }, trying again with attempt ${ attempt + 1 }/10...`);
        console.error(err);
      }
    }
  }

  async assignToDCU(page, meterExternalReference, dcuExternalReference) {
    await sleep(this.sleepUnit * 2);
    await page.click('#accordionMenu > div:nth-child(3)');
    await sleep(this.sleepUnit);
    await page.click(
      '#accordionMenu > div:nth-child(3) > div.panel-body.accordion-body > a:nth-child(5)',
    );
    await sleep(this.sleepUnit);
    await page.click('#toolbarDCUMeterFile > a:nth-child(3)');
    await sleep(this.sleepUnit);
    await page.click('#fmDCUMeterFile > div:nth-child(2) > span > span > a');
    await sleep(this.sleepUnit);

    await page.evaluate(sol => {
      (
          [ ...document.querySelectorAll('.combobox-item') ].find(
            element => element.textContent === sol,
          ) as HTMLElement
      ).click();
    }, dcuExternalReference);

    await page.click('#fmDCUMeterFile > div:nth-child(3) > span > span > a');
    await sleep(this.sleepUnit);

    await page.evaluate(sol => {
      (
          [ ...document.querySelectorAll('.combobox-item') ].find(
            element => element.textContent === sol,
          ) as HTMLElement
      ).click();
    }, meterExternalReference);

    await page.click('#fmDCUMeterFile > div:nth-child(4) > span > span > a');
    await sleep(this.sleepUnit);

    await page.evaluate(sol => {
      (
          [ ...document.querySelectorAll('.combobox-item') ].find(
            element => element.textContent === sol,
          ) as HTMLElement
      ).click();
    }, 'LoRa');

    await page.click('#fmDCUMeterFile > div:nth-child(5) > span > span > a');
    await sleep(this.sleepUnit);
    await page.evaluate(sol => {
      (
          [ ...document.querySelectorAll('.combobox-item') ].find(
            element => element.textContent === sol,
          ) as HTMLElement
      ).click();
    }, '9600');

    await page.evaluate(() => {
      SaveDCUMeterFile();
    });

    return sleep(this.sleepUnit);
  }

  private async deleteMeter(page, externalReference) {
    await sleep(this.sleepUnit * 2);
    await page.click('#accordionMenu > div:nth-child(3)');
    await sleep(this.sleepUnit);
    await page.click(
      '#accordionMenu > div:nth-child(3) > div.panel-body.accordion-body > a:nth-child(1)',
    );
    await sleep(this.sleepUnit);
    // here

    await page.evaluate(externalReference => {
      SearchMeterNew(externalReference, externalReference);
    }, externalReference);

    await sleep(this.sleepUnit);
    await page.click('#datagrid-row-r3-2-0 > td:nth-child(1) > div');

    await sleep(this.sleepUnit);

    await page.click('#toolbarMeterNew > a:nth-child(3) > span');

    await sleep(this.sleepUnit);

    await page.click(
      'body > div.panel.window.messager-window > div.dialog-button.messager-button > a:nth-child(1)',
    );

    return sleep(this.sleepUnit);
  }

  async deleteCustomerAccount(page: any, meterExternalReference: string) {

    await page.click('#accordionMenu > div:nth-child(1)');
    await sleep(this.sleepUnit);
    await page.click(
      '#accordionMenu > div:nth-child(1) > div.panel-body.accordion-body > a:nth-child(4)',
    );
    await sleep(this.sleepUnit);

    await page.evaluate(meterExternalReference => {
      SearchCustomerMeterPrice(meterExternalReference, meterExternalReference);
    }, meterExternalReference);

    await sleep(this.sleepUnit);
    await page.click('#datagrid-row-r2-2-0 > td:nth-child(1) > div');

    await sleep(this.sleepUnit);

    await page.click('#toolbarCustomerMeterPrice > a:nth-child(3)');

    await sleep(this.sleepUnit);

    await page.click(
      'body > div.panel.window.messager-window > div.dialog-button.messager-button > a:nth-child(1)',
    );

    return sleep(this.sleepUnit);
  }

  async removeMeter(meter: Meter) {
    const browser = await this.startBrowser();
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0);

    await page.goto(process.env.CALIN_V1_URL);

    // first we login
    await this.login(page);
    console.info('Logged in...');
    await sleep(this.sleepUnit);

    //unassign meter from dcu
    await this.unassignFromDCU(page, meter.external_reference);

    await sleep(this.sleepUnit);
    await page.reload({ waitUntil: [ 'networkidle0', 'domcontentloaded' ] });

    //remove account with the corresponding meter
    await this.deleteCustomerAccount(
      page,
      meter.external_reference,
    );

    await sleep(this.sleepUnit);

    //remove account with the corresponding meter
    await this.deleteMeter(page, meter.external_reference);

    await sleep(this.sleepUnit);
    browser.close();
  }

  async importMeter(meter: Meter): Promise<void> {
    let browser;
    let page;

    for (let i = 0; i < 20; i++) {
      try {
        browser = await this.startBrowser();
        page = await browser.newPage();
        await page.setDefaultNavigationTimeout(0);

        await page.goto(process.env.CALIN_V1_URL);
        // first we login
        await this.login(page);
        console.info('Logged in...');
        await sleep(this.sleepUnit * 2);

        await this.createMeter(
          page,
          meter.external_reference,
          meter.meter_phase,
        ); //todo: make phase dynamic
        break;
      }
      catch (err) {
        console.info(err);
        console.info('Retrying...');
        await browser.close(); // ✅ closes the browser instance
      }
    }

    console.info(
      `Added meter ${ meter.external_reference } to Calin...`,
    );
    await sleep(this.sleepUnit * 3); //we need to wait for a longer time here, since calin somehow does not show it immediately

    await page.reload({ waitUntil: [ 'networkidle0', 'domcontentloaded' ] });

    await sleep(this.sleepUnit);
    await this.createCustomerAccount(
      page,
      meter.external_reference,
    );
    console.info(
      `Added customer account for meter ${ meter.external_reference } to Calin...`,
    );
    await sleep(this.sleepUnit);
    await page.reload({ waitUntil: [ 'networkidle0', 'domcontentloaded' ] });
    await this.assignToDCU(
      page,
      meter.external_reference,
      meter.dcu.external_reference,
    );
    console.info(
      `Assigned meter ${ meter.external_reference } to DCU ${ meter.dcu.external_reference } in Calin...`,
    );
    await sleep(this.sleepUnit);

    console.info(
      `Completed meter ${ meter.external_reference } to DCU ${ meter.dcu.external_reference } in Calin...`,
    );
    browser.close();
  }

  public removeDcu(dcu: DcuForInstallDto): Promise<void>{
    console.info(`Not removing DCU in V1 ${ dcu.external_reference } since too dangerous`);
    return;
  }

  async startBrowser() {
    const userDataDir = path.resolve('./tmp/chrome-profile');
    // Remove the directory if it already exists
    if (fs.existsSync(userDataDir)) {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }

    // Recreate the directory
    fs.mkdirSync(userDataDir, { recursive: true });

    const browser = await puppeteer.launch({
      headless: 'true' === process.env.HEADLESS_CHROME,
      userDataDir,
      args: [
        '--no-sandbox',
        '--disable-features=AutofillServerCommunication,PasswordManagerOnboarding,CredentialLeakDialog,PasswordImport',
        '--disable-save-password-bubble',
        '--password-store=basic',
        '--no-default-browser-check',
        '--no-first-run',
        '--disable-extensions',
      ], //todo: should not be using this in prod
    });

    return browser;
  }

  public async importDcu(dcu: DcuForInstallDto): Promise<void> {
    const browser = await this.startBrowser();
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0);

    await page.goto(process.env.CALIN_V1_URL);

    await this.login(page);
    console.info('Logged in...');
    await sleep(this.sleepUnit * 4);

    await this.createDcu(
      page,
      dcu.external_reference,
      dcu.grid.name,
      dcu.grid.name,
    ); //using grid name for both name and location
    console.info(
      `Added dcu ${ dcu.external_reference } with name ${ dcu.grid.name } to Calin...`,
    );
    await sleep(this.sleepUnit);

    await sleep(this.sleepUnit);
    await page.reload({ waitUntil: [ 'networkidle0', 'domcontentloaded' ] });

    browser.close();
  }
}

// these definitions are necessary just to get typescript to compile
function SaveDCU() {
  throw new Error('Function not implemented.');
}
function SaveMeterNew1() {
  throw new Error('Function not implemented.');
}
function SearchDCUMeterFile(value, name) {
  // todo: @bobby I need to print this to console, otherwise husky
  // does not let me commit it since it would be unused otherwise
  // (comment line below to see what happens)
  console.info(`Searching meter ${ value } ${ name }`);
  throw new Error('Function not implemented.');
}
function SaveCustomerMeterPrice() {
  throw new Error('Function not implemented.');
}
function SaveDCUMeterFile() {
  throw new Error('Function not implemented.');
}
function SearchMeterNew(value, name) {
  console.info(`Searching meter ${ value } ${ name }`);
  throw new Error('Function not implemented.');
}
function SearchCustomerMeterPrice(value, name) {
  console.info(`Searching meter ${ value } ${ name }`);
  throw new Error('Function not implemented.');
}
