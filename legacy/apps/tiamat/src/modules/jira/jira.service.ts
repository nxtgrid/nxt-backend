import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { Issue } from '@core/modules/issues/entities/issue.entity';
import { Grid } from '@core/modules/grids/entities/grid.entity';
import { Meter } from '@core/modules/meters/entities/meter.entity';
import moment from 'moment';
import { mapAsyncSequential } from '@helpers/promise-helpers';

const FRONTEND_BASE_URL = 'pegasus-frontend-url';

const JIRA_CODES = {
  PRODUCTION: {
    ID: 10005,
    PROJECT_KEY: 'OPS',
    ISSUE_TYPES: {
      EQUIPMENT_OR_COMMS_ISSUE: 10032,
      ELECTRICITY_SERVICE_DISRUPTION: 10033,
      PAYMENT_SYSTEM_ISSUE: 10028,
    },
    DEVELOPER_FIELD_KEY: 'customfield_10120',
    METER_FIELD_KEY: 'customfield_10121',
    GRID_FIELD_KEY: 'customfield_10059',
  },
  STAGING: {
    ID: 10006,
    PROJECT_KEY: 'SBOXTOPS',
    ISSUE_TYPES: {
      EQUIPMENT_OR_COMMS_ISSUE: 10041,
      ELECTRICITY_SERVICE_DISRUPTION: 10040,
      PAYMENT_SYSTEM_ISSUE: 10042,
    },
    DEVELOPER_FIELD_KEY: 'customfield_10083',
    METER_FIELD_KEY: 'customfield_10074',
    GRID_FIELD_KEY: 'customfield_10080',
  },
};

// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-custom-field-options/#api-rest-api-3-customfieldoption-id-get
@Injectable()
export class JiraService {
  constructor(
    private readonly httpService: HttpService,
  ) {}

  // todo: what's going to happen when we scale tiamat horizontally?
  // we need to check what the rate limits are, and make sure that we stay below those
  // see: https://developer.atlassian.com/cloud/jira/platform/rate-limiting/#scaling-by-users
  async createMany(issues: Issue[]): Promise<Issue[]> {
    const createAndAppendExternalReference = issue => this.create(issue)
      .then(res => {
        issue.external_reference = res?.data?.key;
        return res;
      })
      .catch(err => {
        console.error('Error creating Jira issues', err?.response?.data?.errors);
      });

    await mapAsyncSequential(createAndAppendExternalReference)(issues);
    return issues;
  }

  formatIssueTypeToHumanReadable(issue: Issue): string {
    const issueType = issue.issue_type;
    const meter = issue.meter;

    if (!meter) throw new HttpException(`Could not find a corresponding meter for issue ${ issue.id } when adding issue to Jira`, 500);

    const grid: Grid = meter.connection?.customer?.grid;

    if (!grid) throw new HttpException(`Could find grid corresponding to meter ${ meter.external_reference }`, 500);

    const prefixString = `${ grid.name }: meter ${ meter.external_reference } `;
    switch (issueType) {
      case 'METER_NOT_ACTIVATED':
        return prefixString + 'was not activated';
      case 'NO_COMMUNICATION':
        return prefixString + 'is not communicating';
      case 'NO_CREDIT':
        return prefixString + 'has no credit';
      case 'TAMPER':
        return prefixString + 'is being tampered with';
      case 'UNEXPECTED_POWER_LIMIT':
        return prefixString + `has a ${ meter.power_limit }W power limit, when it's supposed to be ${ meter.power_limit_should_be }W`;
      case 'UNEXPECTED_METER_STATUS':
        return prefixString + `is ${ (issue.meter.is_on) ? 'on' : 'off' }, but it should be ${ (issue.meter.should_be_on) ? 'on' : 'off' }`;
      default:
        return prefixString + `has an unclear issue (issue type is ${ issueType } internally).`;
    }
  }

