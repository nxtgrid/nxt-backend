import { Injectable } from '@nestjs/common';
import { getPackageInfo } from '@nxt/core';

@Injectable()
export class AppService {
  getHealth(): { name: string; version: string } {
    return getPackageInfo();
  }
}
