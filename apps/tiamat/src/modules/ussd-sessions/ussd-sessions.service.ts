import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { v4 as uuidv4 } from 'uuid';
import { MetersService } from '../meters/meters.service';
import { OrdersService } from '../orders/orders.service';
import { WalletsService } from '../wallets/wallets.service';
import { FlutterwaveService } from '../flutterwave/flutterwave.service';
import { SupabaseService } from '@core/modules/supabase.module';
import { BANKING_SYSTEM_WALLET_ID } from '@core/constants';
import { ussdSessionForHopQuery, UssdSessionForHop } from './lib/supabase';
import { makePhoneCompliantForSupabaseFilter } from '@helpers/phone-helpers';
import { toSafeNumberOrNull } from '@helpers/number-helpers';

const BANKS = {
  BANKS_FIRST_PAGE: [
    'First bank of Nigeria',
    'FCMB',
    'Stanbic IBTC bank',
    'United Bank for Africa',
    'Access Bank',
    'Zenith Bank',
  ],
  BANKS_SECOND_PAGE: [
    'Guaranty Trust Bank',
    'Sterling Bank',
    'Fidelity Bank',
    'Keystone Bank',
    'Unity Bank',
    'Ecobank',
  ],
  BANKS_THIRD_PAGE: [
    'Heritage bank',
    'Union bank',
    'Wema bank',
  ],
};

type UssdSessionHopDto = {
  phone: string,
  text: string,
  network_code: string,
  service_code: string,
  ussd_session_id?: number;
}

@Injectable()
export class UssdSessionsService {
  constructor(
    private readonly metersService: MetersService,
    private readonly flutterwaveService: FlutterwaveService,
    private readonly ordersService: OrdersService,
    private readonly walletsService: WalletsService,
    private readonly httpService: HttpService,
    private readonly supabaseService: SupabaseService,
  ) { }

  async processNewUssdHop(externalReference: string, ussdSessionHopDto: UssdSessionHopDto): Promise<string> {
    const { adminClient: supabase, handleResponse } = this.supabaseService;
    // We only entertain one external system for now
    const external_system = 'AFRICASTALKING';

    try {
      let ussdSession = await supabase
        .from('ussd_sessions')
        .select(ussdSessionForHopQuery)
        .eq('external_reference', externalReference)
        .eq('external_system', external_system)
        .maybeSingle()
        .then(handleResponse)
    ;

      if (!ussdSession) {
        // console.info('[USSD SESSIONS SERVICE] Looking up account for phone number', ussdSessionHopDto.phone);
        const supabaseCompliantNumber = makePhoneCompliantForSupabaseFilter(ussdSessionHopDto.phone);
        const account = await supabase
          .from('accounts')
          .select('id')
          .eq('phone', supabaseCompliantNumber)
          .is('deleted_at', null)
          .maybeSingle()
          .then(handleResponse)
      ;
        // if(account) console.info('[USSD SESSIONS SERVICE] Found account', account.id);

        ussdSession = await supabase
          .from('ussd_sessions')
          .insert({
            phone: ussdSessionHopDto.phone,
            account_id: account?.id,
            external_reference: externalReference,
            external_system,
          })
          .select(ussdSessionForHopQuery)
          .maybeSingle()
          .then(handleResponse)
        ;
      }

      ussdSessionHopDto.ussd_session_id = ussdSession.id;

      if (ussdSession.account?.agent) {
        return this.handleAgentSessionHop(ussdSession, ussdSessionHopDto);
      }
      else if (ussdSession.account?.customer) {
        return this.handleCustomerSessionHop(ussdSession, ussdSessionHopDto);
      }
      else {
        return this.handleGuestSessionHop(ussdSession, ussdSessionHopDto);
      }
    }
    // We do one general catch because it rarely happens.
    // Should more errors arise we can make it more fine-grained.
    catch(err) {
      console.error(`[USSD SESSION SERVICE] Error for session with external ref ${ externalReference }:`, err);
      return 'END An error occurred. Please try again later.';
    }
  }

