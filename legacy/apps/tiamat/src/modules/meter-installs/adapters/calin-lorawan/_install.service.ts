import { Injectable } from '@nestjs/common';
import { MeterForNsDeregistration, MeterForNsRegistration } from '../../dto/meter-for-ns-registration.dto';

@Injectable()
export class CalinLorawanInstallService {
  async registerOnNetworkServer(dto: MeterForNsRegistration) {
    const _devEui = dto.external_reference.padStart(16, '0');
    // ChirpStack registerDevice / setApplicationKeyForDevice lived in
    // device-messages/lib/chirpstack-repository. Skyfox meter-installs still
    // calls that client; sidecar exposes POST /plugin/provisioning.
    return { deferUntilAsynchronousCallback: false };
  }

  async deregisterOnNetworkServer(_dto: MeterForNsDeregistration) {
    // We don't deregister LoRaWAN meters, since they're free to communicate with any system
    return { deferUntilAsynchronousCallback: false };
  }
}
