import { Transform, Type } from 'class-transformer';
import { ArrayMinSize, IsBoolean, IsIn, IsOptional, IsString, Length, ValidateIf, ValidateNested } from 'class-validator';
import { FieldOptionDto } from './field-option.dto';
import { FieldType, PlacementType, SelectionMode } from './create-customization-field.dto';
import { CORE_STEP_KEYS, CoreStepKey } from '../core-step-keys';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class UpdateCustomizationFieldDto {
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Length(2, 150)
  label?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsIn(['text', 'number', 'selection'])
  fieldType?: FieldType;

  @ValidateIf((dto: UpdateCustomizationFieldDto) => dto.fieldType === 'selection')
  @IsIn(['single', 'multi'])
  selectionMode?: SelectionMode;

  @ValidateIf((dto: UpdateCustomizationFieldDto) => dto.fieldType === 'selection')
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => FieldOptionDto)
  options?: FieldOptionDto[];

  @IsOptional()
  @IsIn(['core_step', 'separate_step'])
  placementType?: PlacementType;

  @ValidateIf((dto: UpdateCustomizationFieldDto) => dto.placementType === 'core_step')
  @IsIn(CORE_STEP_KEYS)
  coreStepKey?: CoreStepKey;

  @ValidateIf((dto: UpdateCustomizationFieldDto) => dto.placementType === 'separate_step')
  @IsIn(CORE_STEP_KEYS)
  afterCoreStepKey?: CoreStepKey;
}
