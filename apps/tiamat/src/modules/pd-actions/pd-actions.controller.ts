import { Controller, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthenticationGuard } from '../auth/authentication.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { PdActionsService } from './pd-actions.service';
import { CurrentUser, NxtSupabaseUser } from '../auth/nxt-supabase-user';

@UseGuards(AuthenticationGuard)
@Controller('pd-actions')
export class PdActionsController {
  constructor(
    private readonly pdActionsService: PdActionsService,
  ) {}

  // Endpoint to process a pd action
  // @Post(':id/exec')
  // command(
  //   @CurrentUser() author: NxtSupabaseUser,
  //   @Body() command,
  // ) {
  //   return this.pdActionsService.execute(command, author);
  // }

  @Post(':id/exec')
  @UseInterceptors(FileInterceptor('file'))
  async exec(
    @CurrentUser() author: NxtSupabaseUser,
    @Param('id') actionId: number,
    @UploadedFile() uploadedFile: Express.Multer.File, //This endpoint needs to be able to handle uploads, since one of the options can be an upload
  ) {
    return this.pdActionsService.exec(actionId, author, uploadedFile);
  }

  // TODO: remove, this is just for testing purposes
  @Post(':id/test')
  test(
    @Param('id') actionId: number,
    @CurrentUser() author: NxtSupabaseUser,
  ) {
    return this.pdActionsService.generateNewState(actionId, author);
  }
}
