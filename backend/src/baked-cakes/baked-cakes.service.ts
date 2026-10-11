import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { escapeIlikeTerm } from '../common/utils/postgrest-search';
import { generateStoragePath, type StorageFolder } from '../common/utils/generate-storage-path';
import { ALLOWED_IMAGE_MIME_TYPES, ALLOWED_VIDEO_MIME_TYPES, IMAGE_SIGNATURES, MAX_IMAGE_SIZE_BYTES, MAX_VIDEO_SIZE_BYTES } from './upload-constraints';
import { ListBakedCakesQueryDto } from './dto/list-baked-cakes-query.dto';
import { CreateBakedCakeDto } from './dto/create-baked-cake.dto';
import { UpdateBakedCakeDto } from './dto/update-baked-cake.dto';
import { RequestUploadUrlDto } from './dto/request-upload-url.dto';
import type { Occasion } from './occasions';

export type MediaType = 'image' | 'video';
export type CakeStatus = 'active' | 'paused';

export interface BakedCakeRecord {
  id: string;
  name: string;
  description: string;
  is_available_to_order: boolean;
  status: CakeStatus;
  media_type: MediaType;
  media_url: string;
  media_path: string;
  thumbnail_url: string | null;
  thumbnail_path: string | null;
  occasion: Occasion | null;
  cost: number | null;
  recommended_selling_price: number | null;
  actual_selling_price: number | null;
  created_at: string;
  updated_at: string;
}

// Public-facing shape only — deliberately excludes cost and
// actual_selling_price, which are internal business data (see the
// Baked Cakes pricing spec's "Public vs Admin Data" section). This is
// an explicit field-by-field mapping in listPublic() below, never a
// passthrough of the raw DB row, so a new admin-only column added later
// can't accidentally leak here just by being selected.
export interface PublicBakedCake {
  id: string;
  name: string;
  description: string;
  isAvailableToOrder: boolean;
  mediaType: MediaType;
  mediaUrl: string;
  thumbnailUrl: string | null;
  occasion: Occasion | null;
  recommendedSellingPrice: number | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const BUCKET = 'baked-cakes';
const COLUMNS =
  'id, name, description, is_available_to_order, status, media_type, media_url, media_path, thumbnail_url, thumbnail_path, occasion, cost, recommended_selling_price, actual_selling_price, created_at, updated_at';
const PUBLIC_LIMIT = 24;

@Injectable()
export class BakedCakesService {
  private readonly logger = new Logger(BakedCakesService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async list(query: ListBakedCakesQueryDto): Promise<{ data: BakedCakeRecord[]; pagination: Pagination }> {
    const client = this.supabaseService.getClient();
    let builder = client.from('baked_cakes').select(COLUMNS, { count: 'exact' });

    if (query.status !== 'all') {
      builder = builder.eq('status', query.status);
    }
    if (query.availability !== 'all') {
      builder = builder.eq('is_available_to_order', query.availability === 'available');
    }
    if (query.media !== 'all') {
      builder = builder.eq('media_type', query.media);
    }
    if (query.search?.trim()) {
      const term = escapeIlikeTerm(query.search.trim());
      builder = builder.or(`name.ilike."%${term}%",description.ilike."%${term}%"`);
    }

    const from = (query.page - 1) * query.limit;
    const to = from + query.limit - 1;
    const { data, error, count } = await builder.order('created_at', { ascending: false }).range(from, to);

    if (error) {
      this.logger.error(`Failed to list baked cakes: ${error.message}`);
      throw new InternalServerErrorException('Unable to load baked cakes.');
    }

    const total = count ?? 0;
    return {
      data: (data ?? []) as BakedCakeRecord[],
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async findOne(id: string): Promise<BakedCakeRecord> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.from('baked_cakes').select(COLUMNS).eq('id', id).maybeSingle();
    if (error) {
      this.logger.error(`Failed to load baked cake ${id}: ${error.message}`);
      throw new InternalServerErrorException('Unable to load baked cake.');
    }
    if (!data) {
      throw new NotFoundException('Baked cake not found.');
    }
    return data as BakedCakeRecord;
  }

  async listPublic(): Promise<PublicBakedCake[]> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('baked_cakes')
      .select('id, name, description, is_available_to_order, media_type, media_url, thumbnail_url, occasion, recommended_selling_price')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(PUBLIC_LIMIT);

    if (error) {
      this.logger.error(`Failed to load public baked cakes: ${error.message}`);
      throw new InternalServerErrorException('Unable to load baked cakes.');
    }

    return (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      isAvailableToOrder: row.is_available_to_order as boolean,
      mediaType: row.media_type as MediaType,
      mediaUrl: row.media_url as string,
      thumbnailUrl: (row.thumbnail_url as string | null) ?? null,
      occasion: (row.occasion as Occasion | null) ?? null,
      recommendedSellingPrice: (row.recommended_selling_price as number | null) ?? null,
    }));
  }

