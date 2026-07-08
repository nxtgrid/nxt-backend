import { BadRequestException, forwardRef, HttpException, Inject, Injectable, InternalServerErrorException, NotAcceptableException, NotFoundException, OnModuleInit, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { isNil } from 'ramda';
import { createFlutterwaveReference } from '@helpers/third-party-service-helpers';
import { inferPaymentMethodFromFwTransaction } from './lib/flutterwave';
import { inferOrderMeta } from './lib/order-meta';

import { Order } from '@core/modules/orders/entities/order.entity';
import { Meter } from '@core/modules/meters/entities/meter.entity';
import { Grid } from '@core/modules/grids/entities/grid.entity';

// Services
import { OrdersService as CoreOrdersService } from '@core/modules/orders/orders.service';
import { SoftwareDevAlertService } from '@core/modules/software-dev-alert/software-dev-alert.service';
import { SupabaseService } from '@core/modules/supabase.module';
import { MetersService } from '../meters/meters.service';
import { WalletsService } from '../wallets/wallets.service';
import { FlutterwaveService } from '../flutterwave/flutterwave.service';
import { TelegramService } from '../telegram/telegram.service';

// DTOs
import { InitialiseFlutterwaveOrderDto, InitialisePublicFlutterwaveOrderDto } from './dto/initialise-flutterwave-order.dto';
import { VerifyFlutterwaveOrderDto } from './dto/verify-flutterwave-order.dto';
import { CreateNotificationInput } from '@core/modules/notifications/dto/create-notification.input';

// Types
import { NxtSupabaseUser } from '../auth/nxt-supabase-user';
import { CreateOrderDto } from './dto/create-order.dto';

import { orderForMetaQuery } from './lib/supabase';
import { MeterInteractionsService } from '../meter-interactions/meter-interactions.service';
import { CreateMeterInteractionDto } from '../meter-interactions/dto/create-meter-interaction.dto';
import { BANKING_SYSTEM_WALLET_ID } from '@core/constants';
import { InsertTransaction, UpdateOrder } from '@core/types/supabase-types';

@Injectable()
export class OrdersService extends CoreOrdersService implements OnModuleInit {
  requestsBeingProcessed = 0;

  constructor(
    @InjectRepository(Order)
    protected readonly orderRepository: Repository<Order>,
    private readonly softwareDevAlertService: SoftwareDevAlertService,
    private readonly walletService: WalletsService,
    private readonly flutterwaveService: FlutterwaveService,
    @Inject(forwardRef(() => MetersService))
    private readonly meterService: MetersService,
    private readonly telegramService: TelegramService,
    private readonly httpService: HttpService,
    private readonly supabaseService: SupabaseService,
    private readonly meterInteractionsService: MeterInteractionsService,
  ) {
    super(orderRepository);
  }

  onModuleInit() {
    this.run();
  }

  private async update(id: number, toUpdate: UpdateOrder) {
    await this.supabaseService.adminClient
      .from('orders')
      .update({
        ...toUpdate,
        updated_at: (new Date()).toISOString(),
      })
      .eq('id', id)
      .then(this.supabaseService.handleResponse)
    ;

    // Attempt to run the order loop to process pending orders.
    this.run();

    return { id };
  }

  private async processOrderWithForcedFailure(order: Order, forceFailure: boolean) {
    if (isNil(order?.amount)) throw new HttpException(`Invalid amount for order ${ order.id }`, 500);

    // make sure the amount is positive
    const absAmount = Math.abs(order.amount);

    const { sender_wallet, receiver_wallet } = order;

    const senderWalletBalanceBefore = await this.walletService.findBalanceById(sender_wallet.id);
    const receiverWalletBalanceBefore = await this.walletService.findBalanceById(receiver_wallet.id);

    const thereIsEnoughBalance = senderWalletBalanceBefore >= absAmount;
    const amountBeingSent = absAmount * -1;

    if ((thereIsEnoughBalance || sender_wallet.identifier === 'BANKING_SYSTEM') && !forceFailure ) {
      // if there is enough balance, then we can do the math
      const senderWalletBalanceAfter = senderWalletBalanceBefore - absAmount;
      const receiverWalletBalanceAfter = receiverWalletBalanceBefore + absAmount;
      return {
        sender_balance_after: senderWalletBalanceAfter,
        receiver_balance_after: receiverWalletBalanceAfter,
        transactions: [ {
          amount: absAmount,
          wallet_id: receiver_wallet.id,
          order_id: order.id,
          transaction_status: 'SUCCESSFUL',
          balance_before: receiverWalletBalanceBefore,
          balance_after: receiverWalletBalanceAfter,
        } as InsertTransaction, {
          amount: amountBeingSent,
          wallet_id: sender_wallet.id,
          order_id: order.id,
          transaction_status: 'SUCCESSFUL',
          balance_before: senderWalletBalanceBefore,
          balance_after: senderWalletBalanceAfter,
        } as InsertTransaction ],
      };
    }
    else {
      console.info(
        `[ORDER PROCESSING] Failing transaction.
        Is there enough balance? ${ thereIsEnoughBalance }.
        The sender wallet identifier is: ${ sender_wallet.identifier }.
        Was it a forced failure? ${ forceFailure }.`,
      );
      return {
        sender_balance_after: senderWalletBalanceBefore,
        receiver_balance_after: receiverWalletBalanceBefore,
        transactions: [ {
          amount: absAmount,
          wallet_id: receiver_wallet.id,
          order_id: order.id,
          transaction_status: 'FAILED',
          balance_before: receiverWalletBalanceBefore,
          balance_after: receiverWalletBalanceBefore,
        } as InsertTransaction, {
          amount: amountBeingSent,
          wallet_id: sender_wallet.id,
          order_id: order.id,
          transaction_status: 'FAILED',
          balance_before: senderWalletBalanceBefore,
          balance_after: senderWalletBalanceBefore,
        } as InsertTransaction ],
      };
    }
  }

  private async run() {
    if (this.requestsBeingProcessed >= 1) return;
    try {
      this.requestsBeingProcessed++;
      await this._doRun();
    }
    catch (err) {
      console.error('Error running orders loop', err);
    }
    finally {
      this.requestsBeingProcessed--;
    }
  }

  private async _doRun(): Promise<void> {
    let order: Order;
    let frozenWallets = [];
    let lockSession: string;

    try {
      // unique lock to be set on the wallet
      lockSession = uuidv4();
      // console.info(`init lock session ${ lockSession }`);
      // console.info(`lock session ${ lockSession } `, 2);
      frozenWallets = await this.walletService.lockByNextPendingOrder(lockSession);
      // console.info(`lock session ${ lockSession } `, 3);
      // console.info(`lock session ${ lockSession }, frozen wallets: ${ frozenWallets.length }`);

      if (!frozenWallets.length) return;

      // console.info(`lock session ${ lockSession } `, 4);
      order = await this.findByLockSession(lockSession);
      // console.info(`lock session ${ lockSession } `, 5);
      // If there aren't exactly two frozen wallets, then throw an error, unlock them and mark the order as failed if there is one
      if (frozenWallets.length !== 2) throw new HttpException('Not exactly 2 wallets were frozen. Unlocking them...', 500);

      // console.info(`lock session ${ lockSession } `, 6);
      if (!order.sender_wallet) throw new HttpException(`Order ${ order.id } does not have a sender wallet`, 500);
      if (!order.receiver_wallet) throw new HttpException(`Order ${ order.id } does not have a receiver wallet`, 500);

      // console.info(`lock session ${ lockSession } `, 7);
      const orderResult = await this.processOrderWithForcedFailure(order, false);
      const { transactions } = orderResult;
      const orderUpdate: UpdateOrder = {};
      // console.info(`lock session ${ lockSession } `, 8);

      await this.supabaseService.adminClient
        .from('transactions')
        .insert(transactions)
        .then(this.supabaseService.handleResponse)
      ;

      // console.info(`lock session ${ lockSession } `, 10);
      const hasAnyTransactionsFailed = transactions
        .map(({ transaction_status }) => transaction_status)
        .includes('FAILED');

      // console.info(`lock session ${ lockSession } `, 11);
      // If none of the transactions has failed, then update the sender wallet
      if (!hasAnyTransactionsFailed) {
        await this.updateWalletBalances(
          order.sender_wallet.id,
          order.receiver_wallet.id,
          orderResult.sender_balance_after,
          orderResult.receiver_balance_after,
        );

        await this.updateConnectionFeePayments(order);

        // Mark the order as completed
        orderUpdate.order_status = 'COMPLETED';

        if (order.receiver_wallet.meter) this.produceMeterInteraction(order);

        // Send SMS if we're dealing with an agent or a meter
        try {
          if (order.receiver_wallet.agent || order.receiver_wallet.meter) this.produceSms(order);
        }
        catch (error) {
          console.error('Error producting SMS', error);
        }
      }
      else {
        // console.info('one of the transactions has failed');
        // console.info(transactions);
        orderUpdate.order_status = 'FAILED';
      }

      await this.update(order.id, orderUpdate);

      if (frozenWallets.length) await this.walletService.unlockWalletsByLockSession(lockSession);
      this._doRun(); // Trigger the next read, but do not wait for it to return
    }
    catch (error) {
      console.error('Error in orders loop', error);

      if (frozenWallets.length) await this.walletService.unlockWalletsByLockSession(lockSession);

      // If an order failed for non arithmetic reasons, then we still generate the transactions
      // that failed, so it's more traceable later
      if (order) {
        // Generate the corresponding failed transactions
        const { transactions } = await this.processOrderWithForcedFailure(order, true);
        await this.supabaseService.adminClient
          .from('transactions')
          .insert(transactions)
          .then(this.supabaseService.handleResponse)
        ;

        // Mark the order as failed
        await this.update(order.id, { order_status: 'FAILED' });
      }
    }
  }

  private produceSms({ sender_wallet, receiver_wallet, amount, currency }: Order) {
    const sms: Partial<CreateNotificationInput> = {
      carrier_external_system: 'AFRICASTALKING',
    };

    if(sender_wallet.agent) {
      sms.phone = sender_wallet.agent.account.phone;
      sms.message = `Sent ${ currency } ${ amount } to meter ${ receiver_wallet.meter.external_reference }`;
      sms.notification_type = 'METER_TOPPED_UP';
      sms.account_id = sender_wallet.agent.account.id;
    }
    if(receiver_wallet.agent) {
      sms.phone = receiver_wallet.agent.account.phone;
      sms.message = `You received ${ currency } ${ amount }`;
      sms.notification_type = 'CREDIT_RECEIVED';
      sms.account_id = receiver_wallet.agent.account.id;
    }
    if (receiver_wallet.meter) {
      sms.phone = receiver_wallet.meter.connection.customer.account.phone;
      sms.message = `You received ${ currency } ${ amount }`;
      sms.notification_type = 'CREDIT_RECEIVED';
      sms.account_id = receiver_wallet.meter.connection.customer.account.id;
    }

    // this.lokiService.log('info', `Sending SMS to ${ sms.phone } via loch`, { tag: 'ordersService' });
    return this.httpService.axiosRef
      .post(`${ process.env.LOCH_API }/notifications`, [ sms ])
      .catch(err => {
        console.error('Error sending notification', err);
      });
  }

  private async updateWalletBalances(senderWalletId: number, receiverWalletId: number, newSenderBalance: number, newReceiverBalance: number) {
    const { adminClient: supabase, handleResponse } = this.supabaseService;
    const now = (new Date()).toISOString();

    // @TOCHECK :: This is NOT an atomic update.
    // If we want to do this atomically, we need a Postgres function currently..

    // Update sender wallet
    await supabase
      .from('wallets')
      .update({
        balance: newSenderBalance,
        balance_updated_at: now,
      })
      .eq('id', senderWalletId)
      .then(handleResponse)
    ;

    // Update receiver wallet
    await supabase
      .from('wallets')
      .update({
        balance: newReceiverBalance,
        balance_updated_at: now,
      })
      .eq('id', receiverWalletId)
      .then(handleResponse)
    ;
  }

  private async updateConnectionFeePayments(order: Order) {
    const {
      amount,
      sender_wallet: { connection: senderConnection },
      receiver_wallet: { connection: receiverConnection },
    } = order;
    const absAmount = Math.abs(amount);

    if(!senderConnection && !receiverConnection) return;

    let paid;
    let connectionId;
    let customerId;
    let total_connection_paid;

    // Payment of a connection fee
    if (receiverConnection?.id) {
      paid = receiverConnection.paid + absAmount;
      connectionId = receiverConnection.id;
      customerId = receiverConnection.customer.id;
      total_connection_paid = receiverConnection.customer.total_connection_paid + absAmount;
    }

    // Reversal of payment of a connection fee
    if (senderConnection?.id) {
      paid = senderConnection.paid - absAmount;
      connectionId = senderConnection.id;
      customerId = senderConnection.customer.id;
      total_connection_paid = senderConnection.customer.total_connection_paid - absAmount;
    }

    const p1 = this.supabaseService.adminClient
      .from('connections')
      .update({ paid })
      .eq('id', connectionId)
      .then(this.supabaseService.handleResponse)
    ;

    const p2 = this.supabaseService.adminClient
      .from('customers')
      .update({ total_connection_paid })
      .eq('id', customerId)
      .then(this.supabaseService.handleResponse)
    ;

    await Promise.all([ p1, p2 ]);
  }

  private async produceMeterInteraction(order: Order) {
    try {
      let kwh = 0;
      let tariff;
      const amount = Math.abs(order.amount);

      const { receiver_wallet: { meter } } = order;

      // todo: refactor to make more sustainable and add dual meter support
      if (order.meter_credit_transfer_id) {
        const { sender_wallet: { meter: senderMeter } } = order;

        // @TODO :: This is also being done in reverse in lib function
        if (typeof senderMeter.kwh_tariff === 'number') {
          tariff = senderMeter.kwh_tariff;

          if (tariff !== 0) kwh = amount / tariff;
          else throw new HttpException(`Tariff for meter ${ senderMeter.external_reference } is 0`, 500);
        }
        else {
          // in the single meter configuration meter type will be hps
          if (senderMeter.meter_type === 'HPS') {
            tariff = senderMeter.connection.customer.grid.kwh_tariff_essential_service;
            kwh = amount / tariff;
          }
          else if (senderMeter.meter_type === 'FS') {
            tariff = senderMeter.connection.customer.grid.kwh_tariff_full_service;
            kwh = amount / tariff;
          }
          else throw new HttpException(`Could not define amount when generating token for order ${ order.id }`, 500);
        }
      }
      else {
        // If a meter has a specific tariff, then we are going to use that.
        // Otherwise we'll use the grid tariff
        if (typeof meter.kwh_tariff == 'number') {
          tariff = meter.kwh_tariff;

          if (tariff !== 0) kwh = amount / tariff;
          else throw new HttpException(`Tariff for meter ${ order.receiver_wallet.meter.external_reference } is 0`, 500);
        }
        else {
          // in the single meter configuration meter type will be hps
          if (meter.meter_type === 'HPS') {
            tariff = meter.connection.customer.grid.kwh_tariff_essential_service;
            kwh = amount / tariff;
          }
          else if (meter.meter_type === 'FS') {
            tariff = meter.connection.customer.grid.kwh_tariff_full_service;
            kwh = amount / tariff;
          }
          else throw new HttpException(`Could not define amount when generating token for order ${ order.id }`, 500);
        }
      }

      await this.update(order.id, { tariff, tariff_type: order.receiver_wallet.meter.meter_type });

      // This is in favor of the customer
      kwh = Math.ceil(kwh * 10) / 10;

      const _dto: CreateMeterInteractionDto = {
        meter_id: meter.id,
        meter_interaction_type: 'TOP_UP',
        transactive_kwh: kwh,
        order_id: order.id,
      };

      const _meter = {
        id: meter.id,
        external_reference: meter.external_reference,
        last_sts_token_issued_at: meter.last_sts_token_issued_at.toISOString(),
        meter_phase: meter.meter_phase,
        version: meter.version,
        communication_protocol: meter.communication_protocol,
        decoder_key: meter.decoder_key,
        grid_id: meter.connection.customer.grid.id,
        dcu_id: meter.dcu.id,
        last_seen_at: meter.last_seen_at?.toISOString() ?? null,
      };

      const { id, token, transactive_kwh, meter_interaction_status } = await this.meterInteractionsService.createOneForMeter(_dto, _meter);

      if (token) {
        const _safeMeterInteraction = { id, token, transactive_kwh, meter_interaction_status };
        this.telegramService.createNotificationForOrder(order, meter, _safeMeterInteraction);
      }
    }
    catch (err) {
      console.error(`An error occurred when generating meter interaction for order ${ order.id }`);
      console.error(err);
    }
  }

  public async create(createOrderDto: CreateOrderDto, author?: NxtSupabaseUser): Promise<{ id: number; }> {
    if (createOrderDto.sender_wallet_id === createOrderDto.receiver_wallet_id)
      throw new NotAcceptableException('Sender wallet id and receiver wallet id cannot be the same');

    // Author id can be passed in DTO directly, if not we use the authenticated author
    if(!createOrderDto.author_id) createOrderDto.author_id = author?.account_id;

    const orderForMeta = await this.supabaseService.adminClient
      .from('orders')
      .insert(createOrderDto)
      .select(orderForMetaQuery as any)
      .single()
      // @TYPING-PERFORMANCE :: Turned typing off here, if needed for dev use normal handleResponse
      // and also check ./lib/supabase.ts
      .then(this.supabaseService.HANDLE_RESPONSE_UNTYPED)
    ;

    // Add meta to order
    const orderMeta = inferOrderMeta(orderForMeta);
    await this.update(orderForMeta.id, orderMeta);

    return { id: orderForMeta.id };
  }

  public async initialisePrivate(initialiseOrderDto: InitialiseFlutterwaveOrderDto, author: NxtSupabaseUser) {
    const existingOrder: Order = await this.findByExternalReference(initialiseOrderDto.external_reference);
    if (existingOrder) throw new HttpException(`Order with external reference ${ initialiseOrderDto.external_reference } already exists. Please try another external reference`, 500);

    return this.create({
      ...initialiseOrderDto,
      sender_wallet_id: BANKING_SYSTEM_WALLET_ID,
      order_status: 'INITIALISED',
      author_id: author.account.id,
    });
  }

  public async initialisePublic(initialiseOrderDto: InitialisePublicFlutterwaveOrderDto) {
    const hasSpecifiedExternalReference = initialiseOrderDto.external_reference?.length;

    if(hasSpecifiedExternalReference) {
      const existingOrder: Order = await this.findByExternalReference(initialiseOrderDto.external_reference);
      if (existingOrder) throw new BadRequestException(`Order with external reference ${ initialiseOrderDto.external_reference } already exists. Please try another external reference`);
    }

    const meter: Meter = await this.meterService.findByExternalReference(initialiseOrderDto.meter_external_reference);
    if (!meter) throw new NotFoundException(`Could not find meter with external reference ${ initialiseOrderDto.meter_external_reference }`);

    if(!this.meterService.isReadyToBeToppedUp(meter as any))
      throw new BadRequestException(`Meter ${ initialiseOrderDto.meter_external_reference } is not successfully installed (yet)`);

    const grid: Grid = meter.connection?.customer?.grid;
    if (!grid) throw new NotFoundException(`Could not retrieve grid from meter with external reference ${ initialiseOrderDto.meter_external_reference }`);

    const external_reference = hasSpecifiedExternalReference ? initialiseOrderDto.external_reference : createFlutterwaveReference(`${ grid.organization.name }+${ meter.external_reference }`);

    // console.info(`[CREATE ORDER PUBLIC] Creating an order with external_reference ${ external_reference } of type ${ typeof external_reference }`);

    const order = await this.create({
      sender_wallet_id: BANKING_SYSTEM_WALLET_ID,
      receiver_wallet_id: meter.wallet.id,
      amount: initialiseOrderDto.amount,
      currency: initialiseOrderDto.currency,
      payment_channel: initialiseOrderDto.payment_channel,
      external_reference,
      order_status: 'INITIALISED',
    });

    return {
      order_id: order.id,
      external_reference,
      organization_name: meter.connection.customer.grid.organization.name,
      grid_name: meter.connection.customer.grid.name,
      meter_external_reference: meter.external_reference,
      customer_full_name: meter.connection.customer.account.full_name,
    };
  }

  public async getOrderDetailsPublic({ id }: VerifyFlutterwaveOrderDto) {
    if(!id) throw new UnprocessableEntityException('Can\'t verify order with provided details');
    const order = await this.supabaseService.adminClient
      .from('orders')
      .select(`
        order_status,
        amount,
        meter_interaction:meter_interactions(
          meter_interaction_status,
          token,
          transactive_kwh
        )
      `)
      .eq('id', id)
      .maybeSingle()
      .then(this.supabaseService.handleResponse)
    ;
    if(!order) throw new NotFoundException(`Could not find order with id ${ id }`);

    const _interaction = order.meter_interaction;

    return {
      order_status: order.order_status,
      amount: order.amount,
      /* delivery_status */ directive_status: _interaction?.meter_interaction_status,
      token: _interaction?.token,
      kwh: _interaction?.transactive_kwh,
    };
  }

  public async cancelOrderPublic({ id }: VerifyFlutterwaveOrderDto) {
    if(!id) throw new UnprocessableEntityException('Can\'t cancel order with provided details');
    const order = await this.supabaseService.adminClient
      .from('orders')
      .select('order_status')
      .eq('id', id)
      .maybeSingle()
      .then(this.supabaseService.handleResponse)
    ;
    if(!order) throw new NotFoundException(`Could not find order with id ${ id }`);
    if(order.order_status !== 'INITIALISED') {
      console.info('[CANCEL ORDER] Can\'t cancel because it is not in INITIALISED state, instead it\'s', order.order_status);
      throw new NotAcceptableException('Can\'t cancel order that is being or has been processed');
    }
    const order_status = 'CANCELLED';
    await this.update(id, { order_status });
    return { id, order_status };
  }

  // Commenting out to simplify debugging
  // Repeat every hour
  // @Cron('0 * * * *', { disabled: ![ 'staging', 'production' ].includes(process.env.NXT_ENV) })
  // async orderStatusCheck() {
  //   // We run this in staging too to clean up test orders
  //   if (![ 'staging', 'production' ].includes(process.env.NXT_ENV)) return;

  //   const nowMinusOneHourUtc = moment.utc().subtract(60, 'minutes').toDate();

  //   const ordersToCheck = await this.supabase.adminClient
  //     .from('orders')
  //     .select('external_reference')
  //     .eq('order_status', 'INITIALISED')
  //     .lt('created_at', nowMinusOneHourUtc.toISOString())
  //     .order('id', { ascending: false })
  //     .then(this.supabase.handleResponse)
  //   ;

  //   // If the verification fails, the order will be automatically updated.
  //   // Otherwise, the order loop will be run again automatically.
  //   await mapAsyncSequential(this.verifyFlutterwaveOrder, {
  //     context: this,
  //   })(ordersToCheck);

  //   // After attempting to process the orders that were still initialised,
  //   // mark the orders that are older than a day as timed out.

  //   const oneDayAgoUtc = new Date(Date.now() - 24 * 60 * 60 * 1000);
  //   await this.supabase.adminClient
  //     .from('orders')
  //     .up_date({ order_status: 'TIMED_OUT' })
  //     .eq('order_status', 'INITIALISED')
  //     .lt('created_at', oneDayAgoUtc.toISOString())
  //     .then(this.supabase.handleResponse)
  //   ;
  // }

  public async verifyFlutterwaveOrder({ id, external_reference }: VerifyFlutterwaveOrderDto): Promise<{ id: number; }> {
    const { adminClient: supabase, handleResponse } = this.supabaseService;

    const _query = supabase
      .from('orders')
      .select(`
        id,
        external_reference,
        order_status,
        amount,
        currency,
        ussd_session:ussd_sessions(
          phone,
          account:accounts(
            id
          )
        )
      `)
    ;

    if(external_reference) _query.eq('external_reference', external_reference);
    else if(id) _query.eq('id', id);
    else { throw new UnprocessableEntityException('We need an order id or an external reference to verify a Flutterwave transaction'); }

    const order = await _query.maybeSingle().then(handleResponse);

    if (!order) {
      const errorRef = external_reference ? `external reference ${ external_reference }` : `id ${ id }`;
      throw new NotFoundException(`Order with ${ errorRef } not found`);
    }

    // Make sure we only pick up orders that are not already kicked off into action.
    // Otherwise it could be that a member has switched payment method within the same checkout session,
    // and we do not want to run that transaction twice.
    if (![ 'INITIALISED', 'TIMED_OUT' ].includes(order.order_status)) {
      const errorMessage = `FW transaction for ref: ${ order.external_reference } is in ${ order.order_status }, so it cannot be verified`;
      throw new InternalServerErrorException(errorMessage);
    }

    const verifiedTransaction = await this.flutterwaveService.verifyTransactionByExternalReference(order.external_reference);

    if (verifiedTransaction.status !== 'successful') {
      await this.update(order.id, { order_status: 'FAILED' });

      // Add SMS to queue
      if (order.ussd_session?.phone) {
        const notification: CreateNotificationInput = {
          carrier_external_system: 'AFRICASTALKING',
          message: 'Your bank rejected the payment',
          notification_type: 'PAYMENT_REJECTED',
          phone: order.ussd_session.phone,
          account_id: order.ussd_session.account.id,
        };

        await this.httpService.axiosRef.post(`${ process.env.LOCH_API }/notifications`, notification);
      }

      const errorMessage = `The order with tx ref ${ order.external_reference } came back as ${ verifiedTransaction.status } during verification`;

      console.warn(errorMessage);
      throw new InternalServerErrorException(errorMessage);
    }

    const verifiedPaymentMethod = inferPaymentMethodFromFwTransaction(verifiedTransaction);
    if(!verifiedPaymentMethod) {
      await this.update(order.id, { order_status: 'FAILED' });
      throw new InternalServerErrorException(`Could not find payment method corresponding to ${ verifiedTransaction.payment_type } for transaction with ref ${ order.external_reference }`);
    }

    if (verifiedTransaction.amount !== order.amount) {
      await this.update(order.id, { order_status: 'FAILED' });
      throw new InternalServerErrorException(`Mismatching amount for order with tx ref ${ order.external_reference }`);
    }

    if (verifiedTransaction.currency !== order.currency) {
      await this.update(order.id, { order_status: 'FAILED' });
      throw new InternalServerErrorException(`Mismatching currency for order with tx ref ${ order.external_reference }`);
    }

    // If all is well we can update the order to PENDING so it will be picked up by the order loop
    await this.update(order.id, { order_status: 'PENDING', payment_method: verifiedPaymentMethod });

    return { id: order.id };
  }
}
