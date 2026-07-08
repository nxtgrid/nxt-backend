// import { HttpException, Inject, Injectable, forwardRef, OnModuleInit } from '@nestjs/common';
// import { MeterCreditTransfersService as CoreMeterCreditTransfersService } from '@core/modules/meter-credit-transfers/meter-credit-transfers.service';
// import { MeterCreditTransfer } from '@core/modules/meter-credit-transfers/entities/meter-credit-transfer.entity';
// import { Repository } from 'typeorm';
// import { InjectRepository } from '@nestjs/typeorm';
// import { OrdersService } from '../orders/orders.service';
// import { Meter } from '@core/modules/meters/entities/meter.entity';
// import { MetersService } from '../meters/meters.service';
// import { Account } from '@core/modules/accounts/entities/account.entity';
// import { CreateDirectiveInput } from '@core/modules/directives/dto/create-directive.input';
// import { CreateMeterCreditTransferInput } from '@core/modules/meter-credit-transfers/dto/create-meter-credit-transfer.input';
// import { v4 as uuidv4 } from 'uuid';
// import { RAW_QUERIES, LockNextCreditTransferPageResult, LockNextCreditTransferPageParams } from '@tiamat/queries';
// // import { flatten } from 'ramda';
// // import { UpdateMeterInput } from '@core/modules/meters/dto/update-meter.input';
// import { UpdateMeterCreditTransferInput } from '@core/modules/meter-credit-transfers/dto/update-meter-credit-transfer.input';
// // import { DirectiveRouterService } from '../directive-router/directive-router.service';
// // import { CreateOrderDto } from '../orders/dto/create-order.dto';

// // There is no need for a run loop, like in directive and order services,
// // because we are going to leverage the directives and orders queues themselves.
// // Once a new meter credit transfer is initiated from the frontend we will
// // 1. Create the meter credit transfer object in db and mark is processing
// // 2. Create the corresponding order which will be picked up by the order queue as soon as it is in pending state
// // 3. Create the corresponding directives, which are going to be executed
// // sequentially once the order has been processed successfully.

// @Injectable()
// export class MeterCreditTransfersService extends CoreMeterCreditTransfersService implements OnModuleInit {
//   isMeterCreditProcessingRunning = false;

//   constructor(
//     @InjectRepository(MeterCreditTransfer)
//     protected readonly meterCreditTransferRepository: Repository<MeterCreditTransfer>,
//     @Inject(forwardRef(() => MetersService))
//     protected readonly metersService: MetersService,
//     @Inject(forwardRef(() => OrdersService))
//     protected readonly ordersService: OrdersService,
//     // private readonly directiveRouterService: DirectiveRouterService,
//   ) {
//     super(meterCreditTransferRepository);
//   }

//   onModuleInit() {
//     // this.run();
//   }

//   createDirectives(meterCreditTransfer: MeterCreditTransfer): CreateDirectiveInput[] {
//     const { sender_meter, receiver_meter } = meterCreditTransfer;

//     // initialised directives that are not going to be executed until unlocked by the system
//     const directives: CreateDirectiveInput[] = [
//       {
//         meter_id: sender_meter.id,
//         directive_type: 'OFF', // switches off the sender meter
//         directive_status: 'PENDING',
//         directive_priority: 1500,
//         meter_credit_transfer_id: meterCreditTransfer.id,
//       },
//       {
//         meter_id: sender_meter.id,
//         directive_type: 'READ_CURRENT_CREDIT', //reads the current credit in the sender meter
//         directive_status: 'INITIALISED',
//         directive_priority: 1450,
//         meter_credit_transfer_id: meterCreditTransfer.id,
//       },
//       {
//         meter_id: sender_meter.id,
//         directive_type: 'CLEAR_CREDIT', //clears credit in the sender meter
//         directive_status: 'INITIALISED',
//         directive_priority: 1440,
//         meter_credit_transfer_id: meterCreditTransfer.id,
//       },
//       {
//         // we do not set a topup amount since it can only be determined later on
//         meter_id: sender_meter.id,
//         directive_type: 'TOP_UP', //tops up the sender meter
//         directive_status: 'INITIALISED',
//         directive_priority: 1430,
//         meter_credit_transfer_id: meterCreditTransfer.id,
//       },
//       {
//         // we do not set a topup amount since it can only be determined later on
//         meter_id: receiver_meter.id,
//         directive_type: 'TOP_UP', //tops up the receiver meter
//         directive_status: 'INITIALISED',
//         directive_priority: 1420,
//         meter_credit_transfer_id: meterCreditTransfer.id,
//       },
//       {
//         meter_id: sender_meter.id,
//         directive_type: 'ON', // switches the sender meter back on
//         directive_status: 'INITIALISED',
//         directive_priority: 1410,
//         meter_credit_transfer_id: meterCreditTransfer.id,
//       },
//     ];

//     return directives;
//   }

//   // It adds directives to the queue to be processed later by the run function
//   async create(createMeterCreditTransferInput: CreateMeterCreditTransferInput, author: Account) {
//     if (typeof createMeterCreditTransferInput.amount !== 'number') throw new HttpException('Amount in meter credit transfer should be a number', 500);

//     // check for sender meter existence
//     const senderMeter: Meter = await this.metersService.findOne(createMeterCreditTransferInput.sender_meter_id);
//     if (!senderMeter) throw new HttpException(`Sender meter with id ${ createMeterCreditTransferInput.sender_meter_id } not found`, 500);

//     // check for receiver meter existence
//     const receiverMeter: Meter = await this.metersService.findOne(createMeterCreditTransferInput.receiver_meter_id);
//     if(!receiverMeter) throw new HttpException(`Receiver meter with id ${ createMeterCreditTransferInput.receiver_meter_id } not found`, 500);

