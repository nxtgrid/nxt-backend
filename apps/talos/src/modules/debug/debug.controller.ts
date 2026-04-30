import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { basename, join } from 'path';
import { existsSync } from 'fs';

@Controller('__debug')
export class DebugController {
  private readonly folder = '/var/tmp';

  @Get('image/:name')
  getImage(@Param('name') name: string, @Res() res: Response) {
    // sanitize input to avoid path traversal
    const safeName = basename(name);
    const filePath = join(this.folder, safeName);

    if (!existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

    res.sendFile(filePath, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    });
  }
}