  // Step 1 of the direct-upload flow: mint a short-lived (2h), one-time
  // signed Storage upload URL for a server-generated path. The browser
  // then uploads the file bytes straight to Supabase Storage — they
  // never pass through this backend, which is what keeps large video
  // uploads working on a platform with a small request-body limit.
  // Nothing is trusted from this request beyond "which folder" — the
  // actual file is re-validated from Storage in validateUploadedObject
  // before it's ever attached to a database row.
  async requestUploadUrl(dto: RequestUploadUrlDto): Promise<{ path: string; token: string }> {
    if (dto.purpose === 'thumbnail' && dto.fileKind !== 'image') {
      throw new BadRequestException('A thumbnail must be an image.');
    }
    if (dto.fileKind === 'image' && !(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(dto.contentType)) {
      throw new BadRequestException('Unsupported image type. Allowed: JPEG, PNG, WEBP.');
    }
    if (dto.fileKind === 'video' && !(ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(dto.contentType)) {
      throw new BadRequestException('Unsupported video type. Allowed: MP4, WEBM.');
    }

    const folder: StorageFolder = dto.purpose === 'thumbnail' ? 'thumbnails' : dto.fileKind === 'image' ? 'images' : 'videos';
    // Always a fresh randomUUID-based path (see generateStoragePath) —
    // an upload slot can never collide with or overwrite an existing object.
    const path = generateStoragePath(folder, dto.contentType);

    const client = this.supabaseService.getClient();
    const { data, error } = await client.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      this.logger.error(`Failed to create signed upload URL for ${path}: ${error?.message}`);
      throw new InternalServerErrorException('Unable to prepare upload.');
    }
    return { path: data.path, token: data.token };
  }

  async create(dto: CreateBakedCakeDto): Promise<BakedCakeRecord> {
    const uploadedPaths = [dto.mediaPath, ...(dto.thumbnailPath ? [dto.thumbnailPath] : [])];
    try {
      await this.validateUploadedObject(dto.mediaPath, dto.media_type);

      let thumbnailUrl: string | null = null;
      if (dto.media_type === 'video') {
        if (!dto.thumbnailPath) throw new BadRequestException('A thumbnail is required for video cakes.');
        await this.validateUploadedObject(dto.thumbnailPath, 'image');
        thumbnailUrl = this.getPublicUrl(dto.thumbnailPath);
      }
      const mediaUrl = this.getPublicUrl(dto.mediaPath);

      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('baked_cakes')
        .insert({
          name: dto.name,
          description: dto.description,
          is_available_to_order: dto.is_available_to_order,
          status: dto.status,
          media_type: dto.media_type,
          media_url: mediaUrl,
          media_path: dto.mediaPath,
          thumbnail_url: thumbnailUrl,
          thumbnail_path: dto.media_type === 'video' ? (dto.thumbnailPath as string) : null,
          // ?? only falls back on undefined/null, so an explicit 0 (e.g.
          // "given away for free") is preserved and never coerced to null.
          occasion: dto.occasion ?? null,
          cost: dto.cost ?? null,
          recommended_selling_price: dto.recommended_selling_price ?? null,
          actual_selling_price: dto.actual_selling_price ?? null,
        })
        .select(COLUMNS)
        .single();

      if (error || !data) {
        this.logger.error(`Failed to create baked cake: ${error?.message}`);
        throw new InternalServerErrorException('Unable to create baked cake.');
      }
      return data as BakedCakeRecord;
    } catch (err) {
      // Covers both an invalid upload (already removed by
      // validateUploadedObject — a harmless repeat delete) and a valid
      // upload that never made it into a row because something later
      // failed: either way, nothing uploaded-but-unattached is left behind.
      await this.deleteFiles(uploadedPaths);
      throw err;
    }
  }

  async update(id: string, dto: UpdateBakedCakeDto): Promise<BakedCakeRecord> {
    const existing = await this.findOne(id);
    const targetMediaType = dto.media_type ?? existing.media_type;
    const newlyUploadedPaths = [...(dto.mediaPath ? [dto.mediaPath] : []), ...(dto.thumbnailPath ? [dto.thumbnailPath] : [])];

    try {
      const update: Record<string, unknown> = {};
      if (dto.name !== undefined) update.name = dto.name;
      if (dto.description !== undefined) update.description = dto.description;
      if (dto.is_available_to_order !== undefined) update.is_available_to_order = dto.is_available_to_order;
      if (dto.status !== undefined) update.status = dto.status;
      if (dto.media_type !== undefined) update.media_type = dto.media_type;
      // These four are nullable, so `!== undefined` (not a truthy check)
      // is what lets an explicit null through — clearing Occasion/Cost/
      // Recommended/Actual back to "not entered" is a real, distinct edit.
      if (dto.occasion !== undefined) update.occasion = dto.occasion;
      if (dto.cost !== undefined) update.cost = dto.cost;
      if (dto.recommended_selling_price !== undefined) update.recommended_selling_price = dto.recommended_selling_price;
      if (dto.actual_selling_price !== undefined) update.actual_selling_price = dto.actual_selling_price;

      let newMediaPath: string | null = null;
      let newThumbnailPath: string | null = null;

      if (targetMediaType === 'image') {
        if (dto.mediaPath) {
          await this.validateUploadedObject(dto.mediaPath, 'image');
          newMediaPath = dto.mediaPath;
          update.media_path = newMediaPath;
          update.media_url = this.getPublicUrl(newMediaPath);
        } else if (existing.media_type !== 'image') {
          throw new BadRequestException('A new photo is required when switching to Photo.');
        }
        // An image cake never carries a thumbnail, regardless of what it was before.
        if (existing.media_type !== 'image' || existing.thumbnail_path) {
          update.thumbnail_path = null;
          update.thumbnail_url = null;
        }
      } else {
        const switchingToVideo = existing.media_type !== 'video';
        if (switchingToVideo && !dto.mediaPath) throw new BadRequestException('A video is required when switching to Video.');
        if (switchingToVideo && !dto.thumbnailPath) throw new BadRequestException('A thumbnail is required when switching to Video.');

        if (dto.mediaPath) {
          await this.validateUploadedObject(dto.mediaPath, 'video');
          newMediaPath = dto.mediaPath;
          update.media_path = newMediaPath;
          update.media_url = this.getPublicUrl(newMediaPath);
        }
        if (dto.thumbnailPath) {
          await this.validateUploadedObject(dto.thumbnailPath, 'image');
          newThumbnailPath = dto.thumbnailPath;
          update.thumbnail_path = newThumbnailPath;
          update.thumbnail_url = this.getPublicUrl(newThumbnailPath);
        }
      }

      if (Object.keys(update).length === 0) {
        throw new BadRequestException('No fields to update.');
      }

      const client = this.supabaseService.getClient();
      const { data, error } = await client.from('baked_cakes').update(update).eq('id', id).select(COLUMNS).maybeSingle();

      if (error) {
        this.logger.error(`Failed to update baked cake ${id}: ${error.message}`);
        throw new InternalServerErrorException('Unable to update baked cake.');
      }
      if (!data) {
        throw new NotFoundException('Baked cake not found.');
      }

      // Only now, after the new state is safely persisted, remove what it replaced.
      const oldPathsToDelete: string[] = [];
      if (newMediaPath) oldPathsToDelete.push(existing.media_path);
      if (targetMediaType === 'image' && existing.media_type === 'video' && existing.thumbnail_path) {
        oldPathsToDelete.push(existing.thumbnail_path);
      }
      if (newThumbnailPath && existing.thumbnail_path) oldPathsToDelete.push(existing.thumbnail_path);
      await this.deleteFiles(oldPathsToDelete);

      return data as BakedCakeRecord;
    } catch (err) {
      await this.deleteFiles(newlyUploadedPaths);
      throw err;
    }
  }

  async updateStatus(id: string, status: CakeStatus): Promise<BakedCakeRecord> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.from('baked_cakes').update({ status }).eq('id', id).select(COLUMNS).maybeSingle();
    if (error) {
      this.logger.error(`Failed to update status for baked cake ${id}: ${error.message}`);
      throw new InternalServerErrorException('Unable to update baked cake status.');
    }
    if (!data) {
      throw new NotFoundException('Baked cake not found.');
    }
    return data as BakedCakeRecord;
  }

