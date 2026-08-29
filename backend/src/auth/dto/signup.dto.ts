import { Transform } from 'class-transformer';
import { IsString, Length, Matches, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class SignupDto {
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  name!: string;

  @Transform(trim)
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'username may only contain letters, numbers, and underscores',
  })
  username!: string;

  @Transform(trim)
  @IsString()
  @Length(6, 20)
  phone!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
