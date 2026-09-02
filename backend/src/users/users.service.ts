import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { UserRecord } from '../auth/auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { escapeIlikeTerm } from '../common/utils/postgrest-search';
import { normalizePhone, normalizeUsername } from '../common/utils/normalize';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export type AdminUserRecord = Omit<UserRecord, 'password_hash'> & {
  created_at: string;
  updated_at: string;
};

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ADMIN_USER_COLUMNS = 'id, name, username, phone, role, is_active, created_at, updated_at';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async list(query: ListUsersQueryDto): Promise<{ data: AdminUserRecord[]; pagination: Pagination }> {
    const client = this.supabaseService.getClient();
    let builder = client.from('users').select(ADMIN_USER_COLUMNS, { count: 'exact' });

    if (query.role !== 'all') {
      builder = builder.eq('role', query.role);
    }
    if (query.status !== 'all') {
      builder = builder.eq('is_active', query.status === 'active');
    }
    if (query.search?.trim()) {
      const term = escapeIlikeTerm(query.search.trim());
      builder = builder.or(`name.ilike."%${term}%",username.ilike."%${term}%",phone.ilike."%${term}%"`);
    }

    const from = (query.page - 1) * query.limit;
    const to = from + query.limit - 1;

    const { data, error, count } = await builder.order('created_at', { ascending: false }).range(from, to);

    if (error) {
      this.logger.error(`Failed to list users: ${error.message}`);
      throw new InternalServerErrorException('Unable to load users.');
    }

    const total = count ?? 0;
    return {
      data: (data ?? []) as AdminUserRecord[],
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string): Promise<AdminUserRecord> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.from('users').select(ADMIN_USER_COLUMNS).eq('id', id).maybeSingle();

    if (error) {
      this.logger.error(`Failed to load user ${id}: ${error.message}`);
      throw new InternalServerErrorException('Unable to load user.');
    }
    if (!data) {
      throw new NotFoundException('User not found.');
    }
    return data as AdminUserRecord;
  }

  async updateStatus(id: string, isActive: boolean, currentAdminId: string): Promise<AdminUserRecord> {
    if (id === currentAdminId && !isActive) {
      throw new BadRequestException('You cannot deactivate your own account.');
    }

    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('users')
      .update({ is_active: isActive })
      .eq('id', id)
      .select(ADMIN_USER_COLUMNS)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to update status for user ${id}: ${error.message}`);
      throw new InternalServerErrorException('Unable to update user status.');
    }
    if (!data) {
      throw new NotFoundException('User not found.');
    }
    return data as AdminUserRecord;
  }

  async updateProfile(id: string, dto: UpdateUserDto): Promise<AdminUserRecord> {
    const update: Partial<Pick<UserRecord, 'name' | 'username' | 'phone'>> = {};

    if (dto.name !== undefined) {
      update.name = dto.name;
    }
    if (dto.username !== undefined) {
      update.username = normalizeUsername(dto.username);
    }
    if (dto.phone !== undefined) {
      const normalizedPhone = normalizePhone(dto.phone);
      if (!normalizedPhone) {
        throw new BadRequestException('Invalid phone number.');
      }
      update.phone = normalizedPhone;
    }

    if (Object.keys(update).length === 0) {
      throw new BadRequestException('No fields to update.');
    }

    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('users')
      .update(update)
      .eq('id', id)
      .select(ADMIN_USER_COLUMNS)
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException('Username or phone is already registered.');
      }
      this.logger.error(`Failed to update user ${id}: ${error.message}`);
      throw new InternalServerErrorException('Unable to update user.');
    }
    if (!data) {
      throw new NotFoundException('User not found.');
    }
    return data as AdminUserRecord;
  }
}