  private async handleAgentSessionHop(ussdSession: UssdSessionForHop, hopDto: UssdSessionHopDto): Promise<string> {
    const { adminClient: supabase, handleResponse } = this.supabaseService;
    const { account: { agent }, meter } = ussdSession;
    const hopCount = ussdSession.ussd_session_hops?.length ?? 0;

    // console.info('[USSD SESSIONS SERVICE] Doing agent session for agent', agent.id);

    switch(hopCount) {
      case 0: {
        await supabase
          .from('ussd_session_hops')
          .insert(hopDto)
          .then(handleResponse)
        ;

        const walletBalance = await this.walletsService.findBalanceById(agent.wallet.id);
        return `CON Balance: NGN${ walletBalance }\nTopup meter number: `;
      }
      case 1: {
        return this._selectMeterBlock(ussdSession, hopDto);
      }
      case 2: {
        const amount = toSafeNumberOrNull(hopDto.text);

        if (amount === null) {
          return 'CON Invalid input. Please enter amount:';
        }

        // Check if the balance is enough
        const walletBalance = await this.walletsService.findBalanceById(agent.wallet.id);
        if (walletBalance < amount) {
          return `CON Balance insufficient. Please enter amount lower than NGN${ walletBalance }: `;
        }

        await supabase
          .from('ussd_sessions')
          .update({ amount })
          .eq('id', ussdSession.id)
          .then(handleResponse)
        ;

        await supabase
          .from('ussd_session_hops')
          .insert(hopDto)
          .then(handleResponse)
        ;

        await this.ordersService.create({
          sender_wallet_id: agent.wallet.id,
          receiver_wallet_id: meter.wallet.id,
          amount,
          currency: 'NGN',
          payment_channel: 'USSD',
          ussd_session_id: ussdSession.id,
          author_id: ussdSession.account.id,
        });

        return 'END Request sent. You will receive a confirmation SMS briefly.';
      }
      default: {
        return 'CON Error: Invalid Selection';
      }
    }
  }

  private async handleCustomerSessionHop(ussdSession: UssdSessionForHop, hopDto: UssdSessionHopDto): Promise<string> {
    const { adminClient: supabase, handleResponse } = this.supabaseService;
    const { account: { customer } } = ussdSession;
    const hopCount = ussdSession.ussd_session_hops?.length ?? 0;

    // console.info('[USSD SESSIONS SERVICE] Doing customer session for customer', customer.id);

    switch(hopCount) {
      case 0: {
        await supabase
          .from('ussd_session_hops')
          .insert(hopDto)
          .then(handleResponse)
        ;

        const meters = await supabase
          .from('meters')
          .select(`
          id,
          external_reference,
          connection:connections!inner(
            customer_id
          )
        `)
          .eq('connection.customer_id', customer.id)
          .order('id', { ascending: true })
          .then(handleResponse)
      ;

        if (!meters.length) return 'CON Enter meter number: ';

        return meters.reduce((accStr, meter, index) => {
          accStr += `${ index + 1 }. ${ meter.external_reference }\n`;
          if (index === meters.length - 1) {
            accStr += `${ index + 2 }. Other`;
          }
          return accStr;
        }, 'CON Select one meter to topup: \n');
      }
      case 1: {
        const customerMeters = await supabase
          .from('meters')
          .select(`
            id,
            external_reference,
            connection:connections!inner(
              customer_id,
              customer:customers(
                account:accounts(
                  full_name
                )
              )
            )
          `)
          .eq('connection.customer_id', customer.id)
          .order('id', { ascending: true })
          .then(handleResponse)
        ;

        let meter: {
          id: number;
          external_reference: string;
          connection: {
            customer: {
              account: {
                full_name: string;
              };
            };
          };
        };

        // If the customer has no own meters, we process the meter external reference directly
        if(!customerMeters.length) {
          meter = await supabase
            .from('meters')
            .select(`
              id,
              external_reference,
              connection:connections(
                customer:customers(
                  account:accounts(
                    full_name
                  )
                )
              )
            `)
            .eq('external_reference', hopDto.text)
            .maybeSingle()
            .then(handleResponse)
          ;
          if (!meter) {
            return 'CON Meter not found. Please enter a valid meter number: ';
          }
        }
        // Otherwise, we process the menu number to select the meter
        else {
          const chosenMenuOption = Number(hopDto.text);
          const totalAvailableMenuOptions = customerMeters.length + 1; // The number of meters + the other option

          // Invalid selection, resend options
          if (isNaN(chosenMenuOption) || chosenMenuOption < 1 || chosenMenuOption > totalAvailableMenuOptions) {
          // Return the selection string again
            return customerMeters.reduce((accStr, meter, index) => {
              accStr += `${ index + 1 }. ${ meter.external_reference }\n`;
              if (index === customerMeters.length - 1) {
                accStr += `${ index + 2 }. Other`;
              }
              return accStr;
            }, 'CON Select one meter to topup: \n');
          }

          // The member selected the "other option" so needs to enter a meter number
          if (chosenMenuOption === totalAvailableMenuOptions) {
            await supabase
              .from('ussd_sessions')
              .update({ is_using_other_option: true })
              .eq('id', ussdSession.id)
              .then(handleResponse)
            ;

            await supabase
              .from('ussd_session_hops')
              .insert(hopDto)
              .then(handleResponse)
            ;

            return 'CON Please insert meter number: ';
          }

          meter = customerMeters[chosenMenuOption - 1];
        }

        await supabase
          .from('ussd_sessions')
          .update({ meter_id: meter.id })
          .eq('id', ussdSession.id)
          .then(handleResponse)
        ;

        await supabase
          .from('ussd_session_hops')
          .insert(hopDto)
          .then(handleResponse)
        ;

        return `CON Enter amount to topup for ${ meter.connection?.customer?.account?.full_name }: `;
      }
      case 2: {
        if (ussdSession.is_using_other_option) {
          return this._selectMeterBlock(ussdSession, hopDto);
        }
        else {
          return this._selectAmountBlock(ussdSession, hopDto);
        }
      }
      case 3: {
        if (ussdSession.is_using_other_option) {
          return this._selectAmountBlock(ussdSession, hopDto);
        }
        else {
          const { response, bank } = await this._selectBankBlock(ussdSession, hopDto, 1);
          if(bank) this.initiateUSSDCharge(ussdSession, bank);
          return response;
        }
      }
      case 4: {
        if (ussdSession.is_using_other_option) {
          const { response, bank } = await this._selectBankBlock(ussdSession, hopDto, 2);
          if(bank) this.initiateUSSDCharge(ussdSession, bank);
          return response;
        }
        return 'CON Error: Invalid Selection';
      }
      default: {
        return 'CON Error: Invalid Selection';
      }
    }
  }

