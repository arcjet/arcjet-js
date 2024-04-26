import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from "express";
import { AppService } from './app.service.js';
import { ArcjetGuard } from './arcjet/arcjet.guard.js';

@Controller()
// Protect this controller with the ArcjetGuard
@UseGuards(ArcjetGuard)
export class AppController {

  constructor(
    private readonly appService: AppService,
  ) { }

  @Get()
  async getHello(@Req() req: Request): Promise<string> {
    return this.appService.getHello();
  }
}