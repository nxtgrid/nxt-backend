import { Module } from '@nestjs/common';

import { UserAdminController } from './user-admin.controller.js';
import { UserAdminService } from './user-admin.service.js';

@Module({
  controllers: [ UserAdminController ],
  providers: [ UserAdminService ],
  exports: [ UserAdminService ],
})
export class UserAdminModule {}
