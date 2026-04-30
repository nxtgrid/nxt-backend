import { Injectable } from '@nestjs/common';

@Injectable()
export class LoansService {
  constructor(
    // @InjectRepository(Loan)
    // protected readonly loanRepository: Repository<Loan>,
  ) { }

  findAll() {
    return 'This action returns all loans';
  }

  findOne(id: number) {
    console.info(id);
    // const qb = this.loanRepository.createQueryBuilder('loans');

    // return qb
    //   .leftJoinAndSelect('loans.lender_wallet', 'lender_wallet')
    //   .leftJoinAndSelect('loans.borrower_wallet', 'borrower_wallet')
    //   .leftJoinAndSelect('loans.order', 'order')
    //   .where('loans.id = :id', { id: id })
    //   .getOne();
  }

  async findPendingLoansByBorrowerWalletId(borrowerWalletId: number): Promise<any[]> {
    console.info(borrowerWalletId);
    return;
    // const results = await this.loanRepository.query(`
    //   select c.id, c.balance, c.lender_wallet_id
    //   from (
    //     select
    //     loans.id as id,
    //     lender_wallet_id as lender_wallet_id,
    //     (
    //       case
    //         when
    //           (b.balance is null)
    //         then
    //           (loans.principal * -1)
    //         else
    //           (loans.principal * -1) + b.balance
    //       end
    //     ) as balance
    //     from loans
    //     left join (select t.loan_id, t.balance as balance
    //         from
    //           (
    //             select loan_id, sum(transactions.amount) as balance
    //             from transactions
    //             where transactions.transaction_status = $1
    //             group by transactions.loan_id
    //           ) as t
    //           ) as b on b.loan_id = loans.id
    //     where loans.borrower_wallet_id = $2
    //   ) as c
    //   where c.balance < $3
    //   order by loans.id asc
    // `, [
    //   TransactionStatus.SUCCESSFUL,
    //   borrowerWalletId,
    //   0,
    // ]);

    // const ids = results.map(({ id }) => id);
    // return this.findByIds(ids);
  }

  async findByIds(ids: number[]): Promise<any[]> {
    console.info(ids);
    return;
    // // need to do this, because if the array is empty the query will
    // // give an error
    // if (ids.length < 1) {
    //   return [];
    // }

    // const qb = this.loanRepository.createQueryBuilder('loans');

    // return qb
    //   .leftJoinAndSelect('loans.lender_wallet', 'lender_wallet')
    //   .leftJoinAndSelect('loans.borrower_wallet', 'borrower_wallet')
    //   .where('loans.id in (:...ids)', { ids: ids })
    //   .getMany();
  }
}