//     // generate a new object that's going to also have status and author properties
//     const adjustedTransferForAccountAndState: CreateMeterCreditTransferInput = {
//       ...createMeterCreditTransferInput,
//       meter_credit_transfer_status: 'PENDING',
//       author,
//     };

//     const meterCreditTransfer: MeterCreditTransfer = await this.meterCreditTransferRepository.save(adjustedTransferForAccountAndState);

//     // run the run loop, but do not wait for it to complete, since it running will
//     // take several minutes
//     this.run();
//     return meterCreditTransfer;
//   }

//   // This is the main loop, processing all meter credit transfers
//   async run() {
//     if (![ 'production' ].includes(process.env.NXT_ENV)) return;

//     // if it's already running, then skip since busy
//     if (this.isMeterCreditProcessingRunning) return;

//     try {
//       this.isMeterCreditProcessingRunning = true;

//       const size = 100;
//       let page = 0;
//       let pendingTransfers: MeterCreditTransfer[];

//       do {
//         const uuid = uuidv4();
//         pendingTransfers = await this.lockNextMeterCreditTransfer(uuid, page++ * size, size);
//         await this.processMeterCreditTransfers(pendingTransfers);
//       } while(pendingTransfers.length);
//     }
//     catch (err) {
//       console.error(err);
//     }
//     finally {
//       // reopen semaphore so the next iteration can run again
//       this.isMeterCreditProcessingRunning = false;
//     }
//   }

//   // It generates all directives and orders necessary for
//   // the meter credit transfer to take place and implicitly triggers
//   // the respective queues to process the changes
//   async processMeterCreditTransfers(meterCreditTransfers: MeterCreditTransfer[]) {
//     console.warn('Meter credit transfers not implemented', meterCreditTransfers);

//     // // for each meter credit transfer create directives and order
//     // const meterCreditTransferEntities = meterCreditTransfers.map(creditTransfer => {
//     //   const { sender_meter, receiver_meter, amount, currency, author } = creditTransfer;

//     //   const create_order_dto: CreateOrderDto = {
//     //     sender_wallet_id: sender_meter.wallet.id,
//     //     receiver_wallet_id: receiver_meter.wallet.id,
//     //     amount,
//     //     currency,
//     //     // We can hardcode it here, since it's always going to be done via Ayrton
//     //     payment_channel: 'AYRTON',
//     //     // The order is not yet set to PENDING, since we need the first directive to be completely processed before running it
//     //     order_status: 'INITIALISED',
//     //     author_id: author.id,
//     //     meter_credit_transfer_id: creditTransfer.id,
//     //   };

//     //   return {
//     //     id: creditTransfer.id,
//     //     create_order_dto,
//     //     update_meters: [
//     //       {
//     //         id: sender_meter.id, is_manual_mode_on: true,
//     //       },
//     //       {
//     //         id: receiver_meter.id, is_manual_mode_on: true,
//     //       },
//     //     ],
//     //     create_directives: this.createDirectives(creditTransfer),
//     //   };
//     // });

//     // // Create the orders
//     // // @TODO :: Surely this can be done simpler
//     // const createOrderDtos = meterCreditTransferEntities.map(({ create_order_dto }) => create_order_dto);
//     // for (const createOrderDto of createOrderDtos) {
//     //   await this.ordersService.create(createOrderDto);
//     // }

//     // // creates the directives and points them at the meter credit transfer
//     // const directivesToCreate: CreateDirectiveInput[] = flatten(meterCreditTransferEntities.map(transfer => transfer.create_directives));
//     // await this.directiveRouterService.create(directivesToCreate); //this will trigger the directive loop, if it's not busy

//     // // make sure both meters are in manual mode, so FS control does not interfere with it
//     // const updateMeterGroups: UpdateMeterInput[][] = meterCreditTransferEntities.map(transfer => transfer.update_meters);
//     // const updateMeters: UpdateMeterInput[] = flatten(updateMeterGroups);
//     // await this.metersService.updateMany(updateMeters);

//     // // Refetch updated objects that have been created
//     // return this.findByIds(meterCreditTransfers.map(transfer => transfer.id));
//   }

//   async lockNextMeterCreditTransfer(lockSession: string, offset: number, limit: number) {
//     // Run the query to lock the next set of meter credit transfers and
//     // wait for it to complete, so the following query that fetches them
//     // will be able to find them

//     const params: LockNextCreditTransferPageParams = [
//       lockSession,
//       'PROCESSING',
//       'PENDING',
//       limit,
//       offset,
//     ];
//     const _result: LockNextCreditTransferPageResult = await this.meterCreditTransferRepository.query(
//       RAW_QUERIES.sql.supabase.meterCreditTransfers.lockNextPage,
//       params,
//     );

//     // Once we locked the page we are interested in, then we query its rows
//     return this.findByLockSession(lockSession);
//   }

//   // todo: find a better way of doing this
//   async updateMany(updateMeterCreditTransferInput: UpdateMeterCreditTransferInput[]) {
//     const toReturn: MeterCreditTransfer[] = [];
//     for (const meterCreditTransfer of updateMeterCreditTransferInput) {
//       const result: MeterCreditTransfer = await this.update(meterCreditTransfer.id, meterCreditTransfer);
//       toReturn.push(result);
//     }

//     return toReturn;
//   }

//   async update(id: number, updateObject: UpdateMeterCreditTransferInput): Promise<MeterCreditTransfer> {
//     await this.meterCreditTransferRepository.update(id, updateObject);
//     return this.findOne(id);
//   }

//   // not sure this is even needed
//   remove(id: number) {
//     return this.meterCreditTransferRepository.softDelete(id);
//   }
// }
