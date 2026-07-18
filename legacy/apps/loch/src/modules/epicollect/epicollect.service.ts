import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { decode, JwtPayload } from 'jsonwebtoken';
import { mapAsyncSequential } from '@helpers/promise-helpers';
import { makePhoneCompliantForSupabaseFilter } from '@helpers/phone-helpers';
import { addFees } from '@helpers/computation-helpers';
import { isPhoneNumber } from 'class-validator';

// Services
import { SupabaseService } from '@core/modules/supabase.module';
import { SoftwareDevAlertService } from '@core/modules/software-dev-alert/software-dev-alert.service';
import { MongoAtlasService } from '../mongo-atlas/mongo-atlas.service';

// Types
import { Survey } from './types/survey-type';
import { CreateCustomerDto } from '@core/modules/customers/dto/create-customer.dto';
import { CreateConnectionDto, RequestedMeterDto } from '@core/modules/connections/dto/create-connection.dto';
import { IdDocumentTypeEnum } from '@core/types/supabase-types';
import { toSafeNumberOrNull, toSafeNumberOrZero } from '@helpers/number-helpers';

interface OrganizationForSurveyFetching {
  id: number;
  name: string;
  epicollect_contract_survey_client_id: string;
  epicollect_contract_survey_secret: string;
  epicollect_contract_survey_slug: string;
  epicollect_contract_last_sync_at: string;
}

interface GridForFeeCalculation {
  uses_dual_meter_setup: boolean;
  default_hps_connection_fee: number;
  default_fs_1_phase_connection_fee: number;
  default_fs_3_phase_connection_fee: number;
}

/**
 * 3rd party API documentation can be found at
 * https://developers.epicollect.net/
 *
 * @TODO :: Rethink the lat-lng on connections, customers, meters
 *  - Meters have a pole (and no own coordinates when transition to pole if fully done)
 *
 * @TODO :: Rethink fees, paid
 *  - FUTURE: Meters are paid by developers so we don't need to track who paid what fees
 *  - `total_connection_fee` stays on customer, not connection
 *  - `paid` should ideally go to customer if possible
 *
**/

const { NXT_ENV, EPICOLLECT_API, TIAMAT_API, TIAMAT_API_KEY } = process.env;
const TIAMAT_API_OPTIONS = { headers: { 'X-API-KEY': TIAMAT_API_KEY } };
const EPICOLLECT_MAX_PAGE_SIZE = 100;
const DOCUMENT_TYPE_MAP: { [prop: string]: IdDocumentTypeEnum} = {
  passport: 'PASSPORT',
  driver_license: 'DRIVING_LICENSE',
  voter_card: 'VOTERS_CARD',
  national_id: 'NATIONAL_ID',
};
const MONGO_SETTINGS = {
  collection: 'contracts',
  database: 'epicollect',
  dataSource: 'Cluster1',
};

@Injectable()
export class EpicollectService {
  isEpicollectImportRunning = false;

  cachedTokens = {};

  constructor(
    private readonly httpService: HttpService,
    private readonly supabaseService: SupabaseService,
    private readonly softwareDevAlertService: SoftwareDevAlertService,
    private readonly mongoAtlasService: MongoAtlasService,
  ) {}

  private async getEpicollectToken(client_id: string, client_secret: string): Promise<string> {
    const cachedToken = this.cachedTokens[client_id];

    if(cachedToken) {
      const decoded = decode(cachedToken) as JwtPayload;
      // exp is in seconds; convert it to milliseconds
      const now = Date.now();
      if(now < (decoded.exp * 1000)) {
        console.info(`[EPICOLLECT] using cached token still valid for ${ ((decoded.exp * 1000) - now) / 60000 } minutes`);
        return cachedToken;
      }
    }

    const { data: { access_token } } = await this.httpService
      .axiosRef
      .post(`${ EPICOLLECT_API }/api/oauth/token`, {
        grant_type: 'client_credentials',
        client_id,
        client_secret,
      });

    console.info('[EPICOLLECT] using freshly fetched token');
    this.cachedTokens[client_id] = access_token;

    return access_token;
  }

  private storeInMongo({ survey, customer }): Promise<unknown> {
    return this.mongoAtlasService
      .insert({
        ...MONGO_SETTINGS,
        document: {
          epicollect: survey,
          nxt: customer,
        },
      })
      .catch(err => {
        console.error(`Failed to store ${ customer.account.full_name } in MongoDB`, err);
      })
    ;
  }

