import { Module } from '@nestjs/common';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdminGuard } from '../common/guards/admin.guard';
import { BudgetLeadsAdminController } from './budget-leads.admin.controller';
import { BudgetLeadsPublicController } from './budget-leads.public.controller';
import { BudgetLeadsService } from './budget-leads.service';

@Module({
  imports: [
    AuthModule,
    SupabaseModule,
    // Module-scoped default; the public submit route overrides it
    // tighter via @Throttle.
    ThrottlerModule.forRoot([{ ttl: seconds(60), limit: 20 }]),
  ],
  controllers: [BudgetLeadsAdminController, BudgetLeadsPublicController],
  providers: [BudgetLeadsService, AdminGuard],
})
export class BudgetLeadsModule {}
