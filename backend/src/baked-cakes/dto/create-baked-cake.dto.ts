import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';
import { OCCASION_VALUES, type Occasion } from '../occasions';
import { toNullableMoney } from './nullable-money';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
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

  @IsBoolean()
  is_available_to_order!: boolean;

  @IsIn(['active', 'paused'])
  status!: 'active' | 'paused';

  @IsIn(['image', 'video'])
  media_type!: 'image' | 'video';

  // The media was already uploaded straight to Storage via a signed
  // upload URL (see requestUploadUrl) before this request is sent — this
  // is just the path, re-validated server-side in baked-cakes.service.ts
  // before anything is written to the database.
  @IsString()
  @Length(1, 500)
  mediaPath!: string;

  // Required only when media_type is 'video' — enforced in the service,
  // not here, since the rule depends on another field.
  @IsOptional()
  @IsString()
  @Length(1, 500)
  thumbnailPath?: string;

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
