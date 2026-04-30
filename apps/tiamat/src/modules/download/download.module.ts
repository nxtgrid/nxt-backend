import { Global, Module } from '@nestjs/common';
import { DownloadService } from './download.service';

@Global()
@Module({
  providers: [ DownloadService ],
  exports: [ DownloadService ],
})
export class DownloadModule {}
