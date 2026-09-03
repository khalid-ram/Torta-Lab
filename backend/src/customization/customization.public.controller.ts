import { Controller, Get } from '@nestjs/common';
import { CustomizationService } from './customization.service';

// No guards: this is the public /customize configuration feed. The
// service itself filters to active fields and non-empty steps —
// visibility is a backend rule, not something the frontend is trusted
// to filter.
@Controller('customization')
export class CustomizationPublicController {
  constructor(private readonly customizationService: CustomizationService) {}

  @Get()
  list() {
    return this.customizationService.listPublic();
  }
}
