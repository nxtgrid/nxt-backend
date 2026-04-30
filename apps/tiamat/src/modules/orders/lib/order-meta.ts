import { isNotNil } from 'ramda';

import { AccountTypeEnum, OrderActorTypeEnum, OrderTypeEnum } from '@core/types/supabase-types';
import { OrderForMeta } from './supabase';

type AuthorMeta = {
  meta_author_type?: AccountTypeEnum;
  meta_author_name?: string;
  meta_author_id?: number;
}

// @TOCHECK :: NxtSupabaseUser has all these meta properties already selected
const pullOrderMetaFromAuthor = (author: OrderForMeta['author']): AuthorMeta => {
  if(!author) return {};
  if(author.agent) return {
    meta_author_type: 'AGENT',
    meta_author_name: author.full_name,
    meta_author_id: author.agent.id,
  };
  if(author.customer) return {
    meta_author_type: 'CUSTOMER',
    meta_author_name: author.full_name,
    meta_author_id: author.customer.id,
  };
  if(author.member) return {
    meta_author_type: 'MEMBER',
    meta_author_name: author.full_name,
    meta_author_id: author.member.id,
  };
  return {};
};

type SenderMeta = {
  meta_sender_type?: OrderActorTypeEnum;
  meta_sender_name?: string;
  meta_sender_id?: number;
  meta_sender_name_part_2?: string;
}

const pullOrderMetaFromSenderWallet = (wallet: OrderForMeta['sender_wallet']): SenderMeta => {
  if(wallet.agent) return {
    meta_sender_type: 'AGENT',
    meta_sender_name: wallet.agent.account.full_name,
    meta_sender_id: wallet.agent.id,
  };
  if(wallet.meter) return {
    meta_sender_type: 'METER',
    meta_sender_name: wallet.meter.external_reference,
    meta_sender_id: wallet.meter.id,
    meta_sender_name_part_2: wallet.meter.connection.customer.account.full_name,
  };
  if(wallet.organization) return {
    meta_sender_type: 'ORGANIZATION',
    meta_sender_name: wallet.organization.name,
    meta_sender_id: wallet.organization.id,
  };
  if(wallet.connection) return {
    meta_sender_type: 'CONNECTION',
    meta_sender_name: wallet.connection.upload_uuid,
    meta_sender_id: wallet.connection.id,
    meta_sender_name_part_2: wallet.connection.customer.account.full_name,
  };
  // @TOMMASO :: Did this only happen once in the entire history? Can it happen again?
  if(wallet.identifier === 'BANKING_SYSTEM') return {
    meta_sender_type: 'BANKING_SYSTEM',
    meta_sender_name: 'Banking system',
  };
  return {};
};

type OrderMeta = {
  meta_author_type?: AccountTypeEnum;
  meta_author_name?: string;
  meta_author_id?: number;

  meta_sender_type?: OrderActorTypeEnum;
  meta_sender_name?: string;
  meta_sender_id?: number;
  meta_sender_name_part_2?: string;

  meta_receiver_type?: OrderActorTypeEnum;
  meta_receiver_name?: string;
  meta_receiver_id?: number;
  meta_receiver_name_part_2?: string;
  meta_receiver_id_part_2?: number;

  meta_order_type?: OrderTypeEnum;
  meta_is_hidden_from_reporting?: boolean;

  historical_grid_id?: number;
  rls_organization_id?: number;
};

