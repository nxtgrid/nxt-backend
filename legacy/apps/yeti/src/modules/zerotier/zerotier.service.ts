import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ZerotierDatapoint } from '../router-snapshot-1-min/types/zerotier-datapoint';

@Injectable()
export class ZerotierService {

  constructor(
    private readonly httpService: HttpService,
  ) {}

  //from https://docs.zerotier.com/central/v1/#tag/network-member/operation/getNetworkMemberList
  // note: pagination does not seem to be supported
  async getNodes(): Promise<ZerotierDatapoint[]> {
    const { ZEROTIER_API, ZEROTIER_TOKEN, ZEROTIER_NETWORK } = process.env;

    const result = await this.httpService
      .axiosRef
      // https://api.zerotier.com/api/v1/network/3efa5cb78a7eb6b9/member
      .get(`${ ZEROTIER_API }/network/${ ZEROTIER_NETWORK }/member`, { headers: { Authorization: `Token ${ ZEROTIER_TOKEN }` } });
    return result.data;
  }
}
