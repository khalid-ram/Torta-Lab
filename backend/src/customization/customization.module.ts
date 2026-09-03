import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdminGuard } from '../common/guards/admin.guard';
import { CustomizationAdminController } from './customization.admin.controller';
import { CustomizationPublicController } from './customization.public.controller';
import { CustomizationService } from './customization.service';

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [CustomizationAdminController, CustomizationPublicController],
  providers: [CustomizationService, AdminGuard],
})
export class CustomizationModule {}
