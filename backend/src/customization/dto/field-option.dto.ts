import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class FieldOptionDto {
  @Transform(trim)
  @IsString()
  @Length(1, 120)
  label!: string;
}
