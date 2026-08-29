import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AuthError, PostgrestError } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { normalizeEmail, normalizePhone, normalizeUsername } from '../common/utils/normalize';
import { SignupDto } from './dto/signup.dto';

export interface SignupResponse {
  user: {
    id: string;
    name: string;
    username: string;
    phone: string;
    email: string | null;
    role: 'buyer';
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async signup(dto: SignupDto): Promise<SignupResponse> {
    const username = normalizeUsername(dto.username);
    const phone = normalizePhone(dto.phone);
    const email = dto.email ? normalizeEmail(dto.email) : null;

    if (!phone) {
      throw new BadRequestException('Invalid phone number.');
    }

    await this.assertUnique({ username, phone, email });

    const client = this.supabaseService.getClient();

    const { data: authData, error: authError } = await client.auth.admin.createUser({
      phone,
      password: dto.password,
      phone_confirm: true,
      user_metadata: { role: 'buyer' },
      ...(email ? { email, email_confirm: true } : {}),
    });

    if (authError || !authData?.user) {
      throw this.mapAuthCreationError(authError);
    }

    const authUser = authData.user;

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .insert({
        id: authUser.id,
        name: dto.name,
        username,
        phone,
        email,
        role: 'buyer',
        is_active: true,
      })
      .select('id, name, username, phone, email, role')
      .single();

    if (profileError || !profile) {
      await this.rollbackAuthUser(authUser.id, profileError);
      throw this.mapProfileError(profileError);
    }

    return { user: profile as SignupResponse['user'] };
  }

  private async assertUnique(fields: { username: string; phone: string; email: string | null }) {
    const client = this.supabaseService.getClient();

    const { data: byUsername } = await client
      .from('profiles')
      .select('id')
      .eq('username', fields.username)
      .maybeSingle();
    if (byUsername) {
      throw new ConflictException('Username is already taken.');
    }

    const { data: byPhone } = await client
      .from('profiles')
      .select('id')
      .eq('phone', fields.phone)
      .maybeSingle();
    if (byPhone) {
      throw new ConflictException('Phone number is already registered.');
    }

    if (fields.email) {
      const { data: byEmail } = await client
        .from('profiles')
        .select('id')
        .eq('email', fields.email)
        .maybeSingle();
      if (byEmail) {
        throw new ConflictException('Email is already registered.');
      }
    }
  }

  private async rollbackAuthUser(authUserId: string, cause: PostgrestError | null): Promise<void> {
    const client = this.supabaseService.getClient();
    const { error } = await client.auth.admin.deleteUser(authUserId);
    if (error) {
      this.logger.error(
        `Rollback failed for auth user ${authUserId} after profile insert error (${cause?.code}): ${error.message}`,
      );
    }
  }

  private mapAuthCreationError(error: AuthError | null): BadRequestException | ConflictException | InternalServerErrorException {
    if (error && (error.status === 422 || /already (been )?registered|already exists/i.test(error.message))) {
      return new ConflictException('Phone or email is already registered.');
    }
    this.logger.error(`Supabase auth user creation failed: ${error?.message}`);
    return new InternalServerErrorException('Unable to complete signup.');
  }

  private mapProfileError(error: PostgrestError | null): ConflictException | InternalServerErrorException {
    if (error?.code === '23505') {
      return new ConflictException('Username, phone, or email is already registered.');
    }
    this.logger.error(`Profile creation failed after auth user was created: ${error?.message}`);
    return new InternalServerErrorException('Unable to complete signup.');
  }
}
