import { Module } from '@nestjs/common';
import { RateLimitController } from './rate-limit.controller.js';
import { RateLimitService } from './rate-limit.service.js';

@Module({
  imports: [],
  controllers: [RateLimitController],
  providers: [RateLimitService],
})
export class RateLimitModule {}
