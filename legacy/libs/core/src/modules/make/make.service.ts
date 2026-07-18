import { HttpService } from '@nestjs/axios';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { RateLimit } from 'async-sema';

@Injectable()
export class MakeService implements OnModuleInit {
  private rateLimit;

  constructor(
      private readonly httpService: HttpService,
  ) {}

  onModuleInit() {
    this.rateLimit = RateLimit(1);
  }

  async schedule(method: 'POST', endpoint: string, data?: any) {
    await this.rateLimit();

    const { axiosRef } = this.httpService;
    const url = `${ process.env.MAKE_API_URL }${ endpoint }`;
    const headers = { 'Content-Type': 'application/json' };

    return axiosRef({ method, url, data, headers });
  }
}
