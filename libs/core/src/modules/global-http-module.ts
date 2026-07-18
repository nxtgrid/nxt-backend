import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';

/** Global Nest `HttpModule` (`@nestjs/axios`) for Foundation outbound HTTP. */
@Global()
@Module({
  imports: [ HttpModule ],
  exports: [ HttpModule ],
})
export class GlobalHttpModule {}
