import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdminGuard } from '../common/guards/admin.guard';
import { BakedCakesAdminController } from './baked-cakes.admin.controller';
import { BakedCakesPublicController } from './baked-cakes.public.controller';
import { BakedCakesService } from './baked-cakes.service';

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [BakedCakesAdminController, BakedCakesPublicController],
  providers: [BakedCakesService, AdminGuard],
})
export class BakedCakesModule {}
