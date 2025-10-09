import { Module } from '@nestjs/common';
import { DetectBotController } from './detect-bot.controller.js';
import { DetectBotService } from './detect-bot.service.js';

@Module({
  imports: [],
  controllers: [DetectBotController],
  providers: [DetectBotService],
})
export class DetectBotModule {}
