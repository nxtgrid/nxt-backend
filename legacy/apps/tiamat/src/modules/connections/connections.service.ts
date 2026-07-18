import { Injectable, ConflictException } from '@nestjs/common';
import { partition, prop } from 'ramda';
import { addFees } from '@helpers/computation-helpers';

// DTOs
import { CreateConnectionDto } from '@core/modules/connections/dto/create-connection.dto';
import { UpdateConnectionRequestedMetersDto } from './dto/update-connection-requested-meters.dto';

// Services
import { SupabaseService } from '@core/modules/supabase.module';
import { pluckIdsFrom } from '@helpers/array-helpers';
import { UpdateConnection } from '@core/types/supabase-types';

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly supabaseService: SupabaseService,
  ) { }

  // @CHECK :: Is this used at all
  async create(createConnectionDto: CreateConnectionDto) {
    const existingConnection = await this.supabaseService.adminClient
      .from('connections')
      .select('id')
      .eq('upload_uuid', createConnectionDto.upload_uuid)
      .maybeSingle()
      .then(this.supabaseService.handleResponse)
    ;
    if (existingConnection)
      throw new ConflictException('A connection with this upload id already exists');

    const { requested_meters, ...restDto } = createConnectionDto;

    const connection = await this.supabaseService.adminClient
      .from('connections')
      .insert(restDto)
      .select('id')
      .single()
      .then(this.supabaseService.handleResponse)
    ;

    await this.supabaseService.adminClient
      .from('connection_requested_meters')
      .insert(requested_meters.map(rm => ({ ...rm, connection_id: connection.id })))
      .then(this.supabaseService.handleResponse)
    ;

    await this.supabaseService.adminClient
      .from('wallets')
      .insert({ wallet_type: 'VIRTUAL', connection_id: connection.id })
      .then(this.supabaseService.handleResponse)
    ;

    return connection;
  }

  async update(id: number, updateConnectionDto: UpdateConnection) {
    await this.supabaseService.adminClient
      .from('connections')
      .update(updateConnectionDto)
      .eq('id', id)
      .then(this.supabaseService.handleResponse)
    ;

    return { id };
  }

  // @BULK-UPDATES :: When we have the new Supabase way for bulk updates
  async updateMany(updateDtos: UpdateConnection[]) {
    console.info('[CONNECTIONS UPDATE MANY] #DTOs', updateDtos.length);
    // Filter out items without ID and recast to Insert type because that's what .upsert requires
    // const toUpdate = updateDtos.filter(({ id }) => !!id) as (InsertConnection & { id: number })[];
    // await this.supabaseService.adminClient
    //   .from('connections')
    //   .upsert(toUpdate, { onConflict: 'id'/* , defaultToNull: false */ })
    //   .then(this.supabaseService.handleResponse)
    //   .then(res => {
    //     console.info('[CONNECTIONS UPDATE MANY] response', res);
    //   })
    // ;

    // return pluckIdsFrom(toUpdate);

    for (const updateDto of updateDtos) {
      await this.update(updateDto.id, updateDto);
    }

    return pluckIdsFrom(updateDtos);
  }

  async updateRequestedMeters({ connection_id, requested_meters }: UpdateConnectionRequestedMetersDto) {
    // Get connection first so it serves as the 'old' data before changes
    const connection = await this.supabaseService.adminClient
      .from('connections')
      .select(`
        id,
        connection_requested_meters(
          fee
        ),
        customer:customers(
          id,
          total_connection_fee
        )
      `)
      .eq('id', connection_id)
      .is('connection_requested_meters.deleted_at', null)
      .single()
      .then(this.supabaseService.handleResponse)
    ;

    const [ deletedMeters, remainingMeters ] = partition(prop('is_deleted'), requested_meters);
    if(deletedMeters.length) {
      await this.supabaseService.adminClient
        .from('connection_requested_meters')
        .update({ deleted_at: (new Date()).toISOString() })
        .in('id', pluckIdsFrom(deletedMeters))
        .then(this.supabaseService.handleResponse)
      ;
    }

    // We need to update the customer too because it has a field with the total of all connection fees
    const oldFee = addFees(connection.connection_requested_meters);
    const newFee = addFees(remainingMeters);
    const feeToAdd = newFee - oldFee;

    if (feeToAdd && connection.customer) {
      const total_connection_fee = connection.customer.total_connection_fee + feeToAdd;
      await this.supabaseService.adminClient
        .from('customers')
        .update({ total_connection_fee })
        .eq('id', connection.customer.id)
        .then(this.supabaseService.handleResponse)
      ;
    }

    if(remainingMeters.length) {
      const metersToSave = remainingMeters.map(({ is_deleted: _is_deleted, ...meter }) => ({ ...meter, connection_id }));
      await this.supabaseService.adminClient
        .from('connection_requested_meters')
        .upsert(metersToSave, { onConflict: 'id', defaultToNull: false })
        .then(this.supabaseService.handleResponse)
      ;
    }

    return { id: connection_id };
  }
}
