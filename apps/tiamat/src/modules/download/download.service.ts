import * as fs from 'fs';
import { join } from 'path';
import { Injectable, NotFoundException } from '@nestjs/common';
import { replaceCommas, inferCustomerGender, inferCustomerCategory, inferCustomerType, inferDateConnected, inferMeterStatus } from './download-helpers';
import { orderWith } from '@helpers/array-helpers';

// Services
import { SupabaseService } from '@core/modules/supabase.module';

@Injectable()
export class DownloadService {
  constructor(
    private readonly supabaseService: SupabaseService,
  ){}

  async prepareGridPbgConnectionFile(gridId: number): Promise<any> {
    const grid = await this.supabaseService.adminClient
      .from('grids')
      .select('name')
      .eq('id', gridId)
      .maybeSingle()
      .then(this.supabaseService.handleResponse)
    ;
    if(!grid) throw new NotFoundException(`Could not find grid with id ${ gridId }`);

    const meters = await this.supabaseService.adminClient
      .from('meters')
      .select(`
        external_reference,
        meter_type,
        longitude,
        latitude,
        ...poles(
          location_geom
        ),
        connection:connections!inner(
          is_public,
          is_residential,
          is_commercial,
          customer:customers!inner(
            gender,
            generator_owned,
            account:accounts(
              full_name,
              phone
            )
          )
        ),
        last_metering_hardware_install_session:last_metering_hardware_install_session_id(
          last_metering_hardware_import:last_metering_hardware_import_id(
            metering_hardware_import_status
          ),
          last_meter_commissioning:last_meter_commissioning_id(
            created_at,
            meter_commissioning_status
          )
        ),
        last_encountered_issue:last_encountered_issue_id(
          issue_status,
          issue_type
        )
      `)
      .eq('connection.customer.grid_id', gridId)
      // @TOCHECK :: Supabase can't sort deeper than 1, https://github.com/orgs/supabase/discussions/38362
      // .order('last_metering_hardware_install_session(last_meter_commissioning(created_at))')
      .then(this.supabaseService.handleResponse)
      .then(orderWith({ path: 'last_metering_hardware_install_session.last_meter_commissioning.created_at', ascending: false }))
    ;

    const headerString = [
      'External ID',
      'Customer Name',
      'Gender of Primary Account Holder',
      'Customer Category',
      'Customer Type',
      'Location (Address)',
      'Location (State)',
      'Phone Number',
      'Latitude',
      'Longitude',
      'Date Connected',
      'Meter Type (EXTRA FIELD)',
      'Meter Status (EXTRA FIELD)',
    ].join(',') + '\n';

    const metersString = meters
      .map(({ external_reference, connection, meter_type, location_geom, latitude, longitude, last_metering_hardware_install_session, last_encountered_issue }) => [
        external_reference,
        connection.customer.account.full_name,
        inferCustomerGender(connection.customer),
        inferCustomerCategory(connection),
        inferCustomerType(connection.customer),
        `${ grid.name } Community`,
        '',
        connection.customer.account.phone ?? '+2349000000000',
        location_geom?.coordinates[1] ?? latitude,
        location_geom?.coordinates[0] ?? longitude,
        inferDateConnected(last_metering_hardware_install_session),
        meter_type,
        inferMeterStatus(last_metering_hardware_install_session, last_encountered_issue),
      ].map(replaceCommas).join(','))
      .join('\n');

    const fileName = `${ grid.name }-pbg-connections-${ new Date().toISOString() }.csv`;
    return this._writeToFile(fileName, headerString + metersString);
  }

  private _writeToFile(fileName: string, string: string): Promise<any> {
    const filePath = join(process.env.UPLOAD_FOLDER, fileName);
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, string, err => {
        if(err) {
          console.error('Error writing PBG connection file', err);
          return reject(err);
        }
        return resolve(fs.createReadStream(filePath));
      });
    });
  }
}
