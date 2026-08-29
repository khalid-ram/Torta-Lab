import { Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { SupabaseTokenVerifier } from './supabase-token-verifier';

@Module({
  providers: [SupabaseService, SupabaseTokenVerifier],
  exports: [SupabaseService, SupabaseTokenVerifier],
})
export class SupabaseModule {}
