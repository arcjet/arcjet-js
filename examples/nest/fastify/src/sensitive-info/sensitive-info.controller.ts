import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ArcjetGuard, WithArcjetRules, sensitiveInfo } from '@arcjet/nest';
import { SensitiveInfoService } from './sensitive-info.service.js';

@Controller('sensitive-info')
@UseGuards(ArcjetGuard)
@WithArcjetRules([
  sensitiveInfo({
    mode: 'LIVE',
    deny: ['PHONE_NUMBER'],
  }),
])
export class SensitiveInfoController {
  constructor(private readonly sensitiveInfoService: SensitiveInfoService) {}

  @Post()
  sensitiveInfo(@Body() body: string) {
    return this.sensitiveInfoService.message(body);
  }
}
