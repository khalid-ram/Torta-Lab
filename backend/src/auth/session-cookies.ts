import { CookieOptions, Response } from 'express';
import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from './session-tokens.service';

export const ACCESS_TOKEN_COOKIE = 'tl_access_token';
export const REFRESH_TOKEN_COOKIE = 'tl_refresh_token';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

function baseCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    // The frontend (Vercel) and backend (Railway) are different sites in
    // production, so the cookie must be SameSite=None to survive a
    // cross-site fetch; browsers require Secure whenever SameSite=None.
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    path: '/',
  };
}

export function setSessionCookies(res: Response, tokens: SessionTokens): void {
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...baseCookieOptions(),
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
  });
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...baseCookieOptions(),
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  });
}

export function clearSessionCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, baseCookieOptions());
  res.clearCookie(REFRESH_TOKEN_COOKIE, baseCookieOptions());
}
