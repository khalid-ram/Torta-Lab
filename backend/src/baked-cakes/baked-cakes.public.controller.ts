import { Controller, Get } from '@nestjs/common';
import { BakedCakesService } from './baked-cakes.service';

// No guards: this is the public homepage feed. The service itself
// enforces status = 'active' — visibility is a backend rule, not
// something the frontend is trusted to filter.
@Controller('baked-cakes')
export class BakedCakesPublicController {
  constructor(private readonly bakedCakesService: BakedCakesService) {}

  @Get()
  async list() {
    const data = await this.bakedCakesService.listPublic();
    return { data };
  }
}