  private async handleGuestSessionHop(ussdSession: UssdSessionForHop, hopDto: UssdSessionHopDto): Promise<string> {
    const { adminClient: supabase, handleResponse } = this.supabaseService;
    const hopCount = ussdSession.ussd_session_hops?.length ?? 0;
    const userChoice = Number(hopDto.text);

    // console.info('[USSD SESSIONS SERVICE] Doing guest session');

    switch (hopCount) {
      // First hop - Enter meter number
      case 0: {
        await supabase
          .from('ussd_session_hops')
          .insert(hopDto)
          .then(handleResponse)
        ;
        return 'CON Enter meter number: ';
      }
      // Second hop - Select meter
      case 1: {
        return this._selectMeterBlock(ussdSession, hopDto);
      }
      // Third hop - Select amount
      case 2: {
        return this._selectAmountBlock(ussdSession, hopDto);
      }
      case 3: // Fourth hop - Select bank (first page)
      case 4: // Fifth hop - Select bank (second page)
      case 5: { // Sixth hop - Select bank (third page)
        const currentPage = this._determineCurrentPage(hopCount, userChoice);

        const { response, bank } = await this._selectBankBlock(ussdSession, hopDto, currentPage);
        if(bank) this.initiateUSSDCharge(ussdSession, bank);
        return response;
      }
      default: {
        return 'CON Error: Invalid Selection';
      }
    }
  }

  private _determineCurrentPage(hopCount: number, userChoice: number): number {
    if (hopCount === 3 && userChoice !== 9) return 1;
    if (hopCount === 3 && userChoice === 9) return 2;
    if (hopCount === 4 && userChoice !== 9) return 2;
    if (hopCount === 4 && userChoice === 9) return 3;
    if (hopCount === 5 && userChoice !== 9) return 3;
    // Default to first page
    return 1;
  }

  private async _selectMeterBlock(ussdSession: { id: number; }, hopDto: UssdSessionHopDto): Promise<string> {
    const { adminClient: supabase, handleResponse } = this.supabaseService;

    const meter = await supabase
      .from('meters')
      .select(`
        id,
        connection:connections(
          customer:customers(
            id,
            account:accounts(
              full_name
            )
          )
        ),
        last_metering_hardware_install_session:last_metering_hardware_install_session_id(
          last_meter_commissioning:last_meter_commissioning_id(
            meter_commissioning_status
          )
        )
      `)
      .eq('external_reference', hopDto.text)
      .maybeSingle()
      .then(handleResponse)
    ;

    if (!this.metersService.isReadyToBeToppedUp(meter)) {
      return 'CON Not found. Please enter meter number: ';
    }

    await supabase
      .from('ussd_sessions')
      .update({ meter_id: meter.id })
      .eq('id', ussdSession.id)
      .then(handleResponse)
    ;

    await supabase
      .from('ussd_session_hops')
      .insert(hopDto)
      .then(handleResponse)
    ;

    return `CON Enter amount to topup to ${ meter.connection?.customer?.account?.full_name }: `;
  }

