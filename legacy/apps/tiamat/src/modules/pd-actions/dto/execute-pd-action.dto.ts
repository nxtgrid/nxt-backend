import { IsInt, IsString } from 'class-validator';

export class ExecutePdActionDto {
  @IsInt()
    id: number;

  @IsString()
    command: 'mark_as_successul';
}
