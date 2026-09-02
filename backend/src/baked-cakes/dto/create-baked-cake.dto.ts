import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsString, Length } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
// multipart/form-data always arrives as strings; coerce the boolean text
// NestJS gets from the form field into a real boolean before validation.
const toBoolean = ({ value }: { value: unknown }) => (value === undefined ? undefined : value === true || value === 'true');

export class CreateBakedCakeDto {
  @Transform(trim)
  @IsString()
  @Length(2, 150)
  name!: string;

  @Transform(trim)
  @IsString()
  @Length(2, 2000)
  description!: string;

  @Transform(toBoolean)
  @IsBoolean()
  is_available_to_order!: boolean;

  @IsIn(['active', 'paused'])
  status!: 'active' | 'paused';

  @IsIn(['image', 'video'])
  media_type!: 'image' | 'video';
}
