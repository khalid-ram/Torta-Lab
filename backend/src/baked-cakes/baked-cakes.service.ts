import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { escapeIlikeTerm } from '../common/utils/postgrest-search';
import { generateStoragePath } from '../common/utils/generate-storage-path';
import { ListBakedCakesQueryDto } from './dto/list-baked-cakes-query.dto';
import { CreateBakedCakeDto } from './dto/create-baked-cake.dto';
import { UpdateBakedCakeDto } from './dto/update-baked-cake.dto';

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
  created_at: string;
  updated_at: string;
}

export interface PublicBakedCake {
  id: string;
  name: string;
  description: string;
  isAvailableToOrder: boolean;
  mediaType: MediaType;
  mediaUrl: string;
  thumbnailUrl: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const BUCKET = 'baked-cakes';
const COLUMNS =
  'id, name, description, is_available_to_order, status, media_type, media_url, media_path, thumbnail_url, thumbnail_path, created_at, updated_at';

const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;
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
      .select('id, name, description, is_available_to_order, media_type, media_url, thumbnail_url')
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
    }));
  }

  async create(
    dto: CreateBakedCakeDto,
    mediaFile: Express.Multer.File | undefined,
    thumbnailFile: Express.Multer.File | undefined,
  ): Promise<BakedCakeRecord> {
    const uploadedPaths: string[] = [];
    try {
      let mediaPath: string;
      let mediaUrl: string;
      let thumbnailPath: string | null = null;
      let thumbnailUrl: string | null = null;

      if (dto.media_type === 'image') {
        if (!mediaFile) throw new BadRequestException('A photo is required.');
        this.validateImage(mediaFile);
        mediaPath = generateStoragePath('images', mediaFile.mimetype);
        await this.uploadFile(mediaPath, mediaFile);
        uploadedPaths.push(mediaPath);
        mediaUrl = this.getPublicUrl(mediaPath);
      } else {
        if (!mediaFile) throw new BadRequestException('A video is required.');
        if (!thumbnailFile) throw new BadRequestException('A thumbnail is required for video cakes.');
        this.validateVideo(mediaFile);
        this.validateImage(thumbnailFile);

        mediaPath = generateStoragePath('videos', mediaFile.mimetype);
        await this.uploadFile(mediaPath, mediaFile);
        uploadedPaths.push(mediaPath);
        mediaUrl = this.getPublicUrl(mediaPath);

        thumbnailPath = generateStoragePath('thumbnails', thumbnailFile.mimetype);
        await this.uploadFile(thumbnailPath, thumbnailFile);
        uploadedPaths.push(thumbnailPath);
        thumbnailUrl = this.getPublicUrl(thumbnailPath);
      }

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
          media_path: mediaPath,
          thumbnail_url: thumbnailUrl,
          thumbnail_path: thumbnailPath,
        })
        .select(COLUMNS)
        .single();

      if (error || !data) {
        this.logger.error(`Failed to create baked cake: ${error?.message}`);
        throw new InternalServerErrorException('Unable to create baked cake.');
      }
      return data as BakedCakeRecord;
    } catch (err) {
      await this.deleteFiles(uploadedPaths);
      throw err;
    }
  }

  async update(
    id: string,
    dto: UpdateBakedCakeDto,
    mediaFile: Express.Multer.File | undefined,
    thumbnailFile: Express.Multer.File | undefined,
  ): Promise<BakedCakeRecord> {
    const existing = await this.findOne(id);
    const targetMediaType = dto.media_type ?? existing.media_type;
    const uploadedPaths: string[] = [];

    try {
      const update: Record<string, unknown> = {};
      if (dto.name !== undefined) update.name = dto.name;
      if (dto.description !== undefined) update.description = dto.description;
      if (dto.is_available_to_order !== undefined) update.is_available_to_order = dto.is_available_to_order;
      if (dto.status !== undefined) update.status = dto.status;
      if (dto.media_type !== undefined) update.media_type = dto.media_type;

      let newMediaPath: string | null = null;
      let newThumbnailPath: string | null = null;

      if (targetMediaType === 'image') {
        if (mediaFile) {
          this.validateImage(mediaFile);
          newMediaPath = generateStoragePath('images', mediaFile.mimetype);
          await this.uploadFile(newMediaPath, mediaFile);
          uploadedPaths.push(newMediaPath);
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
        if (switchingToVideo && !mediaFile) throw new BadRequestException('A video is required when switching to Video.');
        if (switchingToVideo && !thumbnailFile) throw new BadRequestException('A thumbnail is required when switching to Video.');

        if (mediaFile) {
          this.validateVideo(mediaFile);
          newMediaPath = generateStoragePath('videos', mediaFile.mimetype);
          await this.uploadFile(newMediaPath, mediaFile);
          uploadedPaths.push(newMediaPath);
          update.media_path = newMediaPath;
          update.media_url = this.getPublicUrl(newMediaPath);
        }
        if (thumbnailFile) {
          this.validateImage(thumbnailFile);
          newThumbnailPath = generateStoragePath('thumbnails', thumbnailFile.mimetype);
          await this.uploadFile(newThumbnailPath, thumbnailFile);
          uploadedPaths.push(newThumbnailPath);
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
      await this.deleteFiles(uploadedPaths);
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

  private validateImage(file: Express.Multer.File): void {
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported image type. Allowed: JPEG, PNG, WEBP.');
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new BadRequestException('Image exceeds the 10MB limit.');
    }
  }

  private validateVideo(file: Express.Multer.File): void {
    if (!ALLOWED_VIDEO_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported video type. Allowed: MP4, WEBM.');
    }
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      throw new BadRequestException('Video exceeds the 50MB limit.');
    }
  }

  private async uploadFile(path: string, file: Express.Multer.File): Promise<void> {
    const client = this.supabaseService.getClient();
    const { error } = await client.storage.from(BUCKET).upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });
    if (error) {
      this.logger.error(`Failed to upload ${path}: ${error.message}`);
      throw new InternalServerErrorException('Unable to upload media.');
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
