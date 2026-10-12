import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { LEAD_STATUSES, type LeadStatus } from './update-lead-status.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export class ListBudgetLeadsQueryDto {
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
  @IsIn(['all', ...LEAD_STATUSES])
  status: 'all' | LeadStatus = 'all';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minBudget?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxBudget?: number;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;
}
