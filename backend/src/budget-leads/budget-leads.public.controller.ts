import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard, seconds } from '@nestjs/throttler';
import { BudgetLeadsService } from './budget-leads.service';
import { SubmitBudgetLeadDto } from './dto/submit-budget-lead.dto';

// No auth guard — this is the public lead-capture endpoint, deliberately
// reachable while logged out. ThrottlerGuard + a tight per-IP limit is
// the abuse guard instead.
@UseGuards(ThrottlerGuard)
@Controller('budget-leads')
export class BudgetLeadsPublicController {
  constructor(private readonly budgetLeadsService: BudgetLeadsService) {}

  @Throttle({ default: { limit: 5, ttl: seconds(60) } })
  @Post()
  submit(@Body() dto: SubmitBudgetLeadDto) {
    return this.budgetLeadsService.submit(dto);
  }
}
