import { IssueStatusEnum, IssueTypeEnum, MhiStatusEnum } from '@core/types/supabase-types';

export const replaceCommas = (val: string) => typeof val === 'string' ? val.replace(/,/g, '') : val;

interface LastInstall {
  last_metering_hardware_import: {
    metering_hardware_import_status: MhiStatusEnum
  }
  last_meter_commissioning: {
    created_at: string
    meter_commissioning_status: MhiStatusEnum
  }
}

interface LastIssue {
  issue_status: IssueStatusEnum
  issue_type: IssueTypeEnum
}

export const inferCustomerGender = ({ gender }): string =>
  gender === 'MALE' ? 'Male' : gender === 'FEMALE' ? 'Female' : 'Undisclosed';

export const inferCustomerCategory = ({ is_public, is_residential, is_commercial }) => {
  if(is_commercial) return 'Commercial';
  if(is_residential) return 'Residential';
  if(is_public) return 'Public';
  return 'UNKNOWN';
};

export const inferCustomerType = ({ generator_owned }): string =>
  generator_owned === 'LARGE' ? 'Large' : generator_owned === 'SMALL' ? 'Medium' : 'Small';

export const inferDateConnected = (lastInstall: LastInstall) => {
  const date = lastInstall?.last_meter_commissioning?.created_at;
  if(!date) return '';
  return date.split('T')[0] + 'T00:00:00'; // @TODO :: Check
};

export const inferMeterStatus = (lastInstall: LastInstall, lastIssue: LastIssue) => {
  if(!lastInstall) return 'No installation data available';
  const { last_metering_hardware_import, last_meter_commissioning } = lastInstall;

  if(last_metering_hardware_import.metering_hardware_import_status !== 'SUCCESSFUL')
    return `Meter import: ${ last_metering_hardware_import.metering_hardware_import_status }`;

  if(last_meter_commissioning.meter_commissioning_status !== 'SUCCESSFUL')
    return `Meter commissioning: ${ last_meter_commissioning.meter_commissioning_status }`;

  if(lastIssue?.issue_status === 'OPEN')
    return `Open issue: ${ lastIssue.issue_type }`;

  return '';
};
