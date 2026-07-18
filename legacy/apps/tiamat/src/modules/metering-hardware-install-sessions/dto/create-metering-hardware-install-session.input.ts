export class CreateMeteringHardwareInstallSessionInput {
  meter_id?: number;
  dcu_id?: number;
  author_id: number;
  last_metering_hardware_import_id?: number;
  last_meter_commissioning_id?: number;
}
