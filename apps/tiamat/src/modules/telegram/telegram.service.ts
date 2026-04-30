import { Injectable, ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseService } from '@core/modules/supabase.module';
import { MeterInteractionStatusEnum } from '@core/types/supabase-types';

type MeterForOrderNotification = {
  external_reference: string,
  connection?: {
    customer?: {
      account?: {
        full_name?: string;
        phone?: string;
      };
      grid?: {
        name?: string;
        telegram_response_path_token?: string;
      };
    };
  };
};

type MeterInteractionForOrderNotification = {
  id: number;
  token: string;
  transactive_kwh: number;
  meter_interaction_status: MeterInteractionStatusEnum;
};

@Injectable()
export class TelegramService {
  constructor(
    private readonly httpService: HttpService,
    private readonly supabaseService: SupabaseService,
  ) { }

  async link(linkedTelegramId: string, tokenUsedToLink: string): Promise<{ full_name: string }> {
    const account = await this.supabaseService.adminClient
      .from('accounts')
      .select('id, telegram_id, full_name')
      .eq('telegram_link_token', tokenUsedToLink)
      .is('deleted_at', null)
      .maybeSingle()
      .then(this.supabaseService.handleResponse)
    ;

    if (!account) throw new NotFoundException(`Could not find account with telegram link ${ tokenUsedToLink }`);
    if (account.telegram_id) throw new ConflictException('Account has already been linked');

    await this.supabaseService.adminClient
      .from('accounts')
      .update({
        telegram_id: linkedTelegramId,
        // We replace Telegram link token as well, so old dangling links won't work anymore
        telegram_link_token: uuidv4(),
      })
      .eq('id', account.id)
      .then(this.supabaseService.handleResponse)
    ;

    return { full_name: account.full_name };
  }

  async findAccountByTelegramId(telegramId: string): Promise<any> {
    const account = await this.supabaseService.adminClient
      .from('accounts')
      .select(`
        id,
        full_name,
        organization:organizations(
          id,
          wallet:wallets!organization_id(
            id,
            balance
          )
        ),
        member:members(
          id
        ),
        agent:agents(
          id,
          wallet:wallets(
            id,
            balance
          )
        ),
        customer:customers(
          id,
          wallet:wallets(
            id,
            balance
          )
        )
      `)
      .eq('telegram_id', telegramId)
      .is('deleted_at', null)
      .maybeSingle()
      .then(this.supabaseService.handleResponse)
    ;

    if (!account) throw new NotFoundException(`Could not find account with Telegram ID ${ telegramId }`);

    // Select the appropriate wallet
    const { organization, member, agent, customer, ...accountRest } = account;
    const wallet = member ? organization.wallet
      : agent ? agent.wallet
        : customer ? customer.wallet
          : null
    ;
    if(!wallet) throw new UnprocessableEntityException('This account has no related member/agent/customer with a wallet');

    return { ...accountRest, wallet };
  }

  // @TODO :: Improve typing and in fact entire FlowXO flow
  // when we have fully moved to Meter Interactions + Supabase
  createNotificationForOrder(
    order: { amount?: number },
    meter: MeterForOrderNotification,
    meterInteraction: MeterInteractionForOrderNotification,
  ) {
    // @TODO :: TypeORM Order is HUUUUUGE - keep in mind when refactoring to Supabase in upper layer
    const telegramNotification = {
      // This is used as the ID in FlowXO, to identify updates.
      // The 'directive_' prefix is a legacy thing.
      directive_id: meterInteraction.id,

      // This is used as the main filter value in FlowXO to determine what to do.
      // Hardcode to PENDING because that's what FlowXO expects.
      // That and the 'directive_' prefix are a legacy thing.
      directive_status: 'PENDING',

      grid_name: meter.connection?.customer?.grid?.name,
      customer_name: meter.connection?.customer?.account?.full_name,
      customer_phone: meter.connection?.customer?.account?.phone ?? 'Phone number not available',
      meter_external_reference: meter.external_reference,

      token: meterInteraction.token,
      kwh: meterInteraction.transactive_kwh,
      amount: order.amount,

      response_path: `${ process.env.FLOW_XO_TOKEN_RESPONSE_PATH }/c/${ meter.connection?.customer?.grid?.telegram_response_path_token }`,
    };

    return this.httpService
      .axiosRef
      .post(`${ process.env.FLOW_XO_API }${ process.env.FLOW_XO_TOPUP_TOKEN_ENDPOINT }`, telegramNotification)
      .catch(err => {
        console.error('Error CREATING topup token notification via FlowXO:', err.response?.statusText ?? err);
      })
    ;
  }

  async updateNotificationForOrder(meterInteraction: { id: number; meter_interaction_status: MeterInteractionStatusEnum }) {
    if(![ 'FAILED', 'SUCCESSFUL' ].includes(meterInteraction.meter_interaction_status)) return;

    const updateTelegramNotification = {
      directive_id: meterInteraction.id,
      directive_status: meterInteraction.meter_interaction_status,
    };

    return this.httpService
      .axiosRef
      .post(`${ process.env.FLOW_XO_API }${ process.env.FLOW_XO_TOPUP_TOKEN_ENDPOINT }`, updateTelegramNotification)
      .catch(err => {
        console.error('Error UPDATING topup token notification via FlowXO:', err.response?.statusText ?? err);
      })
    ;
  }
}
