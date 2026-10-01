import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';
import { OCCASION_VALUES, type Occasion } from '../occasions';
import { toNullableMoney } from './nullable-money';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
// multipart/form-data always arrives as strings; coerce the boolean text
// NestJS gets from the form field into a real boolean before validation.
const toBoolean = ({ value }: { value: unknown }) => (value === undefined ? undefined : value === true || value === 'true');
const toOptionalTrimmed = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

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

  // Optional: an empty/omitted occasion simply means no badge shows
  // publicly, it is not an error.
  @IsOptional()
  @Transform(toOptionalTrimmed)
  @IsIn(OCCASION_VALUES)
  occasion?: Occasion;

  // Admin-only production cost. Never returned by the public API.
  @IsOptional()
  @Transform(toNullableMoney)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cost?: number | null;

  // The public-facing price. null = not entered, 0 = intentionally free.
  @IsOptional()
  @Transform(toNullableMoney)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  recommended_selling_price?: number | null;

  // Admin-only. null = unknown/not recorded, 0 = given away for free —
  // these are NOT the same and must stay distinguishable end to end.
  @IsOptional()
  @Transform(toNullableMoney)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  actual_selling_price?: number | null;
}