  async create(issue: Issue): Promise<any> {
    // there is a bulk endpoint, but the api makes it very hard to associate a local id
    // to an id of an issue in the bulk endpoint, so for now we'll go with single calls
    const issueTitle: string = this.formatIssueTypeToHumanReadable(issue);

    if(!issueTitle) throw new HttpException(`Could not retrieve all data necessary to create the issue for issue ${ issue.id }`, 500);
    const jiraCodes = (process.env.NXT_ENV === 'production') ? JIRA_CODES.PRODUCTION : JIRA_CODES.STAGING;
    // it's always a meter issue for now
    const jiraIssueType: number = jiraCodes.ISSUE_TYPES.EQUIPMENT_OR_COMMS_ISSUE;
    const meter: Meter = issue.meter;
    const customer = meter.connection.customer;
    const projectKey = jiraCodes.PROJECT_KEY;

    const newIssue = {
      'fields': {
        'description': {
          'content': [
            {
              'content': [
                {
                  'text': `${ issueTitle }. More info can be found on `,
                  'type': 'text',
                },
                {
                  'type': 'text',
                  'text': 'Ayrton',
                  'marks': [
                    {
                      'type': 'link',
                      'attrs': {
                        'href': `${ FRONTEND_BASE_URL }/grid/${ issue.meter.connection.customer.grid.id }/meter/${ issue.meter.id }`,
                        'title': `Meter ${ issue.meter.external_reference }`,
                      },
                    },
                  ],
                },
                {
                  'text': `. Outage started on ${ moment(issue.started_at).format('DD/MM/YYYY HH:mm:ss') } Affected customer: ${ customer.account.full_name } (${ customer.account.phone })`,
                  'type': 'text',
                },
              ],
              'type': 'paragraph',
            },
          ],
          'type': 'doc',
          'version': 1,
        },
        'issuetype': {
          'id': `${ jiraIssueType }`,
        },
        'project': {
          'key': projectKey,
        },
        'summary': `${ issueTitle }`,
      },
    };

    // set grid
    newIssue.fields[jiraCodes.GRID_FIELD_KEY] = {
      value: meter.connection.customer.grid.name,
    };

    // set developer
    newIssue.fields[jiraCodes.DEVELOPER_FIELD_KEY] = {
      value: meter.connection.customer.grid.organization.name,
    };
    // set meter
    newIssue.fields[jiraCodes.METER_FIELD_KEY] = meter.external_reference;

    // return this.httpService
    //   .axiosRef
    //   .post(`${ process.env.JIRA_API }/issue`, newIssue, { auth: { username: process.env.JIRA_API_USERNAME, password: process.env.JIRA_API_KEY } });
    return null;
  }

  async commentMany(issues: Issue[], comment: string) {
    for (const i of issues) {
      // TODO: add parsing of state into jira state
      // const targetStatus = JiraTransition.DONE;
      // we do it with a loop to avoid flooding jira; also there is no endpoint
      // for jira to bulk transition
      try {
        await this.comment(i, comment);
      }
      catch (err) {
        console.error(`Caught exception when commenting jira ticket ${ i.external_reference }`);
        console.error(err);
      }

    }
  }

  comment(issue: Issue, comment: string) {
    if (!issue.external_reference) {
      return;
    }

    // we are forced to use a different api here, because of a bug in the jira api.
    // more info at https://jira.atlassian.com/browse/JSDCLOUD-7997
    return this.httpService
      .axiosRef
      .post(`${ process.env.JIRA_SERVICE_DESK_API }/request/${ issue.external_reference }/comment`, {
        'body': comment,
        'public': false, //we want this to be an internal note
      }, { auth: { username: process.env.JIRA_API_USERNAME, password: process.env.JIRA_API_KEY } })
      .catch(() => `some error occurred when trying to comment issue with external ref ${ issue.external_reference }`);
  }

  // transition(issue: Issue, jiraTransition: JiraTransition) {
  //   if (!issue.external_reference) {
  //     return;
  //   }

  //   return this.httpService
  //     .post(`${ process.env.JIRA_API }/issue/${ issue.external_reference }/transitions`, {
  //       'transition': {
  //         'id': jiraTransition,
  //       },
  //     }, { headers: { 'Authorization': `Basic ${ process.env.JIRA_API_KEY }` } });
  // }

  // WORK IN PROGRESS
  // todo: to implement in order to store updates from jira
  // this function checks if the update is interesting (ie it belongs to the right project)
  // and then calls the issuesService to update the db entity
  // async updateLocal(body: any) {
  //   const issue: any = body['issue'];

  //   const dbIssue: Issue = await this.issuesService.findByExternalReferenceAndExternalSystem(issue['id'], ExternalSystem.JIRA);

  //   // if the issue is not found, then just return
  //   if (!dbIssue) {
  //     return;
  //   }

  // todo: need to add the call to the the update function.
  //   return;
  // }

  encodeBase64String(string: string) {
    return Buffer.from(string).toString('base64');
  }
}
