import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { BudgetLeadsService } from './budget-leads.service';
import { ListBudgetLeadsQueryDto } from './dto/list-budget-leads-query.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';

@UseGuards(AuthGuard, AdminGuard)
@Controller('admin/budget-leads')
export class BudgetLeadsAdminController {
  constructor(private readonly budgetLeadsService: BudgetLeadsService) {}

  @Get()
  list(@Query() query: ListBudgetLeadsQueryDto) {
    return this.budgetLeadsService.list(query);
  }

  @Get('metrics')
  metrics() {
    return this.budgetLeadsService.metrics();
  }

  @Patch(':id/status')
  async updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLeadStatusDto) {
    const lead = await this.budgetLeadsService.updateStatus(id, dto.status);
    return { lead };
  }
}
