import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// Mirrors SignupDto's validation rules so profile edits stay consistent
// with signup. Only these three fields are whitelisted for admin edits;
// role and is_active are never accepted here.
export class UpdateUserDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'username may only contain letters, numbers, and underscores',
  })
  username?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(6, 20)
  phone?: string;
}
