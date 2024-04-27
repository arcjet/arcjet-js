import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { ProtectedModule } from './protected/protected.module.js';

import { ArcjetGuard } from './arcjet/arcjet.guard.js';

@Module({
  imports: [ConfigModule.forRoot(), ProtectedModule],
  controllers: [AppController],
  providers: [
    AppService,
    // Add ArcjetGuard with default configuration as a provider to this module
    ArcjetGuard,
  ],
})
export class AppModule { }
