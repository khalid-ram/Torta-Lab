import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { BakedCakesService } from './baked-cakes.service';
import { ListBakedCakesQueryDto } from './dto/list-baked-cakes-query.dto';
import { CreateBakedCakeDto } from './dto/create-baked-cake.dto';
import { UpdateBakedCakeDto } from './dto/update-baked-cake.dto';
import { UpdateBakedCakeStatusDto } from './dto/update-baked-cake-status.dto';
import { RequestUploadUrlDto } from './dto/request-upload-url.dto';

// Media no longer travels through this controller at all — the browser
// uploads straight to Supabase Storage using a signed URL minted by
// POST /uploads below, then create/update receive the resulting path as
// plain JSON. See baked-cakes.service.ts for why (a platform request-body
// limit this endpoint's old multipart upload would otherwise hit) and
// how the uploaded object is still verified before use.
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

  @Post('uploads')
  requestUploadUrl(@Body() dto: RequestUploadUrlDto) {
    return this.bakedCakesService.requestUploadUrl(dto);
  }

  @Post()
  async create(@Body() dto: CreateBakedCakeDto) {
    const cake = await this.bakedCakesService.create(dto);
    return { cake };
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBakedCakeDto) {
    const cake = await this.bakedCakesService.update(id, dto);
    return { cake };
  }

  @Patch(':id/status')
  async updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBakedCakeStatusDto) {
    const cake = await this.bakedCakesService.updateStatus(id, dto.status);
    return { cake };
  }
}
