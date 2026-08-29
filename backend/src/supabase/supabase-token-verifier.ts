import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JWTPayload, createRemoteJWKSet, jwtVerify } from 'jose';

@Injectable()
export class SupabaseTokenVerifier {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(configService: ConfigService) {
    const supabaseUrl = configService.getOrThrow<string>('SUPABASE_URL');
    const jwksUrl = new URL('/auth/v1/.well-known/jwks.json', supabaseUrl);
    this.jwks = createRemoteJWKSet(jwksUrl);
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, this.jwks);
    return payload;
  }
}
