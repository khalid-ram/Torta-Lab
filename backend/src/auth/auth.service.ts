import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PostgrestError } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { normalizePhone, normalizeUsername } from '../common/utils/normalize';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { SessionTokenService } from './session-tokens.service';
import { SessionTokens } from './session-cookies';

const BCRYPT_COST_FACTOR = 12;

export interface UserRecord {
  id: string;
  name: string;
  username: string;
  phone: string;
  password_hash: string;
  role: 'buyer' | 'admin';
  is_active: boolean;
}

export type AuthenticatedUser = Omit<UserRecord, 'password_hash'>;
export type PublicUser = Omit<AuthenticatedUser, 'is_active'>;

export interface AuthResult {
  user: PublicUser;
  session: SessionTokens;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly sessionTokens: SessionTokenService,
  ) {}

  async signup(dto: SignupDto): Promise<AuthResult> {
    const username = normalizeUsername(dto.username);
    const phone = normalizePhone(dto.phone);

    if (!phone) {
      throw new BadRequestException('Invalid phone number.');
    }

    await this.assertUnique({ username, phone });

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST_FACTOR);
    const client = this.supabaseService.getClient();

    const { data: user, error } = await client
      .from('users')
      .insert({
        name: dto.name,
        username,
        phone,
        password_hash: passwordHash,
        role: 'buyer',
        is_active: true,
      })
      .select('id, name, username, phone, role')
      .single();

    if (error || !user) {
      throw this.mapInsertError(error);
    }

    return this.issueSession(user as PublicUser);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const username = normalizeUsername(dto.username);
    const client = this.supabaseService.getClient();

    const { data: user, error } = await client
      .from('users')
      .select('id, name, username, phone, password_hash, role, is_active')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to look up user for login: ${error.message}`);
    }
    if (!user) {
      throw this.invalidCredentials();
    }

    const record = user as UserRecord;
    const passwordMatches = await bcrypt.compare(dto.password, record.password_hash);
    if (!passwordMatches) {
      throw this.invalidCredentials();
    }

    if (!record.is_active) {
      throw new ForbiddenException('This account has been deactivated.');
    }

    const { password_hash: _hash, is_active: _isActive, ...publicUser } = record;
    return this.issueSession(publicUser);
  }

  async findUserById(id: string): Promise<AuthenticatedUser | null> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('users')
      .select('id, name, username, phone, role, is_active')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      this.logger.error(`Failed to look up user ${id}: ${error.message}`);
    }
    return (data as AuthenticatedUser | null) ?? null;
  }

  private issueSession(user: PublicUser): AuthResult {
    return {
      user,
      session: {
        accessToken: this.sessionTokens.signAccessToken(user.id),
        refreshToken: this.sessionTokens.signRefreshToken(user.id),
      },
    };
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException('Invalid username or password.');
  }

  private async assertUnique(fields: { username: string; phone: string }) {
    const client = this.supabaseService.getClient();

    const { data: byUsername } = await client
      .from('users')
      .select('id')
      .eq('username', fields.username)
      .maybeSingle();
    if (byUsername) {
      throw new ConflictException('Username is already taken.');
    }

    const { data: byPhone } = await client
      .from('users')
      .select('id')
      .eq('phone', fields.phone)
      .maybeSingle();
    if (byPhone) {
      throw new ConflictException('Phone number is already registered.');
    }
  }

  private mapInsertError(error: PostgrestError | null): ConflictException | InternalServerErrorException {
    if (error?.code === '23505') {
      return new ConflictException('Username or phone is already registered.');
    }
    this.logger.error(`Failed to create user: ${error?.message}`);
    return new InternalServerErrorException('Unable to complete signup.');
  }
}
