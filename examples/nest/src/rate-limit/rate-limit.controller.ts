import { Controller, Get, UseGuards } from '@nestjs/common';
import { ArcjetGuard, WithArcjetRules, fixedWindow } from '@arcjet/nest';
import { RateLimitService } from './rate-limit.service.js';

@Controller('rate-limit')
@UseGuards(ArcjetGuard)
@WithArcjetRules([
  fixedWindow({
    mode: 'LIVE',
    window: '30s',
    max: 1,
  }),
])
export class RateLimitController {
  constructor(private readonly rateLimitService: RateLimitService) {}

  @Get()
  getRateLimited() {
    return this.rateLimitService.message();
  }
}
