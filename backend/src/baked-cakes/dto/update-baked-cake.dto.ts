import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';
import { OCCASION_VALUES, type Occasion } from '../occasions';
import { toNullableMoney } from './nullable-money';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const toBoolean = ({ value }: { value: unknown }) => (value === undefined ? undefined : value === true || value === 'true');
// Distinct from create's toOptionalTrimmed: here an empty string means
// "the admin cleared the Occasion field", which must still reach the
// service as a real value (null) rather than vanish as undefined —
// this form always resubmits every field, so "not present" never
// happens in practice, but mapping to null (not undefined) keeps the
// clear-the-field intent explicit either way.
const toOptionalOccasion = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

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

  @IsOptional()
  @Transform(toOptionalOccasion)
  @IsIn(OCCASION_VALUES)
  occasion?: Occasion | null;

  @IsOptional()
  @Transform(toNullableMoney)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cost?: number | null;

  @IsOptional()
  @Transform(toNullableMoney)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  recommended_selling_price?: number | null;

  @IsOptional()
  @Transform(toNullableMoney)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  actual_selling_price?: number | null;
}