  private async fetchEpicollectRecursive(slug: string, token: string, filter_from: string, page = 1): Promise<Survey[]> {
    const params = {
      page, per_page: EPICOLLECT_MAX_PAGE_SIZE,
      ...(filter_from && {
        filter_by: 'uploaded_at',
        filter_from,
      }),
    };

    const { data } = await this.httpService
      .axiosRef
      .get(`${ EPICOLLECT_API }/api/export/entries/${ slug }`, {
        headers: { Authorization: `Bearer ${ token }` },
        params,
      });

    if(data.meta.total === 0 || data.meta.current_page === data.meta.last_page) return data.data.entries;
    return [ ...data.data.entries, ...(await this.fetchEpicollectRecursive(slug, token, filter_from, data.meta.current_page + 1)) ];
  }

  private async fetchEpicollectDataByOrganization({
    epicollect_contract_survey_client_id,
    epicollect_contract_survey_secret,
    epicollect_contract_survey_slug,
    epicollect_contract_last_sync_at,
  }: OrganizationForSurveyFetching): Promise<Survey[]> {
    const bearerToken = await this.getEpicollectToken(epicollect_contract_survey_client_id, epicollect_contract_survey_secret);
    // We need to use strict ISO string, Epicollect can only handle ISO 8601 format
    // https://developers.epicollect.net/entries/entries#filtering
    const syncDate = new Date(epicollect_contract_last_sync_at).toISOString();
    return this.fetchEpicollectRecursive(epicollect_contract_survey_slug, bearerToken, syncDate);
  }

  private async applySurveyFilter(survey: Survey): Promise<undefined | Survey> {
    // We do a document type check, so we don't have to continue if this is missing (which also causes risk of duplication)
    if(!DOCUMENT_TYPE_MAP[survey.customer_id_type]) {
      console.info(`Not storing survey ${ survey.ec5_uuid } because ${ survey.customer_id_type } is not a known ID document.`);
      return;
    }

    const existingConnection = await this.supabaseService.adminClient
      .from('connections')
      .select('id')
      .eq('upload_uuid', survey.ec5_uuid)
      .maybeSingle()
      .then(this.supabaseService.handleResponse)
    ;
    if(existingConnection) return;

    return survey;
  }

  private inferMeterFees(
    { full_service_yesno, full_service_type, meter_phase }: Survey,
    { uses_dual_meter_setup, default_hps_connection_fee, default_fs_1_phase_connection_fee, default_fs_3_phase_connection_fee }: GridForFeeCalculation,
  ): {
    total_connection_fee: number,
    requested_meters: RequestedMeterDto[],
  } {
    if (!uses_dual_meter_setup) {
      const isThreePhase = (meter_phase === 'three_phase');
      const fee = isThreePhase ? default_fs_3_phase_connection_fee : default_hps_connection_fee;
      return {
        total_connection_fee: fee,
        requested_meters: [ {
          meter_type: 'HPS',
          meter_phase: isThreePhase ? 'THREE_PHASE' : 'SINGLE_PHASE',
          fee,
        } ],
      };
    }
    else {
      const hasFullService = full_service_yesno === 'yes';
      const returnObj: { total_connection_fee: number, requested_meters: RequestedMeterDto[] } = {
        total_connection_fee: 0,
        requested_meters:  [ {
          meter_type: 'HPS',
          meter_phase: 'SINGLE_PHASE',
          fee: default_hps_connection_fee,
        } ],
      };

      if (hasFullService) {
        if (full_service_type === 'three_phase') {
          returnObj.requested_meters = [ ...returnObj.requested_meters, {
            meter_type: 'FS',
            meter_phase: 'THREE_PHASE',
            fee: default_fs_3_phase_connection_fee,
          } ];
        }
        else {
          returnObj.requested_meters = [ ...returnObj.requested_meters, {
            meter_type: 'FS',
            meter_phase: 'SINGLE_PHASE',
            fee: default_fs_1_phase_connection_fee,
          } ];
        }
      }

      returnObj.total_connection_fee = addFees(returnObj.requested_meters);

      return returnObj;
    }
  }

