import { HttpException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CurrencyEnum } from '@core/types/supabase-types';

const Flutterwave = require('flutterwave-node-v3');

@Injectable()
export class FlutterwaveService {

  flw;

  constructor(
    private readonly httpService: HttpService,
  ) {
    this.flw = new Flutterwave(process.env.FLW_PUBLIC_KEY, process.env.FLW_SECRET_KEY);
  }

  public verifyTransactionByExternalReference(txRef: string): Promise<{
    status: string;
    amount: number;
    payment_type: 'card' | 'bank_transfer' | 'ussd';
    currency: string;
  }> {
    return this.httpService
      .axiosRef
      .get(`${ process.env.FLW_API }/transactions/verify_by_reference`, {
        params: {
          tx_ref: txRef,
        },
        headers: {
          'Authorization': `Bearer ${ process.env.FLW_SECRET_KEY }`,
        },
      })
      .then(res => {
        const _data = res.data?.data;
        if(!_data) throw new NotFoundException(`Could not find corresponding FW transaction for tx ref: ${ txRef }`);
        return _data;
      })
      .catch(err => {
        // Re-throw HTTP exceptions (like NotFoundException) without wrapping
        if (err instanceof HttpException) throw err;

        const message = `We received an error when trying to verify order with reference: ${ txRef }`;
        console.error(message);
        console.error(err.response?.data?.message);
        throw new InternalServerErrorException(message);
      })
    ;
  }

  public async createChargeByUSSD(options: {
    amount: number,
    external_reference: string,
    bank_code: string,
    currency: CurrencyEnum,
    email: string,
    phone: string,
    meta: {
      organization_name: string,
      grid_name: string,
      customer_full_name: string,
      meter_external_reference: string,
      type: string
    },
    full_name: string
  }): Promise<string> {
    let result = '';
    const fwCharge = {
      'tx_ref': options.external_reference,
      'account_bank': options.bank_code,
      'amount': String(options.amount),
      'currency': String(options.currency),
      'email': options.email,
      // 'account_number': 'somerandomnumber',
      'meta': {
        organization: options.meta.organization_name,
        grid: options.meta.grid_name,
        customer_full_name: options.meta.customer_full_name,
        meter_external_reference: options.meta.meter_external_reference,
        type: options.meta.type,
      },
      'phone_number': options.phone,
      'fullname': options.full_name,
    };

    try {
      const response = await this.flw.Charge.ussd(fwCharge);
      console.info('[FLUTTERWAVE] Created charge by USSD');
      console.info('RES', response);
      if (response?.data == null || response?.meta?.authorization == null || response?.body?.status === 'error') {
        throw new HttpException(response?.body?.message, 500);
      }

      result = response?.meta?.authorization?.note;
    }
    catch (err) {
      console.error('[USSD] Error creating charge', err);
    }
    finally {
      // not sure why it's complaining
      // eslint-disable-next-line no-unsafe-finally
      return result;
    }
  }

  // // this function transfers funds from our flutterwave account to a recipient account
  // async transfer(options: {
  //   bankCode: string,
  //   bankAccountNumber: string,
  //   amount: number,
  //   currency: CurrencyEnum,
  //   narration: string,
  //   external_reference: string
  // }) {
  //   const payload = {
  //     'account_bank': options.bankCode, //This is the recipient bank code. Get list here :https://developer.flutterwave.com/v3.0/reference#get-all-banks
  //     'account_number': options.bankAccountNumber,
  //     'amount': options.amount,
  //     'narration': options.narration,
  //     'currency': options.currency,
  //     'reference': options.external_reference, // This is a merchant's unique reference for the transfer, it can be used to query for the status of the transfer
  //     // 'callback_url': 'https://webhook.site/b3e505b0-fe02-430e-a538-22bbbce8ce0d',
  //     'debit_currency': options.currency,
  //   };

  //   return this.flw.Transfer.initiate(payload);
  // }
}
