import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const toBoolean = ({ value }: { value: unknown }) => (value === undefined ? undefined : value === true || value === 'true');

// All fields optional: an edit only sends what actually changed. Media
// files (if any) travel alongside this as multipart fields, handled by
// the controller/service, not validated here.
export class UpdateBakedCakeDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, 150)
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, 2000)
  description?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  is_available_to_order?: boolean;

  @IsOptional()
  @IsIn(['active', 'paused'])
  status?: 'active' | 'paused';

  @IsOptional()
  @IsIn(['image', 'video'])
  media_type?: 'image' | 'video';
}