export const inferOrderMeta = (order: OrderForMeta): OrderMeta => {
  try {
    const authorMeta = pullOrderMetaFromAuthor(order.author);
    const senderMeta = pullOrderMetaFromSenderWallet(order.sender_wallet);
    const _meta: OrderMeta = { ...authorMeta, ...senderMeta };

    // We use the receiver to establish what grid/developer an order belongs to.
    // If an agent in grid A does a topup to a meter in grid B,
    // then the order will be considered to belong to grid B.

    // We leverage the receiver to understand where the order has been assigned.
    const { receiver_wallet } = order;

    // If it's a top-up for an agent wallet
    if (receiver_wallet.agent) {
      const { agent } = receiver_wallet;
      _meta.meta_receiver_type = 'AGENT';
      _meta.meta_receiver_name = agent.account.full_name;
      _meta.meta_receiver_id = agent.id;
      _meta.meta_order_type = 'AGENT_TOPUP';
      // If the agent belongs to a grid that's hidden from reporting, then set hidden from reporting to true
      _meta.meta_is_hidden_from_reporting = agent.grid.is_hidden_from_reporting;
      _meta.historical_grid_id = agent.grid.id;
      _meta.rls_organization_id = agent.grid.organization_id;
    }
    // If it's a top-up for a customer wallet
    else if (receiver_wallet.customer) {
      const { customer } = receiver_wallet;
      _meta.meta_receiver_type = 'CUSTOMER';
      _meta.meta_receiver_name = customer.account.full_name;
      _meta.meta_receiver_id = customer.id;
      _meta.meta_is_hidden_from_reporting = customer.is_hidden_from_reporting || customer.grid.is_hidden_from_reporting;
      _meta.historical_grid_id = customer.grid.id;
      _meta.rls_organization_id = customer.grid.organization_id;
    }
    // If it's a top-up for an organization wallet
    else if (receiver_wallet.organization) {
      const { organization: receivingOrganization } = receiver_wallet;
      _meta.meta_receiver_type = 'ORGANIZATION';
      _meta.meta_receiver_name = receivingOrganization.name;
      _meta.meta_receiver_id = receivingOrganization.id;

      // If the order is a connection refund, then it's going to be assigned
      // to the grid to which the connection belongs to.
      if (order.sender_wallet.connection) {
        const { sender_wallet: { connection } } = order;
        // If either the customer to which the connection belongs, or it grid are hidden from reporting, then the order will not be tracked
        _meta.meta_is_hidden_from_reporting = connection.customer.is_hidden_from_reporting || connection.customer.grid.is_hidden_from_reporting;
        _meta.meta_order_type = 'CONNECTION_REFUND';
        _meta.historical_grid_id = connection.customer.grid.id;
        _meta.rls_organization_id = connection.customer.grid.organization_id;
      }
      // From one organization to another
      else if (order.sender_wallet.organization) {
        if (order.sender_wallet.organization.name === 'NXT Grid') {
          _meta.meta_order_type = 'ORGANIZATION_TOPUP';
          _meta.rls_organization_id = receivingOrganization.id;
        }
        else {
          _meta.meta_order_type = 'ORGANIZATION_WITHDRAWAL';
          _meta.rls_organization_id = order.sender_wallet.organization.id;
        }
      }
      // From a banking system to an organization
      else if (order.sender_wallet.identifier === 'BANKING_SYSTEM') {
        _meta.meta_order_type = 'ORGANIZATION_TOPUP';
        _meta.rls_organization_id = receivingOrganization.id;
        // Banking to organization is always something "official"
        _meta.meta_is_hidden_from_reporting = false;
      }
      // Withdrawal from agent wallet
      else if (order.sender_wallet.agent) {
        _meta.meta_order_type = 'AGENT_WITHDRAWAL';
        _meta.historical_grid_id = order.sender_wallet.agent.grid.id;
        _meta.rls_organization_id = order.sender_wallet.agent.grid.organization_id;
        _meta.meta_is_hidden_from_reporting = false;
      }
      // Withdrawal from meter (@TOMMASO what? Is this meter credit transfer?)
      else if (order.sender_wallet.meter) {
        _meta.historical_grid_id = order.sender_wallet.meter.connection.customer.grid.id;
        _meta.rls_organization_id = order.sender_wallet.meter.connection.customer.grid.organization_id;
        _meta.meta_is_hidden_from_reporting = false;
      }
      else {
        console.info('[ORDER META] Receiver is organization, but receiver not identified', order);
      }
    }
    // If it's a topup to a meter (aka energy topup)
    else if (receiver_wallet.meter) {
      const { meter } = receiver_wallet;
      _meta.meta_receiver_type = 'METER';
      _meta.meta_receiver_name = meter.external_reference;
      _meta.meta_receiver_id = meter.id;
      _meta.meta_receiver_name_part_2 = meter.connection.customer.account.full_name;
      _meta.meta_receiver_id_part_2 = meter.connection.customer.id;
      _meta.meta_order_type = 'ENERGY_TOPUP';
      _meta.historical_grid_id = meter.connection.customer.grid.id;
      _meta.rls_organization_id = meter.connection.customer.grid.organization_id;

      // If either the customer to which the meter belongs, or it grid are hidden from reporting, then the order will not be tracked.
      // Also if the order is part of a meter credit transfer it should not be counted
      _meta.meta_is_hidden_from_reporting = meter.connection.customer.is_hidden_from_reporting || meter.connection.customer.grid.is_hidden_from_reporting || isNotNil(order.meter_credit_transfer_id);
    }
    // If it's a connection payment
    else if (receiver_wallet.connection) {
      const { connection } = order.receiver_wallet;
      _meta.meta_receiver_type = 'CONNECTION';
      _meta.meta_receiver_name = connection.upload_uuid;
      _meta.meta_receiver_id = connection.id;
      _meta.meta_receiver_name_part_2 = connection.customer.account.full_name;
      _meta.meta_receiver_id_part_2 = connection.customer.id;
      _meta.meta_order_type = 'CONNECTION_PAYMENT';
      _meta.historical_grid_id = connection.customer.grid.id;
      _meta.rls_organization_id = connection.customer.grid.organization_id;
      // If either the customer to which the connection belongs, or it grid are hidden from reporting, then the order will not be tracked
      _meta.meta_is_hidden_from_reporting = connection.customer.is_hidden_from_reporting || connection.customer.grid.is_hidden_from_reporting;
    }

    return _meta;
  }
  catch (err) {
    console.error('Error blocked adding meta for order:');
    console.error(err);
    console.error(order);

    return {};
  }
};
