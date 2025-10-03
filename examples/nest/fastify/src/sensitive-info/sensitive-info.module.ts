import { Module } from '@nestjs/common';
import { SensitiveInfoController } from './sensitive-info.controller.js';
import { SensitiveInfoService } from './sensitive-info.service.js';

@Module({
  imports: [],
  controllers: [SensitiveInfoController],
  providers: [SensitiveInfoService],
})
export class SensitiveInfoModule {}
