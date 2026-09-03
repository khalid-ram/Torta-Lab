import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCustomizationFieldDto, FieldType, SelectionMode } from './dto/create-customization-field.dto';
import { UpdateCustomizationFieldDto } from './dto/update-customization-field.dto';
import { CORE_STEP_KEYS, CoreStepKey } from './core-step-keys';

export type FieldStatus = 'active' | 'paused';
export type PlacementType = 'core_step' | 'separate_step';

interface OptionRow {
  id: string;
  label: string;
  order_index: number;
}

interface FieldRow {
  id: string;
  label: string;
  description: string | null;
  is_required: boolean;
  field_type: FieldType;
  selection_mode: SelectionMode | null;
  status: FieldStatus;
  placement_type: PlacementType;
  core_step_key: CoreStepKey | null;
  after_core_step_key: CoreStepKey | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  customization_field_options: OptionRow[] | null;
}

export interface AdminFieldOption {
  id: string;
  label: string;
}

export interface AdminField {
  id: string;
  label: string;
  description: string | null;
  isRequired: boolean;
  fieldType: FieldType;
  selectionMode: SelectionMode | null;
  status: FieldStatus;
  placementType: PlacementType;
  coreStepKey: CoreStepKey | null;
  afterCoreStepKey: CoreStepKey | null;
  order: number;
  options: AdminFieldOption[];
  createdAt: string;
  updatedAt: string;
}

export interface PublicCustomizationField {
  id: string;
  label: string;
  description: string | null;
  required: boolean;
  type: FieldType;
  selectionMode: SelectionMode | null;
  options: { id: string; label: string }[] | null;
  placementType: PlacementType;
  coreStepKey: CoreStepKey | null;
  afterCoreStepKey: CoreStepKey | null;
  order: number;
}

const FIELD_SELECT =
  'id, label, description, is_required, field_type, selection_mode, status, placement_type, core_step_key, after_core_step_key, order_index, created_at, updated_at, customization_field_options(id, label, order_index)';

@Injectable()
export class CustomizationService {
  private readonly logger = new Logger(CustomizationService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async listFields(): Promise<AdminField[]> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.from('customization_fields').select(FIELD_SELECT);

    if (error) {
      this.logger.error(`Failed to list customization fields: ${error.message}`);
      throw new InternalServerErrorException('Unable to load customization fields.');
    }

    return this.sortForAdmin((data ?? []) as FieldRow[]).map((row) => this.toAdminField(row));
  }

  async findOneField(id: string): Promise<AdminField> {
    const row = await this.getFieldRow(id);
    return this.toAdminField(row);
  }

  async createField(dto: CreateCustomizationFieldDto): Promise<AdminField> {
    this.assertSelectionPayloadValid(dto.fieldType, dto.selectionMode, dto.options);

    const client = this.supabaseService.getClient();
    const orderIndex = await this.nextOrderIndex(dto.placementType, dto.coreStepKey, dto.afterCoreStepKey);

    const { data: field, error } = await client
      .from('customization_fields')
      .insert({
        label: dto.label,
        description: dto.description || null,
        is_required: dto.isRequired,
        field_type: dto.fieldType,
        selection_mode: dto.fieldType === 'selection' ? dto.selectionMode : null,
        placement_type: dto.placementType,
        core_step_key: dto.placementType === 'core_step' ? dto.coreStepKey : null,
        after_core_step_key: dto.placementType === 'separate_step' ? dto.afterCoreStepKey : null,
        order_index: orderIndex,
      })
      .select('id')
      .single();

    if (error || !field) {
      this.logger.error(`Failed to create customization field: ${error?.message}`);
      throw new InternalServerErrorException('Unable to create customization field.');
    }

    if (dto.fieldType === 'selection' && dto.options) {
      await this.replaceOptions(field.id as string, dto.options.map((o) => o.label));
    }

    return this.findOneField(field.id as string);
  }

