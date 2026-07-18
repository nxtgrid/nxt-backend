import { Injectable } from '@nestjs/common';
import { chirpStackRepo } from '@tiamat/modules/device-messages/lib/chirpstack-repository';
import { MeterForNsDeregistration, MeterForNsRegistration } from '../../dto/meter-for-ns-registration.dto';

@Injectable()
export class CalinLorawanInstallService {
  async registerOnNetworkServer(dto: MeterForNsRegistration) {
    const devEui = dto.external_reference.padStart(16, '0');
    const { is_new_registration } = await chirpStackRepo.registerDevice(devEui, dto.external_reference);
    // If this is a freshly new registration, add the application key
    if(is_new_registration) await chirpStackRepo.generateApplicationKeyForDevice(devEui);

    return { deferUntilAsynchronousCallback: false };
  }

  async deregisterOnNetworkServer(_dto: MeterForNsDeregistration) {
    // We don't deregister LoRaWAN meters, since they're free to communicate with any system
    return { deferUntilAsynchronousCallback: false };
  }
}
