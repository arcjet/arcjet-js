import { Controller, Get, UseGuards } from '@nestjs/common';
import { ArcjetGuard, WithArcjetRules, detectBot } from '@arcjet/nest';
import { DetectBotService } from './detect-bot.service.js';

@Controller('bot')
@UseGuards(ArcjetGuard)
@WithArcjetRules([
  detectBot({
    mode: 'LIVE',
    allow: [],
  }),
])
export class DetectBotController {
  constructor(private readonly detectBotService: DetectBotService) {}

  @Get()
  detectBot() {
    return this.detectBotService.message();
  }
}
