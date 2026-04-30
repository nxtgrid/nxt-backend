import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';

@Injectable()
export class EpicollectService {
  constructor(private readonly httpService: HttpService) {}

  syncOneSurvey(body) {
    return this.httpService
      .axiosRef
      .post(`${ process.env.LOCH_API }/epicollect/sync-one-survey`, body)
      .then(({ data }) => data)
      .catch(err => {
        console.error('[EPICOLLECT] Error syncing survey', err);
        throw new HttpException(err.response?.data?.message ?? err.message, 500);
      })
    ;
  }

  syncOneOrganization(body) {
    return this.httpService
      .axiosRef
      .post(`${ process.env.LOCH_API }/epicollect/sync-one-organization`, body)
      .then(({ data }) => data)
      .catch(err => {
        console.error('[EPICOLLECT] Error syncing organization', err);
        throw new HttpException(err.response?.data?.message ?? err.message, 500);
      })
    ;
  }

  syncAll() {
    return this.httpService
      .axiosRef
      .get(`${ process.env.LOCH_API }/epicollect/sync`)
      .then(({ data }) => data)
      .catch(err => {
        console.error('[EPICOLLECT] Error doing full sync', err);
        throw new HttpException(err.response?.data?.message ?? err.message, 500);
      })
    ;
  }
}