  // Step 2 of the direct-upload flow: re-derives trust from scratch.
  // Nothing about the object's existence, size, or real type is taken
  // on the client's word — this reads the object Storage actually
  // received and either accepts it or deletes it. Covers "upload never
  // happened" (expired/unused signed URL, interrupted transfer) and "a
  // real object exists but isn't what it claims to be" (oversized,
  // wrong type, or — for images — bytes that don't match their declared
  // Content-Type, the same magic-byte check that exists because a HEIC
  // photo can otherwise be uploaded claiming to be image/jpeg).
  private async validateUploadedObject(path: string, kind: 'image' | 'video'): Promise<void> {
    const client = this.supabaseService.getClient();

    // info() fetches this exact object's real, server-recorded metadata
    // (size, content type) directly — it errors when nothing was ever
    // uploaded to this path, which covers both an expired signed URL
    // and an interrupted/abandoned upload in one check.
    const { data: object, error: infoError } = await client.storage.from(BUCKET).info(path);
    if (infoError || !object) {
      throw new BadRequestException('Upload not found or expired. Please try uploading again.');
    }

    const size = object.size ?? 0;
    const reportedMimeType = object.contentType ?? '';

    if (kind === 'video') {
      if (size > MAX_VIDEO_SIZE_BYTES) {
        await this.deleteFiles([path]);
        throw new BadRequestException('Video exceeds the 50MB limit.');
      }
      if (!(ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(reportedMimeType)) {
        await this.deleteFiles([path]);
        throw new BadRequestException('Unsupported video type. Allowed: MP4, WEBM.');
      }
      return;
    }

    if (size > MAX_IMAGE_SIZE_BYTES) {
      await this.deleteFiles([path]);
      throw new BadRequestException('Image exceeds the 10MB limit.');
    }
    if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(reportedMimeType)) {
      await this.deleteFiles([path]);
      throw new BadRequestException('Unsupported image type. Allowed: JPEG, PNG, WEBP.');
    }

    const { data: blob, error: downloadError } = await client.storage.from(BUCKET).download(path);
    if (downloadError || !blob) {
      this.logger.error(`Failed to download uploaded object ${path} for validation: ${downloadError?.message}`);
      throw new InternalServerErrorException('Unable to verify the uploaded file.');
    }
    const buffer = Buffer.from(await blob.arrayBuffer());
    if (!IMAGE_SIGNATURES[reportedMimeType]?.(buffer)) {
      await this.deleteFiles([path]);
      throw new BadRequestException('The uploaded file does not look like a valid JPEG, PNG, or WEBP image.');
    }
  }

  private getPublicUrl(path: string): string {
    const client = this.supabaseService.getClient();
    const { data } = client.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  private async deleteFiles(paths: string[]): Promise<void> {
    if (!paths.length) return;
    const client = this.supabaseService.getClient();
    const { error } = await client.storage.from(BUCKET).remove(paths);
    if (error) {
      // Best-effort cleanup: log but never let a cleanup failure mask the
      // original error or block a successful response to the admin.
      this.logger.error(`Failed to clean up storage objects [${paths.join(', ')}]: ${error.message}`);
    }
  }
}
