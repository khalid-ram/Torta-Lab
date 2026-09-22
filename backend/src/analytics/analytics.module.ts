import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdminGuard } from '../common/guards/admin.guard';
import { AnalyticsPublicController } from './analytics.public.controller';
import { AnalyticsAdminController } from './analytics.admin.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [AnalyticsPublicController, AnalyticsAdminController],
  providers: [AnalyticsService, AdminGuard],
})
export class AnalyticsModule {}
