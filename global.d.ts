type AssertNever<T extends never> = T;

// import { Account, Agent, Customer, Connection, Grid, Meter, Organization, Wallet, Order } from './libs/core/src/types/supabase-types';

// declare global {
//   type AccountType = Account & {
//     agent: Agent;
//   }

//   type AgentType = Agent & {
//     account: AccountType
//     grid: Grid;
//   }

//   type CustomerType = Customer & {
//     account: AccountType;
//     grid: Grid;
//   }

//   type ConnectionType = Connection & {
//     customer: CustomerType;
//   }

//   type MeterType = Meter & {
//     connection: ConnectionType;
//   }

//   type WalletType = Wallet & {
//     agent: AgentType;
//     organization: Organization;
//     connection: ConnectionType;
//     customer: CustomerType;
//     meter: MeterType;
//   }

//   type OrderType = Order & {
//     author: AccountType;
//     sender_wallet: WalletType;
//     receiver_wallet: WalletType;
//   }
// }
