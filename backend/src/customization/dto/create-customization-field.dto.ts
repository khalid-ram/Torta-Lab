import { Transform, Type } from 'class-transformer';
import { ArrayMinSize, IsBoolean, IsIn, IsOptional, IsString, Length, ValidateIf, ValidateNested } from 'class-validator';
import { FieldOptionDto } from './field-option.dto';
import { CORE_STEP_KEYS, CoreStepKey } from '../core-step-keys';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export type FieldType = 'text' | 'number' | 'selection';
export type SelectionMode = 'single' | 'multi';
export type PlacementType = 'core_step' | 'separate_step';

export class CreateCustomizationFieldDto {
  @Transform(trim)
  @IsString()
  @Length(2, 150)
  label!: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsBoolean()
  isRequired!: boolean;

  @IsIn(['text', 'number', 'selection'])
  fieldType!: FieldType;

  // Required exactly when fieldType is 'selection'; the service also
  // re-checks this, since a DTO-level @ValidateIf cannot itself forbid
  // the field from being sent for non-selection types.
  @ValidateIf((dto: CreateCustomizationFieldDto) => dto.fieldType === 'selection')
  @IsIn(['single', 'multi'])
  selectionMode?: SelectionMode;

  @ValidateIf((dto: CreateCustomizationFieldDto) => dto.fieldType === 'selection')
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => FieldOptionDto)
  options?: FieldOptionDto[];

  @IsIn(['core_step', 'separate_step'])
  placementType!: PlacementType;

  // "Same Step": render inline on this existing Core Step.
  @ValidateIf((dto: CreateCustomizationFieldDto) => dto.placementType === 'core_step')
  @IsIn(CORE_STEP_KEYS)
  coreStepKey?: CoreStepKey;

  // "Separate Step": becomes its own step, positioned right after this Core Step.
  @ValidateIf((dto: CreateCustomizationFieldDto) => dto.placementType === 'separate_step')
  @IsIn(CORE_STEP_KEYS)
  afterCoreStepKey?: CoreStepKey;
}
