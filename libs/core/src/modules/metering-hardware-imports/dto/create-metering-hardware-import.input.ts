import { MhiOperationEnum, MhiStatusEnum } from '@core/types/supabase-types';

export class CreateMeteringHardwareImportInput {
  metering_hardware_install_session_id: number;
  metering_hardware_import_status: MhiStatusEnum;
  metering_hardware_import_operation: MhiOperationEnum;
}