  async updateField(id: string, dto: UpdateCustomizationFieldDto): Promise<AdminField> {
    const existing = await this.getFieldRow(id);
    const wasSelection = existing.field_type === 'selection';
    const targetType = dto.fieldType ?? existing.field_type;

    // The selection mode carries over only when the field was already a
    // selection field and the admin isn't explicitly changing it; a field
    // newly becoming a selection field must declare one.
    const targetSelectionMode = dto.selectionMode ?? (wasSelection ? existing.selection_mode : undefined);

    if (targetType === 'selection') {
      if (!targetSelectionMode) {
        throw new BadRequestException('Selection mode is required for selection fields.');
      }
      if (dto.options !== undefined) {
        this.assertOptionsValid(dto.options.map((o) => o.label));
      } else if (!wasSelection) {
        throw new BadRequestException('At least 2 options are required for selection fields.');
      }
      // dto.options undefined and wasSelection true: existing options are kept as-is.
    }

    const update: Record<string, unknown> = {};
    if (dto.label !== undefined) update.label = dto.label;
    if (dto.description !== undefined) update.description = dto.description || null;
    if (dto.isRequired !== undefined) update.is_required = dto.isRequired;
    if (dto.fieldType !== undefined) update.field_type = dto.fieldType;
    if (targetType === 'selection') {
      update.selection_mode = targetSelectionMode;
    } else if (dto.fieldType !== undefined) {
      update.selection_mode = null;
    }

    if (dto.placementType !== undefined) {
      const samePlacement =
        dto.placementType === existing.placement_type &&
        (dto.placementType === 'core_step' ? dto.coreStepKey === existing.core_step_key : dto.afterCoreStepKey === existing.after_core_step_key);

      if (!samePlacement) {
        update.placement_type = dto.placementType;
        update.core_step_key = dto.placementType === 'core_step' ? dto.coreStepKey : null;
        update.after_core_step_key = dto.placementType === 'separate_step' ? dto.afterCoreStepKey : null;
        update.order_index = await this.nextOrderIndex(dto.placementType, dto.coreStepKey, dto.afterCoreStepKey);
      }
    }

    const client = this.supabaseService.getClient();
    if (Object.keys(update).length > 0) {
      const { error } = await client.from('customization_fields').update(update).eq('id', id);
      if (error) {
        this.logger.error(`Failed to update customization field ${id}: ${error.message}`);
        throw new InternalServerErrorException('Unable to update customization field.');
      }
    }

    if (targetType === 'selection' && dto.options !== undefined) {
      await this.replaceOptions(id, dto.options.map((o) => o.label));
    } else if (targetType !== 'selection' && existing.field_type === 'selection') {
      await this.replaceOptions(id, []);
    }

    return this.findOneField(id);
  }

