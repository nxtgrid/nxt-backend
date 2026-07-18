import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MongoAtlasService {

  constructor(
    private readonly httpService: HttpService,
  ) { }

  insert(data) {
    const string = JSON.stringify(data);
    return this.httpService
      .axiosRef
      .post(`${ process.env.MONGO_ATLAS_API }/action/insertOne`, string, {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Request-Headers': '*',
          'api-key': `${ process.env.MONGO_ATLAS_API_KEY }`,
        } })
      .then(({ data }) => data);
  }
}
