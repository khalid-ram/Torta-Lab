import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export type StatusFilter = 'all' | 'active' | 'paused';
export type AvailabilityFilter = 'all' | 'available' | 'unavailable';
export type MediaFilter = 'all' | 'image' | 'video';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export class ListBakedCakesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = DEFAULT_PAGE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit: number = DEFAULT_LIMIT;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['all', 'active', 'paused'])
  status: StatusFilter = 'all';

  @IsOptional()
  @IsIn(['all', 'available', 'unavailable'])
  availability: AvailabilityFilter = 'all';

  @IsOptional()
  @IsIn(['all', 'image', 'video'])
  media: MediaFilter = 'all';
}
