import { Injectable, OnModuleInit } from '@nestjs/common';
import { CalinConcentrator } from '../../dcu-snapshot-1-min/dto/calin-concentrator';
import { CalinService } from '@core/modules/calin/calin.service';

const grpc = require('@grpc/grpc-js');
const gateway_grpc = require('@chirpstack/chirpstack-api/api/gateway_grpc_pb');
const gateway_pb = require('@chirpstack/chirpstack-api/api/gateway_pb');

@Injectable()
export class CalinLorawanService extends CalinService implements OnModuleInit {
  gatewayClient: any;

  onModuleInit() {

    this.gatewayClient = new gateway_grpc.GatewayServiceClient(
      process.env.CHIRPSTACK_API_URL,
      grpc.credentials.createInsecure(),
    );
  }

  private fetchPage(limit: number, offset: number) {
    const listRequest = new gateway_pb.ListGatewaysRequest();
    listRequest.setLimit(limit);
    listRequest.setOffset(offset);

    const metadata = new grpc.Metadata();
    metadata.set('authorization', `Bearer ${ process.env.CHIRPSTACK_API_TOKEN }`);
    return new Promise((resolve, reject) => {
      this.gatewayClient.list(listRequest, metadata, (err, res) => {
        if (err !== null) return reject(err);

        // TODO: is there a smarter way of doing this?
        return resolve({ total_count: res.getTotalCount(), array: res.getResultList() });
      });
    });
  }

  async getConcentrators(): Promise<CalinConcentrator[]> {
    const limit: number = 100;
    let page: number = 0; let res: any;
    const concentrators: CalinConcentrator[] = [];
    do {
      res = await this.fetchPage(limit, page++ * limit);
      const concList = res.array.map(item => ({
        is_online: item.getState() === 1,
        external_reference: item.getGatewayId(),
      }));
      concentrators.push(...concList);
    } while(concentrators.length < res.totalCount);

    return concentrators;
  }
}
