import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

type TokenType = 'access' | 'refresh';

interface TokenPayload {
  sub: string;
  type: TokenType;
}

// Sole owner of JWT signing/verification. Tokens carry only the user id
// and their own type; role/is_active are never trusted from the token
// and must always be re-loaded from public.users by the caller.
@Injectable()
export class SessionTokenService {
  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(userId: string): string {
    return this.jwtService.sign({ sub: userId, type: 'access' } satisfies TokenPayload, {
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
  }

  signRefreshToken(userId: string): string {
    return this.jwtService.sign({ sub: userId, type: 'refresh' } satisfies TokenPayload, {
      expiresIn: REFRESH_TOKEN_TTL_SECONDS,
    });
  }

  verifyAccessToken(token: string): string | null {
    return this.verify(token, 'access');
  }

  verifyRefreshToken(token: string): string | null {
    return this.verify(token, 'refresh');
  }

  private verify(token: string, expectedType: TokenType): string | null {
    try {
      const payload = this.jwtService.verify<TokenPayload>(token);
      if (payload.type !== expectedType || typeof payload.sub !== 'string') {
        return null;
      }
      return payload.sub;
    } catch {
      return null;
    }
  }
}
