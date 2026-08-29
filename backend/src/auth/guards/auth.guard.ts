import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService, AuthenticatedUser } from '../auth.service';
import { SessionTokenService } from '../session-tokens.service';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, clearSessionCookies, setSessionCookies } from '../session-cookies';

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly sessionTokens: SessionTokenService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const accessToken: string | undefined = req.cookies?.[ACCESS_TOKEN_COOKIE];
    const refreshToken: string | undefined = req.cookies?.[REFRESH_TOKEN_COOKIE];

    if (!accessToken && !refreshToken) {
      throw new UnauthorizedException('Not authenticated.');
    }

    let userId = accessToken ? this.sessionTokens.verifyAccessToken(accessToken) : null;

    if (!userId) {
      if (!refreshToken) {
        throw new UnauthorizedException('Session expired.');
      }
      const refreshedUserId = this.sessionTokens.verifyRefreshToken(refreshToken);
      if (!refreshedUserId) {
        clearSessionCookies(res);
        throw new UnauthorizedException('Session expired.');
      }
      setSessionCookies(res, {
        accessToken: this.sessionTokens.signAccessToken(refreshedUserId),
        refreshToken: this.sessionTokens.signRefreshToken(refreshedUserId),
      });
      userId = refreshedUserId;
    }

    const user = await this.authService.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException('Not authenticated.');
    }
    if (!user.is_active) {
      throw new ForbiddenException('This account has been deactivated.');
    }

    (req as AuthenticatedRequest).user = user;
    return true;
  }
}
