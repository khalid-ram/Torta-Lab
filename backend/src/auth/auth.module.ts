import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { SessionTokenService } from './session-tokens.service';

@Module({
  imports: [
    SupabaseModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('SESSION_JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, SessionTokenService],
  // AuthGuard's own dependencies must also be exported: a module that
  // reuses AuthGuard via @UseGuards() needs to resolve its full
  // constructor graph, not just the guard class itself.
  exports: [AuthGuard, AuthService, SessionTokenService],
})
export class AuthModule {}
