import { TypeOrmModule } from '@nestjs/typeorm';

import { Account } from './accounts/entities/account.entity';
import { Agent } from './agents/entities/agent.entity';
import { Bank } from './banks/entities/bank.entity';
import { Customer } from './customers/entities/customer.entity';
import { Dcu } from './dcus/entities/dcu.entity';
import { Grid } from './grids/entities/grid.entity';
import { Issue } from './issues/entities/issue.entity';
import { MeterCommissioning } from './meter-commissionings/entities/meter-commissioning.entity';
import { MeteringHardwareImport } from './metering-hardware-imports/entities/metering-hardware-import.entity';
import { Meter } from './meters/entities/meter.entity';
import { Mppt } from './mppts/entities/mppt.entity';
import { Note } from './notes/entities/note.entity';
import { Order } from './orders/entities/order.entity';
import { Organization } from './organizations/entities/organization.entity';
import { Pole } from './poles/entities/pole.entity';
import { DirectiveBatchExecution } from './directive-batch-executions/entities/directive-batch-execution.entity';
import { DirectiveBatch } from './directive-batches/entities/directive-batch.entity';
import { Member } from './members/entities/member.entity';
import { UssdSessionHop } from './ussd-session-hops/entities/ussd-session-hop.entity';
import { UssdSession } from './ussd-sessions/entities/ussd-session.entity';
import { Wallet } from './wallets/entities/wallet.entity';
import { Directive } from './directives/entities/directive.entity';
import { Transaction } from './transactions/entities/transactions.entity';
import { Connection } from './connections/entities/connection.entity';
import { MeteringHardwareInstallSession } from './metering-hardware-install-sessions/entities/metering-hardware-install-session.entity';
import { ApiKey } from './api-keys/entities/api-key.entity';
import { Payout } from './payouts/entities/payout.entity';
import { BankAccount } from './bank-accounts/entities/bank-account.entity';
import { Notification } from './notifications/entities/notification.entity';
import { Router } from './routers/entities/router.entity';
import { MeterCreditTransfer } from './meter-credit-transfers/entities/meter-credit-transfer.entity';
import { NotificationParameter } from './notification-parameters/entities/notification-parameter.entity';
import { SolcastCache } from './solcast-cache/entities/solcast-cache.entity';

export const entities = [
  Account,
  Agent,
  Bank,
  Dcu,
  Directive,
  DirectiveBatch,
  Customer,
  Organization,
  MeteringHardwareImport,
  Grid,
  Issue,
  Meter,
  Connection,
  MeterCommissioning,
  Mppt,
  Note,
  Order,
  DirectiveBatch,
  DirectiveBatchExecution,
  Transaction,
  Member,
  UssdSession,
  UssdSessionHop,
  Wallet,
  Pole,
  Router,
  MeteringHardwareInstallSession,
  ApiKey,
  Payout,
  BankAccount,
  NotificationParameter,
  Notification,
  MeterCreditTransfer,
  SolcastCache,
];

export const CoreTypeOrmModule = TypeOrmModule.forRoot({
  type: 'postgres',
  host: process.env.NXT_DB_HOST,
  port: Number(process.env.NXT_DB_PORT),
  username: process.env.NXT_DB_USERNAME,
  password: process.env.NXT_DB_PASSWORD,
  database: process.env.NXT_DB_NAME,
  synchronize: false,
  entities,
});
