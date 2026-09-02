import { IsIn } from 'class-validator';

export class UpdateBakedCakeStatusDto {
  @IsIn(['active', 'paused'])
  status!: 'active' | 'paused';
}
