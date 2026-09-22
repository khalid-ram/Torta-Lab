import { IsDateString, IsIn, IsOptional } from 'class-validator';

export type AnalyticsPeriod = 'today' | 'last7' | 'last30' | 'custom';

export class AnalyticsOverviewQueryDto {
  @IsIn(['today', 'last7', 'last30', 'custom'])
  period!: AnalyticsPeriod;

  // Required only when period = 'custom'; plain YYYY-MM-DD calendar
  // dates interpreted in the one Africa/Cairo reporting timezone (see
  // common/utils/cairo-time.ts) — never the requesting admin's own
  // browser timezone.
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
