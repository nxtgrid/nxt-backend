import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '@core/modules/wallets/entities/wallet.entity';
import { sleep } from '@helpers/utilities';
import { SupabaseService } from '@core/modules/supabase.module';
import { toSafeNumberOrZero } from '@helpers/number-helpers';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    protected readonly walletRepository: Repository<Wallet>,
    private readonly supabaseService: SupabaseService,
  ) { }

  async lockByNextPendingOrder(lockSession: string) {
    for (let i = 0; i < 10; i++) {
      try {
        const newlyLockedWallets = await this.supabaseService.adminClient
          .rpc('lock_next_order_and_wallets', { uuid: lockSession })
          .then(this.supabaseService.handleResponse)
        ;
        return newlyLockedWallets;
      }
      catch (error) {
        console.error('Error locking order and wallets', error);
        // If we are at the last iteration, return empty;
        if (i === 9) return [];
        await sleep(100);
      }
    }
  }

  async unlockWalletsByLockSession(lockSession: string): Promise<void> {
    await this.supabaseService.adminClient
      .from('wallets')
      .update({ lock_session: null })
      .eq('lock_session', lockSession)
      .then(this.supabaseService.handleResponse)
    ;
  }

  // @TOMMASO ::
  //    a) Do we still need this, since balance is also directly on the wallet?
  //    b) If yes, then can we use pgService for this
  async findBalanceById(walletId: number): Promise<number> {
    const walletResult = await this.walletRepository.query(`
        select sum(transactions.amount) as balance
        from transactions
        where transactions.wallet_id = $1
        and transactions.transaction_status = $2
      `, [
      walletId,
      'SUCCESSFUL',
    ]);

    // If there are no transactions, the result will be `null`, so we default to 0
    return toSafeNumberOrZero(walletResult[0].balance);
  }
}
