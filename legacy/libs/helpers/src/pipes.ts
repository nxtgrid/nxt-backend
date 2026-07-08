import { PipeTransform, Injectable } from '@nestjs/common';

@Injectable()
export class ParseDatePipe implements PipeTransform {
  transform(value: any) {
    return new Date(value);
  }
}

export const ParseBoolPipe = ({ value }) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};
