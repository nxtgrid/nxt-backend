import { isNotNil } from 'ramda';
import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { round } from '@helpers/number-helpers';
import { VictronService } from '@core/modules/victron/victron.service';
import { SupabaseService } from '@core/modules/supabase.module';
import { InsertMppt, MpptTypeEnum } from '@core/types/supabase-types';

interface MpptForComparisonBetweenDbAndVrm {
  external_reference: string;
  external_id: string;
  mppt_type: MpptTypeEnum;
  kw: number;
  azimuth: number;
  tilt: number;
}

@Injectable()
export class MpptsService {
  constructor(
    private readonly victronService: VictronService,
    private readonly supabaseService: SupabaseService,
  ) { }

  private readonly gridsCurrentlySyncing = new Set<number>();

  public async syncGrid(grid_id: number) {
    if (this.gridsCurrentlySyncing.has(grid_id)) {
      console.info('[MPPTSERVICE SYNC] Grid sync already in progress, skipping', grid_id);
      return;
    }

    this.gridsCurrentlySyncing.add(grid_id);

    try {
      const { adminClient: supabase, handleResponse } = this.supabaseService;

      // console.info('[MPPTSERVICE SYNC] Fetching grid', grid_id);

      const grid = await supabase
        .from('grids')
        .select('generation_external_site_id, name, kwp')
        .eq('id', grid_id)
        .eq('generation_external_system', 'VICTRON')
        .not('generation_external_site_id', 'is', null)
        .not('generation_external_gateway_id', 'is', null)
        .maybeSingle()
        .then(handleResponse)
      ;

      if(!grid) throw new NotFoundException('The MPPTs for this grid can\'t be synced, please check if it has the valid generation IDs provided.');

      const devicesFromVrm = await this.victronService.fetchDevices(grid.generation_external_site_id);
      if (!devicesFromVrm) throw new ServiceUnavailableException(`Received unexpected result from VRM when trying to update MPPT assets for ${ grid.name }`);

      // console.info('[MPPTSERVICE SYNC] Fetched devices from VRM', devicesFromVrm.length, devicesFromVrm);

      /**
         * Fetch MPPTs from both VRM and our DB so we can diff them and delete/insert accordingly
        **/

      const mpptsFromVrm = devicesFromVrm
        .filter(({ name }) => [ 'Solar Charger', 'PV Inverter' ].includes(name))
        .map(_mppt => this.parseVrmMpptData(_mppt))
        .filter(_mppt => isNotNil(_mppt))
      ;
      // console.info('[MPPTSERVICE SYNC] MPPTs from VRM', mpptsFromVrm.length, mpptsFromVrm);

      const mpptsFromDb = await supabase
        .from('mppts')
        .select(`
            id,
            external_reference,
            external_id,
            kw,
            azimuth,
            tilt,
            mppt_type
          `)
        .eq('grid_id', grid_id)
        .is('deleted_at', null)
        .then(handleResponse)
        ;
      // console.info('[MPPTSERVICE SYNC] MPPTs from DB', mpptsFromDb.length, mpptsFromDb);

      const now = (new Date()).toISOString();

      /**
         * Delete MPPTs from DB that are in DB but not in VRM
        **/

      let toDeleteIds: number[] = [];
      for (const mpptFromDb of mpptsFromDb) {
        const isMpptStillActiveOnVrm = mpptsFromVrm.find(mpptFromVrm => this.areMpptsTheSame(mpptFromDb, mpptFromVrm));

        // MPPT in DB is also active on VRM -> don't delete
        if (isMpptStillActiveOnVrm) continue;

        // Otherwise delete
        console.info('[MPPTSERVICE SYNC] Going to delete MPPT', mpptFromDb);
        toDeleteIds = [ ...toDeleteIds, mpptFromDb.id ];
      }
      if(toDeleteIds.length) {
        await supabase
          .from('mppts')
          .update({ deleted_at: now })
          .in('id', toDeleteIds)
          .then(handleResponse)
        ;
      }

      /**
         * Create MPPTs in DB that are in VRM but not in DB
        **/

      let toInsertDtos: InsertMppt[] = [];
      for (const mpptFromVrm of mpptsFromVrm) {
        const existingMpptInDb = mpptsFromDb.find(mpptFromDb => this.areMpptsTheSame(mpptFromVrm, mpptFromDb));

        // MPPT from VRM exists in DB -> don't create
        if (existingMpptInDb) continue;

        // Otherwise create
        console.info('[MPPTSERVICE SYNC] Going to create MPPT', mpptFromVrm);
        toInsertDtos = [ ...toInsertDtos, { ...mpptFromVrm, installed_at: now, grid_id } ];
      }
      if(toInsertDtos.length) {
        await supabase
          .from('mppts')
          .insert(toInsertDtos)
          .then(handleResponse)
        ;
      }

      /**
         * Refetch MPPTs to recalculate grid kWp and update if different
        **/

      const mpptsKw = await supabase
        .from('mppts')
        .select('kw')
        .eq('grid_id', grid_id)
        .is('deleted_at', null)
        .then(handleResponse)
        ;
      const totalKw: number = mpptsKw
        .map(({ kw }) => kw)
        .reduce((accumulator, currentValue) => accumulator + currentValue, 0);
      const roundedKw = round(totalKw, 2);
      // console.info('[MPPTSERVICE SYNC] MPPT summed kWp - Grid current kWp', roundedKw, grid.kwp);

      if (roundedKw !== grid.kwp) {
        console.info('[MPPTSERVICE SYNC] Going to update grid kWp', { id: grid_id, kwp: roundedKw });
        await supabase
          .from('grids')
          .update({ kwp: roundedKw })
          .eq('id', grid_id)
          .then(handleResponse)
        ;
      }
    }
    finally {
      this.gridsCurrentlySyncing.delete(grid_id);
    }
  }

