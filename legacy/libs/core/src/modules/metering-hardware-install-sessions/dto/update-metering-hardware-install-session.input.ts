import { PartialType } from '@nestjs/mapped-types';
import { CreateMeteringHardwareInstallSessionInput } from './create-metering-hardware-install-session.input';

export class UpdateMeteringHardwareInstallSessionInput extends PartialType(CreateMeteringHardwareInstallSessionInput) {
  id: number;
}
