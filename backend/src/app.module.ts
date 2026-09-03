import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { HealthController } from './health/health.controller';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BakedCakesModule } from './baked-cakes/baked-cakes.module';
import { CustomizationModule } from './customization/customization.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    SupabaseModule,
    AuthModule,
    UsersModule,
    BakedCakesModule,
    CustomizationModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
