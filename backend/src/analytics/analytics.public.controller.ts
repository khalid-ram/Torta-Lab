import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { SessionTokenService } from '../auth/session-tokens.service';
import { ACCESS_TOKEN_COOKIE } from '../auth/session-cookies';
import { AnalyticsService } from './analytics.service';
import { StartSessionDto } from './dto/start-session.dto';
import { SessionHeartbeatDto } from './dto/session-heartbeat.dto';
import { TrackEventDto } from './dto/track-event.dto';

// No AuthGuard on purpose: anonymous visitors are the majority of
// traffic and must be measurable without signing up (see the V1 spec —
// "Sessions must work before authentication"). A logged-in visitor's
// own users.id is attached on a best-effort basis only; it is never
// required and never blocks the request if resolution fails.
@Controller('analytics')
export class AnalyticsPublicController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly authService: AuthService,
    private readonly sessionTokens: SessionTokenService,
  ) {}

  @Post('sessions')
  @HttpCode(204)
  async startSession(@Body() dto: StartSessionDto, @Req() req: Request): Promise<void> {
    const userId = await this.resolveOptionalUserId(req);
    await this.analyticsService.startSession(dto, userId);
  }

  @Patch('sessions/:id/heartbeat')
  @HttpCode(204)
  async heartbeat(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SessionHeartbeatDto): Promise<void> {
    await this.analyticsService.heartbeat(id, dto);
  }

  @Post('events')
  @HttpCode(204)
  async trackEvent(@Body() dto: TrackEventDto): Promise<void> {
    await this.analyticsService.trackEvent(dto);
  }

  private async resolveOptionalUserId(req: Request): Promise<string | null> {
    try {
      const accessToken: string | undefined = req.cookies?.[ACCESS_TOKEN_COOKIE];
      if (!accessToken) return null;
      const userId = this.sessionTokens.verifyAccessToken(accessToken);
      if (!userId) return null;
      const user = await this.authService.findUserById(userId);
      return user?.is_active ? user.id : null;
    } catch {
      return null;
    }
  }
}