  async updateStatus(id: string, status: FieldStatus): Promise<AdminField> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('customization_fields')
      .update({ status })
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to update status for customization field ${id}: ${error.message}`);
      throw new InternalServerErrorException('Unable to update customization field status.');
    }
    if (!data) {
      throw new NotFoundException('Customization field not found.');
    }
    return this.findOneField(id);
  }

  async deleteField(id: string): Promise<void> {
    await this.getFieldRow(id);
    const client = this.supabaseService.getClient();
    const { error } = await client.from('customization_fields').delete().eq('id', id);
    if (error) {
      this.logger.error(`Failed to delete customization field ${id}: ${error.message}`);
      throw new InternalServerErrorException('Unable to delete customization field.');
    }
  }

  async moveField(id: string, direction: 'up' | 'down'): Promise<AdminField[]> {
    const client = this.supabaseService.getClient();
    const field = await this.getFieldRow(id);

    let siblingsQuery = client
      .from('customization_fields')
      .select('id, order_index')
      .eq('placement_type', field.placement_type)
      .order('order_index', { ascending: true });
    siblingsQuery =
      field.placement_type === 'core_step'
        ? siblingsQuery.eq('core_step_key', field.core_step_key as string)
        : siblingsQuery.eq('after_core_step_key', field.after_core_step_key as string);

    const { data: siblingsData, error: siblingsError } = await siblingsQuery;
    if (siblingsError) {
      this.logger.error(`Failed to load sibling fields: ${siblingsError.message}`);
      throw new InternalServerErrorException('Unable to reorder customization field.');
    }

    const siblings = siblingsData ?? [];
    const index = siblings.findIndex((s) => s.id === id);
    const neighborIndex = direction === 'up' ? index - 1 : index + 1;

    if (neighborIndex >= 0 && neighborIndex < siblings.length) {
      const neighbor = siblings[neighborIndex];
      await client.from('customization_fields').update({ order_index: neighbor.order_index }).eq('id', id);
      await client.from('customization_fields').update({ order_index: field.order_index }).eq('id', neighbor.id);
    }
    // Already at the top/bottom of its placement group: no-op.

    return this.listFields();
  }

  async listPublic(): Promise<{ fields: PublicCustomizationField[] }> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.from('customization_fields').select(FIELD_SELECT).eq('status', 'active');

    if (error) {
      this.logger.error(`Failed to load public customization config: ${error.message}`);
      throw new InternalServerErrorException('Unable to load customization options.');
    }

    const fields = this.sortForAdmin((data ?? []) as FieldRow[]).map((f) => ({
      id: f.id,
      label: f.label,
      description: f.description,
      required: f.is_required,
      type: f.field_type,
      selectionMode: f.selection_mode,
      options:
        f.field_type === 'selection'
          ? [...(f.customization_field_options ?? [])].sort((a, b) => a.order_index - b.order_index).map((o) => ({ id: o.id, label: o.label }))
          : null,
      placementType: f.placement_type,
      coreStepKey: f.core_step_key,
      afterCoreStepKey: f.after_core_step_key,
      order: f.order_index,
    }));

    return { fields };
  }

  private toAdminField(row: FieldRow): AdminField {
    return {
      id: row.id,
      label: row.label,
      description: row.description,
      isRequired: row.is_required,
      fieldType: row.field_type,
      selectionMode: row.selection_mode,
      status: row.status,
      placementType: row.placement_type,
      coreStepKey: row.core_step_key,
      afterCoreStepKey: row.after_core_step_key,
      order: row.order_index,
      options: [...(row.customization_field_options ?? [])]
        .sort((a, b) => a.order_index - b.order_index)
        .map((o) => ({ id: o.id, label: o.label })),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Deterministic admin display order: Core Steps in their fixed
  // sequence, each step's core_step-attached fields first (in their own
  // order), then any separate_step fields anchored after it (in their
  // own order) — i.e. exactly the sequence the customer will see.
  private sortForAdmin(rows: FieldRow[]): FieldRow[] {
    const result: FieldRow[] = [];
    for (const key of CORE_STEP_KEYS) {
      result.push(
        ...rows.filter((r) => r.placement_type === 'core_step' && r.core_step_key === key).sort((a, b) => a.order_index - b.order_index),
      );
      result.push(
        ...rows
          .filter((r) => r.placement_type === 'separate_step' && r.after_core_step_key === key)
          .sort((a, b) => a.order_index - b.order_index),
      );
    }
    return result;
  }

  private async getFieldRow(id: string): Promise<FieldRow> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.from('customization_fields').select(FIELD_SELECT).eq('id', id).maybeSingle();

    if (error) {
      this.logger.error(`Failed to load customization field ${id}: ${error.message}`);
      throw new InternalServerErrorException('Unable to load customization field.');
    }
    if (!data) {
      throw new NotFoundException('Customization field not found.');
    }
    return data as FieldRow;
  }

  private assertSelectionPayloadValid(
    fieldType: FieldType,
    selectionMode: SelectionMode | undefined,
    options: { label: string }[] | undefined,
  ): void {
    if (fieldType !== 'selection') return;
    if (!selectionMode) {
      throw new BadRequestException('Selection mode is required for selection fields.');
    }
    this.assertOptionsValid((options ?? []).map((o) => o.label));
  }

  private assertOptionsValid(labels: string[]): void {
    const nonBlank = labels.map((l) => l.trim()).filter((l) => l.length > 0);
    if (nonBlank.length < 2) {
      throw new BadRequestException('Selection fields require at least 2 valid options.');
    }
  }

  private async nextOrderIndex(
    placementType: PlacementType,
    coreStepKey: CoreStepKey | undefined,
    afterCoreStepKey: CoreStepKey | undefined,
  ): Promise<number> {
    const client = this.supabaseService.getClient();
    let query = client.from('customization_fields').select('order_index').eq('placement_type', placementType);
    query = placementType === 'core_step' ? query.eq('core_step_key', coreStepKey as string) : query.eq('after_core_step_key', afterCoreStepKey as string);

    const { data, error } = await query.order('order_index', { ascending: false }).limit(1).maybeSingle();
    if (error) {
      this.logger.error(`Failed to compute next field order: ${error.message}`);
      throw new InternalServerErrorException('Unable to save customization field.');
    }
    return (data?.order_index ?? -1) + 1;
  }

  private async replaceOptions(fieldId: string, labels: string[]): Promise<void> {
    const client = this.supabaseService.getClient();

    // Old rows are captured up front and removed only after the new ones
    // are safely persisted (mirrors the "insert new, then delete old"
    // safety ordering used for Baked Cakes media replacement), so a
    // failed insert never loses the field's existing options.
    const { data: oldOptions, error: loadError } = await client
      .from('customization_field_options')
      .select('id')
      .eq('field_id', fieldId);
    if (loadError) {
      this.logger.error(`Failed to load existing options for field ${fieldId}: ${loadError.message}`);
      throw new InternalServerErrorException('Unable to save field options.');
    }

    if (labels.length > 0) {
      const { error: insertError } = await client
        .from('customization_field_options')
        .insert(labels.map((label, index) => ({ field_id: fieldId, label, order_index: index })));
      if (insertError) {
        this.logger.error(`Failed to insert options for field ${fieldId}: ${insertError.message}`);
        throw new InternalServerErrorException('Unable to save field options.');
      }
    }

    const oldIds = (oldOptions ?? []).map((o) => o.id as string);
    if (oldIds.length > 0) {
      const { error: deleteError } = await client.from('customization_field_options').delete().in('id', oldIds);
      if (deleteError) {
        this.logger.error(`Failed to clean up old options for field ${fieldId}: ${deleteError.message}`);
      }
    }
  }
}
