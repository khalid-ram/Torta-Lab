import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle, ThrottlerGuard, seconds } from '@nestjs/throttler';
import { AuthService, AuthenticatedUser } from '../auth/auth.service';
import { SessionTokenService } from '../auth/session-tokens.service';
import { ACCESS_TOKEN_COOKIE, setSessionCookies } from '../auth/session-cookies';
import { BudgetLeadsService } from './budget-leads.service';
import { SubmitBudgetLeadDto } from './dto/submit-budget-lead.dto';

// No auth guard — reachable while logged out. ThrottlerGuard + a tight
// per-IP limit is the abuse guard instead. A valid session (if any) is
// resolved best-effort below so a logged-in customer never has to
// re-enter their own name/phone.
@UseGuards(ThrottlerGuard)
@Controller('budget-leads')
export class BudgetLeadsPublicController {
  constructor(
    private readonly budgetLeadsService: BudgetLeadsService,
    private readonly authService: AuthService,
    private readonly sessionTokens: SessionTokenService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: seconds(60) } })
  @Post()
  async submit(@Body() dto: SubmitBudgetLeadDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const authenticatedUser = await this.resolveOptionalUser(req);
    const { leadId, recommendations, session } = await this.budgetLeadsService.submit(dto, authenticatedUser);
    if (session) {
      setSessionCookies(res, session);
    }
    return { leadId, recommendations };
  }

  private async resolveOptionalUser(req: Request): Promise<AuthenticatedUser | null> {
    try {
      const accessToken: string | undefined = req.cookies?.[ACCESS_TOKEN_COOKIE];
      if (!accessToken) return null;
      const userId = this.sessionTokens.verifyAccessToken(accessToken);
      if (!userId) return null;
      const user = await this.authService.findUserById(userId);
      return user?.is_active ? user : null;
    } catch {
      return null;
    }
  }
}