  private async _selectAmountBlock(
    ussdSession: { id: number; },
    hopDto: UssdSessionHopDto,
  ): Promise<string> {
    const { adminClient: supabase, handleResponse } = this.supabaseService;
    const amount = Number(hopDto.text);

    if (isNaN(amount)) {
      return 'CON Invalid input. Please enter amount: ';
    }

    await supabase
      .from('ussd_sessions')
      .update({ amount })
      .eq('id', ussdSession.id)
      .then(handleResponse)
    ;

    await supabase
      .from('ussd_session_hops')
      .insert(hopDto)
      .then(handleResponse)
    ;

    return this._createBankString(BANKS.BANKS_FIRST_PAGE, 1);
  }

  private _createBankString(banks: string[], currentPage: number): string {
    const headerString = 'CON Select a bank:\n';
    let finalString = banks.map((bank, index) => `${ index + 1 }. ${ bank }`).join('\n');

    if (currentPage < 3) {
      finalString += '\n9. Next Page';
    }

    return headerString + finalString;
  }

  private _getBanksForCurrentPage(currentPage: number): string[] {
    switch (currentPage) {
      case 1: return BANKS.BANKS_FIRST_PAGE;
      case 2: return BANKS.BANKS_SECOND_PAGE;
      case 3: return BANKS.BANKS_THIRD_PAGE;
      default: return BANKS.BANKS_FIRST_PAGE;
    }
  }

  private async _selectBank(userChoice: number, banksList: string[]) {
    if (userChoice >= 1 && userChoice <= banksList.length) {
      const bankName = banksList[userChoice - 1];
      return this.supabaseService.adminClient
        .from('banks')
        .select('id, external_id')
        .eq('name', bankName)
        .maybeSingle()
        .then(this.supabaseService.handleResponse)
      ;
    }
    return null;
  }

  async _selectBankBlock(
    ussdSession: { id: number; },
    hopDto: UssdSessionHopDto,
    currentPage: number,
  ): Promise<{ response: string; bank?: { id: number; external_id: string; } }> {
    const { adminClient: supabase, handleResponse } = this.supabaseService;
    const userChoice = Number(hopDto.text);

    // Next Page
    if(userChoice === 9) {
      await supabase
        .from('ussd_session_hops')
        .insert(hopDto)
        .then(handleResponse)
      ;
      const banksList = this._getBanksForCurrentPage(currentPage);
      return { response: this._createBankString(banksList, currentPage) };
    }

    const banksList = this._getBanksForCurrentPage(currentPage);
    const bank = await this._selectBank(userChoice, banksList);

    if (!bank) {
      const headerString = 'CON Invalid input. Please select a bank:\n';
      const banksString = this._createBankString(banksList, currentPage);
      return { response: headerString + banksString };
    }

    await supabase
      .from('ussd_sessions')
      .update({ bank_id: bank.id })
      .eq('id', ussdSession.id)
      .then(handleResponse)
    ;

    await supabase
      .from('ussd_session_hops')
      .insert(hopDto)
      .then(handleResponse)
    ;

    return {
      response: 'END Request sent. You will receive your bank\'s USSD code briefly.',
      bank,
    };
  }

  private async initiateUSSDCharge(ussdSession: UssdSessionForHop, bank: { external_id: string; }): Promise<void> {
    const uuid = uuidv4();

    const charge: string = await this.flutterwaveService.createChargeByUSSD({
      full_name: 'Guest',
      phone: ussdSession.phone,
      external_reference: uuid,
      email: 'info@nxtgrid.co',
      currency: 'NGN',
      amount: ussdSession.amount,
      meta: {
        organization_name: ussdSession.meter?.connection?.customer?.grid?.organization?.name,
        grid_name: ussdSession.meter?.connection?.customer?.grid?.name,
        meter_external_reference: ussdSession.meter?.external_reference,
        customer_full_name: ussdSession.meter?.connection?.customer?.account?.full_name,
        type: 'meter_topup',
      },
      bank_code: bank.external_id,
    });

    // Send and save SMS to phone number that's running the session
    await this.httpService.axiosRef.post(`${ process.env.LOCH_API }/notifications`, [ {
      carrier_external_system: 'AFRICASTALKING',
      notification_type: 'CREDIT_RECEIVED', // @TODO :: Add a better type to db enum and use that
      phone: ussdSession.phone,
      message: `USSD code: ${ charge }`,
    } ]);

    await this.ordersService.create({
      sender_wallet_id: BANKING_SYSTEM_WALLET_ID,
      receiver_wallet_id: ussdSession.meter.wallet.id,
      amount: ussdSession.amount,
      currency: 'NGN',
      payment_channel: 'USSD',
      external_reference: uuid,
      ussd_session_id: ussdSession.id,
      author_id: ussdSession.account?.id,
      // This order is marked as initialised, so that the order loop will
      // ignore it until it's transformed into pending by Flutterwave webhook
      order_status: 'INITIALISED',
    });
  }
}
