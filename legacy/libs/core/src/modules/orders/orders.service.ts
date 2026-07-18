import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Repository } from 'typeorm';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    protected readonly orderRepository: Repository<Order>,
  ) { }

  findAll() {
    return 'This action returns all orders';
  }

  findTopupsByIsHiddenFromReporting(isHiddenFromReporting: boolean, limit: number, offset: number) {
    const qb = this.orderRepository.createQueryBuilder('orders');

    return qb
      .leftJoinAndSelect('orders.receiver_wallet', 'receiver_wallet')
      .leftJoinAndSelect('receiver_wallet.meter', 'meter')
      .leftJoinAndSelect('meter.connection', 'connection')
      .leftJoinAndSelect('connection.customer', 'customer')
      .leftJoinAndSelect('customer.grid', 'grid')
      .where('customer.is_hidden_from_reporting = :is_customer_hidden_from_reporting', { is_customer_hidden_from_reporting: isHiddenFromReporting })
      .andWhere('grid.is_hidden_from_reporting = :is_grid_hidden_from_reporting', { is_grid_hidden_from_reporting : isHiddenFromReporting })
      .limit(limit)
      .offset(offset)
      .getMany();
  }

  async findOne(id: number): Promise<Order> {
    const qb = this.orderRepository.createQueryBuilder('orders');

    return this.fetchProperties(qb)
      .where('orders.id = :id', { id: id })
      .getOne();
  }

  fetchProperties(qb) {
    return qb.leftJoinAndSelect('orders.sender_wallet', 'sender_wallet')
      .leftJoinAndSelect('sender_wallet.meter', 'sender_meter')
      .leftJoinAndSelect('sender_meter.connection', 'sender_meter_connection')
      .leftJoinAndSelect('sender_meter_connection.customer', 'sender_meter_connection_customer')
      .leftJoinAndSelect('sender_meter_connection_customer.grid', 'sender_meter_connection_customer_grid')
      .leftJoinAndSelect('sender_meter_connection_customer_grid.organization', 'sender_meter_connection_customer_grid_organization')
      .leftJoinAndSelect('orders.receiver_wallet', 'receiver_wallet')
      .leftJoinAndSelect('orders.meter_credit_transfer', 'meter_credit_transfer')
      .leftJoinAndSelect('sender_wallet.connection', 'connection_wallet')
      .leftJoinAndSelect('sender_wallet.organization', 'sender_organization')
      .leftJoinAndSelect('connection_wallet.customer', 'sender_customer_wallet')
      .leftJoinAndSelect('sender_customer_wallet.account', 'sender_customer_wallet_account')
      .leftJoinAndSelect('sender_customer_wallet.grid', 'sender_customer_wallet_grid')
      .leftJoinAndSelect('sender_customer_wallet_grid.organization', 'sender_customer_wallet_grid_organization')
      .leftJoinAndSelect('receiver_wallet.meter', 'meter')
      .leftJoinAndSelect('receiver_wallet.connection', 'customer_connection')
      .leftJoinAndSelect('receiver_wallet.organization', 'receiver_organization')
      .leftJoinAndSelect('sender_wallet.agent', 'sender_wallet_agent')
      .leftJoinAndSelect('sender_wallet_agent.grid', 'sender_wallet_agent_grid')
      .leftJoinAndSelect('sender_wallet_agent_grid.organization', 'sender_wallet_agent_grid_organization')
      .leftJoinAndSelect('sender_wallet_agent.account', 'sender_wallet_agent_account')
      .leftJoinAndSelect('receiver_wallet.agent', 'receiver_wallet_agent')
      .leftJoinAndSelect('receiver_wallet_agent.account', 'receiver_wallet_agent_account')
      .leftJoinAndSelect('receiver_wallet_agent.grid', 'receiver_wallet_agent_grid')
      .leftJoinAndSelect('receiver_wallet_agent_grid.organization', 'receiver_wallet_agent_grid_organization')
      .leftJoinAndSelect('customer_connection.customer', 'connection_customer')

      .leftJoinAndSelect('connection_customer.account', 'connection_customer_account')

      .leftJoinAndSelect('connection_customer.grid', 'connection_customer_grid')
      .leftJoinAndSelect('connection_customer.wallet', 'connection_customer_wallet')
      .leftJoinAndSelect('customer_connection.wallet', 'customer_connection_wallet')
      .leftJoinAndSelect('meter.connection', 'meter_connection')
      .leftJoinAndSelect('meter.dcu', 'dcu')
      .leftJoinAndSelect('meter_connection.customer', 'customer')
      .leftJoinAndSelect('customer.account', 'customer_account')
      .leftJoinAndSelect('customer.wallet', 'customer_wallet')
      .leftJoinAndSelect('customer.grid', 'customer_grid')
      .leftJoinAndSelect('customer_grid.organization', 'customer_grid_organization')
      .leftJoinAndSelect('orders.author', 'author')
      .leftJoinAndSelect('author.member', 'author_member')
      .leftJoinAndSelect('author_member.account', 'author_member_account');
  }

  async findByLockSession(lockSession: string): Promise<Order> {
    const qb = this.orderRepository.createQueryBuilder('orders');

    return this.fetchProperties(qb)
      .where('orders.lock_session = :lock_session', { lock_session: lockSession })
      .getOne();
  }

  async findByIds(ids: number[]): Promise<Order[]> {
    // need to do this, because if the array is empty the query will
    // give an error
    if (ids.length < 1) return [];

    const qb = this.orderRepository.createQueryBuilder('orders');

    return qb
      .leftJoinAndSelect('orders.sender_wallet', 'sender_wallet')
      .leftJoinAndSelect('orders.receiver_wallet', 'receiver_wallet')
      .where('orders.id in (:...ids)', { ids: ids })
      .getMany();
  }

  findByExternalReference(externalReference: string) {
    const qb = this.orderRepository.createQueryBuilder('orders');

    return qb
      .leftJoinAndSelect('orders.sender_wallet', 'sender_wallet')
      .leftJoinAndSelect('orders.receiver_wallet', 'receiver_wallet')
      .where('orders.external_reference = :external_reference', { external_reference: externalReference })
      .getOne();
  }

  findNextPending(options: { offset: number }): Promise<Order> {
    const qbOrders = this.orderRepository.createQueryBuilder('orders');

    return qbOrders
      .leftJoinAndSelect('orders.sender_wallet', 'sender_wallet')
      .leftJoinAndSelect('orders.receiver_wallet', 'receiver_wallet')
      // .leftJoinAndSelect('orders.meter_credit_transfer', 'meter_credit_transfer')
      .leftJoinAndSelect('sender_wallet.connection', 'connection_wallet')
      .leftJoinAndSelect('connection_wallet.customer', 'sender_customer_wallet')
      .leftJoinAndSelect('receiver_wallet.meter', 'meter')
      .leftJoinAndSelect('receiver_wallet.connection', 'customer_connection')
      .leftJoinAndSelect('sender_wallet.agent', 'sender_wallet_agent')
      .leftJoinAndSelect('sender_wallet_agent.account', 'sender_wallet_agent_account')
      .leftJoinAndSelect('receiver_wallet.agent', 'receiver_wallet_agent')
      .leftJoinAndSelect('receiver_wallet_agent.account', 'receiver_wallet_agent_account')
      .leftJoinAndSelect('customer_connection.customer', 'connection_customer')
      .leftJoinAndSelect('connection_customer.wallet', 'connection_customer_wallet')
      .leftJoinAndSelect('customer_connection.wallet', 'customer_connection_wallet')
      .leftJoinAndSelect('meter.connection', 'meter_connection')
      .leftJoinAndSelect('meter.dcu', 'dcu')
      .leftJoinAndSelect('meter_connection.customer', 'customer')
      .leftJoinAndSelect('customer.account', 'account')
      .leftJoinAndSelect('customer.grid', 'grid')
      .leftJoinAndSelect('customer.wallet', 'customer_wallet')
      .where('orders.order_status = :order_status', { order_status: 'PENDING' })
      .orderBy('orders.created_at', 'ASC')
      .limit(1)
      .offset(options.offset)
      .getOne();
  }
}