  private areMpptsTheSame(mpptA: MpptForComparisonBetweenDbAndVrm, mpptB: MpptForComparisonBetweenDbAndVrm): boolean {
    if (!mpptA || !mpptB) return false;

    return mpptA.external_reference === mpptB.external_reference &&
      mpptA.kw === mpptB.kw &&
      mpptA.mppt_type === mpptB.mppt_type &&
      mpptA.azimuth === mpptB.azimuth &&
      mpptA.tilt === mpptB.tilt &&
      String(mpptA.external_id) === String(mpptB.external_id);
  }

  private parseVrmMpptData(mpptDevice): MpptForComparisonBetweenDbAndVrm {
    // eslint-disable-next-line no-useless-escape
    const regex = /ARTN\/?([\d\.,]+)\s?\/\s?(-?\+?[\d\.,]+)\s?\/\s?([\d\.,]+)/gm;

    const regexParsingRes = regex.exec(mpptDevice.customName);
    if (!regexParsingRes) return null;

    if (typeof mpptDevice.customName !== 'string') return;
    const string = mpptDevice.customName;

    // @HACK: Since the VRM API seems to have a bug, if we are dealing with a solar charger,
    // then we extract the last 4 digits of the serial number. Instead, if it's a pv inverter
    // we extract the second string group from the custom name ("FRON 1279 ARTN10.92/+153/10"
    // becomes "1279")
    const externalReference = mpptDevice.name === 'Solar charger' ?
      string.substring(string.length - 4) :
      mpptDevice.customName.split(' ')[1]
    ;

    // If the parsing failed, then return null, which will be filtered out in the outer loop
    if (!externalReference) return null;

    return {
      external_reference: externalReference,
      external_id: mpptDevice.instance,
      mppt_type: mpptDevice.name === 'Solar Charger' ? 'MPPT' : 'PV_INVERTER',
      kw:  Number(regexParsingRes[1]),
      azimuth: Number(regexParsingRes[2]),
      tilt: Number(regexParsingRes[3]),
    };
  }
}
