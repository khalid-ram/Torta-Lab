import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CustomizationService } from './customization.service';
import { CreateCustomizationFieldDto } from './dto/create-customization-field.dto';
import { UpdateCustomizationFieldDto } from './dto/update-customization-field.dto';
import { UpdateFieldStatusDto } from './dto/update-field-status.dto';
import { MoveFieldDto } from './dto/move-field.dto';

@UseGuards(AuthGuard, AdminGuard)
@Controller('admin/customization')
export class CustomizationAdminController {
  constructor(private readonly customizationService: CustomizationService) {}

  @Get('fields')
  async listFields() {
    return { fields: await this.customizationService.listFields() };
  }

  @Get('fields/:id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return { field: await this.customizationService.findOneField(id) };
  }

  @Post('fields')
  async create(@Body() dto: CreateCustomizationFieldDto) {
    return { field: await this.customizationService.createField(dto) };
  }

  @Patch('fields/:id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCustomizationFieldDto) {
    return { field: await this.customizationService.updateField(id, dto) };
  }

  @Patch('fields/:id/status')
  async updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFieldStatusDto) {
    return { field: await this.customizationService.updateStatus(id, dto.status) };
  }

  @Patch('fields/:id/move')
  async move(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MoveFieldDto) {
    return { fields: await this.customizationService.moveField(id, dto.direction) };
  }

  @Delete('fields/:id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.customizationService.deleteField(id);
    return { success: true };
  }
}
