import { Global, Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';

@Global()
@Module({
  providers: [ OrganizationsService ],
  controllers: [ OrganizationsController ],
})
export class OrganizationsModule { }
