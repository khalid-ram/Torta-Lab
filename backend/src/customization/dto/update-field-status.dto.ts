import { IsIn } from 'class-validator';

export class UpdateFieldStatusDto {
  @IsIn(['active', 'paused'])
  status!: 'active' | 'paused';
}
