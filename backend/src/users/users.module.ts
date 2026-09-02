import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdminGuard } from '../common/guards/admin.guard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [UsersController],
  providers: [UsersService, AdminGuard],
})
export class UsersModule {}
