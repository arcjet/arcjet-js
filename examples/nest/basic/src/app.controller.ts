import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service.js';
import { ArcjetGuard } from '@arcjet/nest';

@Controller()
@UseGuards(ArcjetGuard)
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  index() {
    return this.appService.message();
  }
}
