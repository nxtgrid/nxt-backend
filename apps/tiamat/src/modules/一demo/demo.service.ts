// import { Injectable, NotFoundException } from '@nestjs/common';
// import { Cron } from '@nestjs/schedule';
// import { OrdersService } from '../orders/orders.service';
// import { SupabaseService } from '@core/modules/supabase.module';
// import { UserAdminService } from '../user-admin/user-admin.service';
// import { NxtSupabaseUser } from '../auth/nxt-supabase-user';

// import { GridsService } from '../grids/grids.service';

// const DEMO_GRID_NAME = 'Demo Community';
// const DUMPSTER_WALLET_IDENTIFIER = 'CUSTOMER_DEMO_RESET_SYSTEM';

// @Injectable()
// export class DemoService {
//   isDemoResetRunning = false;

//   constructor(
//     private readonly gridsService: GridsService,
//     private readonly ordersService: OrdersService,
//     private readonly userAdminService: UserAdminService,
//     private readonly supabaseService: SupabaseService,
//   ) {}

//   async resetDemoGrid(author: NxtSupabaseUser): Promise<void> {
//     if (this.isDemoResetRunning) {
//       console.info('[DEMO RESET] Skipping...');
//       return;
//     }

//     try {
//       this.isDemoResetRunning = true;
//       console.info('[DEMO RESET] Running...');

//       const demoGrid = await this.supabaseService.adminClient
//         .from('grids')
//         .select(`
//           id,
//           organization:organizations(
//             id,
//             wallet:wallets!organization_id(
//               id,
//               balance
//             )
//           )
//         `)
//         .eq('name', DEMO_GRID_NAME)
//         .maybeSingle()
//         .then(this.supabaseService.handleResponse)
//       ;

//       if (!demoGrid) throw new NotFoundException(`[DEMO RESET] Could not find ${ DEMO_GRID_NAME }`);
//       console.log(demoGrid);


//       /**
//        * Clear the meters
//       **/

//       const meterIds = await this.supabaseService.adminClient
//         .from('meters')
//         .select(`
//           id,
//           external_reference,
//           dcu:dcus!inner(
//             grid_id
//           )
//         `)
//         .eq('dcu.grid_id', demoGrid.id)
//         .then(this.supabaseService.handleResponse)
//         .then(res => {
//           console.log(res);
//           return res;
//         })
//         .then(meters => meters.map(({ id }) => id))
//       ;

//       console.log(meterIds);

//       // Remove all meter assignments
//       // await this.supabaseService.adminClient
//       //   .from('meters')
//       //   .update({
//       //     connection_id: null,
//       //     // @TOMMASO ?
//       //     // dcu_id: null,
//       //     // pole_id: null,
//       //     // rls_grid_id: null,
//       //     // rls_organization_id: null,
//       //   })
//       //   .in('id', meterIds)
//       //   .then(this.supabaseService.handleResponse)
//       // ;


//       /**
//        * Clear the customers
//       **/
//       // @TOMMASO :: Do we want to unplug the connection or delete customers and agents?

//       // const customers: Customer[] = await this.customerssssService.findBysGridIdAndIsDeleted(demoGrid.id, false);
//       const customerIds = await this.supabaseService.adminClient
//         .from('customers')
//         .select(`
//           id,
//           account:accounts!inner(
//             deleted_at
//           )
//         `)
//         .eq('grid_id', demoGrid.id)
//         .is('account.deleted_at', null)
//         .then(this.supabaseService.handleResponse)
//         // .then(customers => customers.map(({ id }) => id))
//       ;

//       console.log(customerIds);
//       // We want to soft delete them, deleting their account
//       // for(const id of customerIds) {
//       //   await this.userAdminService.deleteAccount(id, 'CUSTOMER', author);

//       //   @TOMMASO :: Do we also want to 'unplug' the grid?
//       //   await this.customerssssService.update(id, { id, grid_id: null });
//       // }


//       /**
//        * Clear the agents
//       **/
//       // const agents: Agent[] = await this.agentService.findByGridId(demoGrid.id);
//       const agentIds = await this.supabaseService.adminClient
//         .from('agents')
//         .select(`
//           id,
//           account:accounts!inner(
//             deleted_at
//           )
//         `)
//         .eq('grid_id', demoGrid.id)
//         .is('account.deleted_at', null)
//         .then(this.supabaseService.handleResponse)
//       ;

//       console.log(agentIds);

//       // remove agents from grid

//       return;

//       /**
//        * Emtpy the organization wallet into dumpster wallet
//        * (Dumpster wallet exists to keep track of akk the money ever spent as part of demoes)
//       **/
//       // @TOMMASO :: What about the (customer,) agent, meters wallets?
//       // const wallet: Wallet = await this.walletsService.findByOrganizationId(demoGrid.organization.id);
//       const { organization } = demoGrid;
//       if(!organization) {
//         console.warn(`[DEMO RESET] No organization for ${ DEMO_GRID_NAME }, aborting early...`);
//         return;
//       }
//       const { wallet } = organization;
//       if(!wallet) {
//         console.warn(`[DEMO RESET] No organization wallet for ${ DEMO_GRID_NAME }, aborting early...`);
//         return;
//       }
//       if(wallet.balance === 0) return;

//       // We send all the money belonging to the demo organization back to the
//       // dumpster wallet that keeps track of all the money ever spent as part of demoes
//       const dumpsterWallet = await this.supabaseService.adminClient
//         .from('wallets')
//         .select('id')
//         .eq('identifier', DUMPSTER_WALLET_IDENTIFIER)
//         .maybeSingle()
//         .then(this.supabaseService.handleResponse)
//       ;

//       if (!dumpsterWallet) {
//         console.warn('[DEMO RESET] Couldn\'t find the demo dumpster wallet, aborting early...');
//         return;
//       }

//       await this.ordersService.create({
//         sender_wallet_id: wallet.id,
//         receiver_wallet_id: dumpsterWallet.id,
//         amount: wallet.balance,
//         currency: 'NGN',
//         payment_channel: 'AYRTON',
//       }, author);
//     }
//     finally {
//       console.info('[DEMO RESET] Completed');
//       this.isDemoResetRunning = false;
//     }
//   }

//   // @TOMMASO :: What?
//   // we need this cron to
//   @Cron('*/4 * * * *') //every 4 mins, since the
//   async updateIsHpsOnDataOfDemoGrid() {
//     const grid = await this.gridsService.findByName(DEMO_GRID_NAME);
//     if(!grid) return;

//     await this.gridsssService.update(grid.id, {
//       id: grid.id,
//       is_hps_on: true,
//       is_hps_on_updated_at: new Date(),
//     });
//   }
// }
