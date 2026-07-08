import { Controller, /* Post, Body, */ UseGuards/* , Get, Param, ParseIntPipe */ } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { AuthenticationGuard } from '../auth/authentication.guard';

@UseGuards(AuthenticationGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(protected readonly service: OrganizationsService) {}

  // This is used by Flow XO to look for organzations
  // @Get(':id')
  // getOrganization(
  //   @Param('id', ParseIntPipe) id: number,
  // ) {
  //   // @TODO :: Check if we need this one
  //   console.info(`
  //     =================================================================
  //     =================================================================
  //                     GET ORGANIZATION ${ id } IS CALLED
  //     =================================================================
  //     =================================================================
  //   `);
  //   return this.service.findOne(id);
  // }
}
