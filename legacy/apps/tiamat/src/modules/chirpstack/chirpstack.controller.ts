import { Controller, UseGuards } from '@nestjs/common';
import { AuthenticationGuard } from '../auth/authentication.guard';

/**
 * CALIN ChirpStack ingress lived here (`POST /chirpstack/calin` → device-messages).
 * Ported to nxt-device-messaging `POST /ingress/calin-chirpstack`.
 */
@UseGuards(AuthenticationGuard)
@Controller('chirpstack')
export class ChirpstackController {}
