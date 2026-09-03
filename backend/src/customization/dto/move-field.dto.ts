import { IsIn } from 'class-validator';

export class MoveFieldDto {
  @IsIn(['up', 'down'])
  direction!: 'up' | 'down';
}