  private async createConnection(createConnectionDto: CreateConnectionDto) {
    const existingConnection = await this.supabaseService.adminClient
      .from('connections')
      .select('id')
      .eq('upload_uuid', createConnectionDto.upload_uuid)
      .maybeSingle()
      .then(this.supabaseService.handleResponse)
    ;

    if (existingConnection) {
      console.info(`[EPICOLLECT] Not creating a connection because we already have an existing connection
        with upload uuid ${ createConnectionDto.upload_uuid }, of ID ${ existingConnection.id }`);
      return;
      // throw new ConflictException('A connection with this upload id already exists');
    }

    const { requested_meters, ...restDto } = createConnectionDto;

    try {
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
    catch {
      console.error(`[EPICOLLECT] Failed to create a connection for upload uuid ${ createConnectionDto.upload_uuid }`);
    }
  }

  private async storeSurvey(survey: Survey): Promise<{ survey: Survey, customer, connection }> {
    console.info(`Storing survey ${ survey.ec5_uuid }`);

    const grid = await this.supabaseService.adminClient
      .from('grids')
      .select(`
        id,
        organization_id,
        uses_dual_meter_setup,
        default_hps_connection_fee,
        default_fs_1_phase_connection_fee,
        default_fs_3_phase_connection_fee
      `)
      .eq('name', survey.community)
      .maybeSingle()
      .then(this.supabaseService.handleResponse)
    ;

    if(!grid) {
      console.info(`Skipping survey ${ survey.ec5_uuid } because corresponding grid ${ survey.community } could not be found`);
      return;
    }

    // Force `null` if no phone number, otherwise force +(234) number
    const parsedPhoneNumber = (survey.has_phone === 'no' || !survey.customer_phone) ? null :
      `+234${ survey.customer_phone.substring(1) }`;

    // We also need to check if the parsed phone number is valid by external standards
    let validatedPhoneNumber = isPhoneNumber(parsedPhoneNumber) ? parsedPhoneNumber : null;

    if(validatedPhoneNumber) {
      // We need to check if this phone number is already in use, or Supabase will give an error.
      // Supabase also uses the number without the '+', so we need to remove that
      const supabaseCompliantNumber = makePhoneCompliantForSupabaseFilter(validatedPhoneNumber);
      const existingAccount = await this.supabaseService.adminClient
        .from('accounts')
        .select('supabase_id')
        .eq('phone', supabaseCompliantNumber)
        .maybeSingle()
        .then(this.supabaseService.handleResponse)
      ;
      // If we have an existing account, we're going to assume that 'neighbors' have used the same phone number or that
      // the phone number is already registered to an agent or customer with multiple meters.
      // We map contracts 1-on-1 on customers, so we never add more contracts to a customer.
      // We ALWAYS create a new customer. So, we're going to have to reset phone to `null`
      if(existingAccount) validatedPhoneNumber = null;
    }

    const { total_connection_fee, requested_meters } = this.inferMeterFees(survey, grid);

    const createCustomerDto: CreateCustomerDto = {
      full_name: survey.customer_full_name,
      phone: validatedPhoneNumber,
      latitude: toSafeNumberOrNull(survey.gps_location?.latitude),
      longitude: toSafeNumberOrNull(survey.gps_location?.longitude),
      is_hidden_from_reporting: false,
      grid_id: grid.id,
      lives_primarily_in_the_community: survey.primary_residence === 'yes',
      generator_owned: survey.generator_owned === 'yes_small' ? 'SMALL' : survey.generator_owned === 'yes_large' ? 'LARGE' : null,
      gender: survey.customer_gender === 'male' ? 'MALE' : survey.customer_gender === 'female' ? 'FEMALE' : null,
      total_connection_fee,
    };

    // @TOCHECK :: We create customers via Tiamat because there's a lot of logic involved. Still, we might want to consider
    // making that a shared service so we can do it directly without intra-service calling
    const customer = await this.httpService
      .axiosRef
      .post(`${ TIAMAT_API }/user-admin/create-customer`, createCustomerDto, TIAMAT_API_OPTIONS)
      .then(({ data }) => data)
      .catch(err => {
        const telegramMessage = `⚠️ [EPICOLLECT SERVICE] Error creating customer for survey ${ survey.ec5_uuid } and organization id ${ grid.organization_id }`;
        if(process.env.NXT_ENV === 'production') {
          this.softwareDevAlertService.viaTelegram(telegramMessage);
        }
        console.error(telegramMessage, createCustomerDto, err.response?.data);
      })
    ;

    if(!customer) return;

    const createConnectionDto: CreateConnectionDto = {
      customer_id: customer.id,
      upload_uuid: survey.ec5_uuid,
      external_system: 'EPICOLLECT',
      document_type: DOCUMENT_TYPE_MAP[survey.customer_id_type],
      document_id: survey.customer_id_number,
      paid: 0, // Should this go to customer?
      currency: 'NGN', // Why do we have this?
      is_public: survey.connection_type === 'public',
      is_commercial: survey.connection_type === 'commercial' || survey.connection_type === 'hybrid',
      is_residential: survey.connection_type === 'residential' || survey.connection_type === 'hybrid',
      is_using_led_bulbs: survey.are_bulbs_led === 'yes',
      is_building_wired: survey.is_house_wired === 'yes',
      women_impacted: toSafeNumberOrZero(survey.women_impacted),
      requested_meters,
    };

    const connection = await this.createConnection(createConnectionDto);

    // const connection = await this.httpService
    //   .axiosRef
    //   .post(`${ TIAMAT_API }/connections`, createConnectionDto, TIAMAT_API_OPTIONS)
    //   .then(({ data }) => data)
    //   .catch(err => {
    //     const telegramMessage = `[EPICOLLECT SERVICE] Error creating connection for survey ${ survey.ec5_uuid }`;
    //     if(process.env.NXT_ENV === 'production') {
    //       this.softwareDevAlertService.viaTelegram(telegramMessage);
    //     }
    //     console.error(telegramMessage, createConnectionDto, err.response?.data);
    //   })
    // ;

    if(!connection) return;

    return { survey, customer, connection };
  }

  async importSingleSurvey(organizationId: number, uuid: string) {
    const organization = await this.supabaseService.adminClient
      .from('organizations')
      .select(`
        name,
        epicollect_contract_survey_client_id,
        epicollect_contract_survey_secret,
        epicollect_contract_survey_slug
      `)
      .eq('id', organizationId)
      .maybeSingle()
      .then(this.supabaseService.handleResponse)
    ;
    if(!organization) throw new NotFoundException('Could not find organization with id' + organizationId);

    const existingConnection = await this.supabaseService.adminClient
      .from('connections')
      .select('id')
      .eq('upload_uuid', uuid)
      .maybeSingle()
      .then(this.supabaseService.handleResponse)
    ;
    if(existingConnection) throw new ConflictException('Connection already imported');

    const bearerToken = await this.getEpicollectToken(organization.epicollect_contract_survey_client_id, organization.epicollect_contract_survey_secret);
    const { data } = await this.httpService
      .axiosRef
      .get(`${ EPICOLLECT_API }/api/export/entries/${ organization.epicollect_contract_survey_slug }`, {
        headers: { Authorization: `Bearer ${ bearerToken }` },
        params: { uuid },
      })
      .catch(() => {
        throw new NotFoundException(`Survey with ${ uuid } not found for organization ${ organization.name }`);
      })
    ;

    if(data.meta.total === 0) throw new NotFoundException(`Survey with ${ uuid } not found for organization ${ organization.name }`);

    const survey = data.data.entries[0];
    const imported = await this.storeSurvey(survey);

    if(!imported) throw new UnprocessableEntityException('Couldn\'t import survey, please check the phone number.');
    return { 'success': true };
  }

  async importSurveysForSingleOrganization(organizationId: number) {
    const { adminClient: supabase, handleResponse } = this.supabaseService;

    // Terrible `bind` stuff :: (╯°□°)╯︵ ┻sǝssɐʅϽ ʇdᴉɹɔSǝdʎꓕ┻
    const _applySurveyFilter = this.applySurveyFilter.bind(this);
    const _storeSurvey = this.storeSurvey.bind(this);
    // const _storeInMongo = this.storeInMongo.bind(this);

    const organization = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        epicollect_contract_survey_client_id,
        epicollect_contract_survey_secret,
        epicollect_contract_survey_slug,
        epicollect_contract_last_sync_at
      `)
      .eq('id', organizationId)
      .not('epicollect_contract_survey_client_id', 'is', null)
      .not('epicollect_contract_survey_secret', 'is', null)
      .not('epicollect_contract_survey_slug', 'is', null)
      .maybeSingle()
      .then(handleResponse)
    ;

    if(!organization) throw new NotFoundException('Can\'t find an organization with valid Epicollect credentials');
    console.info(`[EPICOLLECT] Going to import surveys for ${ organization.name }`);

    try {
      const newSurveys = await this.fetchEpicollectDataByOrganization(organization);
      const surveysToStore = (await Promise.all(newSurveys.map(_applySurveyFilter))).filter(Boolean);

      // @TODO :: When a 'user + account + customer + connection creation' fails,
      // Create a mechanism to check by upload id, so we can skip already created ones
      /* const storedSurveys =  */await Promise.all(surveysToStore.map(_storeSurvey));
      console.info(`[EPICOLLECT] ${ surveysToStore.length } surveys were stored for ${ organization.name }`);

      await supabase
        .from('organizations')
        .update({
          epicollect_contract_last_sync_at: (new Date()).toISOString(),
        })
        .eq('id', organizationId)
        .then(handleResponse)
      ;

      // Also store the surveys in Mongo for backup
      // @MONGO :: Canceled all Mongo
      // await Promise.allSettled(storedSurveys.filter(Boolean).map(_storeInMongo));

      return { 'success': true };
    }
    catch(err) {
      console.error(`[EPICOLLECT] Failed to import surveys for ${ organization.name }`, err.message, err.response?.statusText);
      throw new InternalServerErrorException(`Something went wrong trying to import surveys for ${ organization.name }`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR, { disabled: NXT_ENV !== 'production' })
  async importSurveys() {
    console.info('[EPICOLLECT] Trying to import connections...');

    if (this.isEpicollectImportRunning) {
      console.info('[EPICOLLECT] Skipping import because a session is already running...');
      return;
    }

    this.isEpicollectImportRunning = true;

    const organizations = await this.supabaseService.adminClient
      .from('organizations')
      .select('id')
      .not('epicollect_contract_survey_client_id', 'is', null)
      .not('epicollect_contract_survey_secret', 'is', null)
      .not('epicollect_contract_survey_slug', 'is', null)
      .order('epicollect_contract_last_sync_at')
      .limit(9)
      .then(this.supabaseService.handleResponse)
    ;

    const organizationIds = organizations.map(({ id }) => id);

    await mapAsyncSequential(this.importSurveysForSingleOrganization, { context: this })(organizationIds);

    this.isEpicollectImportRunning = false;
  }

  async checkDiscrepancies() {
    const connections = await this.supabaseService.adminClient
      .from('connections')
      .select(`
        id,
        customer:customers(
          total_connection_fee,
          account:accounts(
            full_name
          ),
          grid:grid_id(
            id,
            name
          )
        ),
        meters(
          id
        ),
        connection_requested_meters(
          fee
        )
      `)
      .then(this.supabaseService.handleResponse)
    ;

    const TEST_GRID_IDS = [ 10 ];

    const totalDiscrepancyCount = connections
      .filter(({ customer }) => !!customer)
      .filter(({ customer }) => !TEST_GRID_IDS.includes(customer.grid.id))
      .map(connection => {
        const { id, meters, connection_requested_meters, customer } = connection;

        const customerFee = customer.total_connection_fee;
        const computedFee = addFees(connection_requested_meters);

        const hasComputedFeeDiscrepancy = computedFee !== customerFee;
        const numMeters = meters.length;
        const reqMeters = connection_requested_meters.length;

        if(
          hasComputedFeeDiscrepancy
          && (numMeters !== 0 || reqMeters !== 0)
        ) {
          console.info(`Customer fee: ${ customerFee }; Computed fee: ${ computedFee }`);
          console.info(`Connection ID: ${ id }; Grid: ${ connection.customer.grid.name }; Customer: ${ connection.customer.account.full_name }`);
          console.info(`# Meters: ${ numMeters }; # Requested: ${ reqMeters }`);
          console.info(' ');
          return 1;
        }

        return 0;
      })
      .reduce((total: number, num: number) => total + num, 0);

    console.info('');
    console.info('Total number of discrepancies:', totalDiscrepancyCount);
    console.info('');
  }
}
