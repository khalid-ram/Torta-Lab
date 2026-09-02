import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { BakedCakesService } from './baked-cakes.service';
import { ListBakedCakesQueryDto } from './dto/list-baked-cakes-query.dto';
import { CreateBakedCakeDto } from './dto/create-baked-cake.dto';
import { UpdateBakedCakeDto } from './dto/update-baked-cake.dto';
import { UpdateBakedCakeStatusDto } from './dto/update-baked-cake-status.dto';

// Files are buffered in memory (never written to local disk) and relayed
// straight to Supabase Storage. The 50MB cap matches the video limit;
// the stricter 10MB image limit is enforced in the service after the
// file arrives, since multer applies one size limit across both fields.
const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;
const mediaFileInterceptor = FileFieldsInterceptor(
  [
    { name: 'media', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ],
  { storage: memoryStorage(), limits: { fileSize: MAX_UPLOAD_SIZE_BYTES } },
);

type UploadedMediaFiles = { media?: Express.Multer.File[]; thumbnail?: Express.Multer.File[] };

@UseGuards(AuthGuard, AdminGuard)
@Controller('admin/baked-cakes')
export class BakedCakesAdminController {
  constructor(private readonly bakedCakesService: BakedCakesService) {}

  @Get()
  list(@Query() query: ListBakedCakesQueryDto) {
    return this.bakedCakesService.list(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const cake = await this.bakedCakesService.findOne(id);
    return { cake };
  }

  @Post()
  @UseInterceptors(mediaFileInterceptor)
  async create(@Body() dto: CreateBakedCakeDto, @UploadedFiles() files: UploadedMediaFiles) {
    const cake = await this.bakedCakesService.create(dto, files.media?.[0], files.thumbnail?.[0]);
    return { cake };
  }

  @Patch(':id')
  @UseInterceptors(mediaFileInterceptor)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBakedCakeDto,
    @UploadedFiles() files: UploadedMediaFiles,
  ) {
    const cake = await this.bakedCakesService.update(id, dto, files.media?.[0], files.thumbnail?.[0]);
    return { cake };
  }

  @Patch(':id/status')
  async updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBakedCakeStatusDto) {
    const cake = await this.bakedCakesService.updateStatus(id, dto.status);
    return { cake };
  }
}
