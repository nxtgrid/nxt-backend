import { IsNumber, IsString } from 'class-validator';

export class CreatePdFlowDto {
  @IsNumber()
    pd_flow_template_id: number;

  @IsNumber()
    pd_site_id: number;

  @IsString()
    title: string;
}
