import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { AnalyticsService } from './analytics.service';
import { AnalyticsOverviewQueryDto } from './dto/overview-query.dto';

@UseGuards(AuthGuard, AdminGuard)
@Controller('admin/analytics')
export class AnalyticsAdminController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview(@Query() query: AnalyticsOverviewQueryDto) {
    return this.analyticsService.getOverview(query);
  }
}
