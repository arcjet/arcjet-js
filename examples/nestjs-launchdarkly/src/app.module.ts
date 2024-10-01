import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ArcjetGuard, ArcjetModule } from '@arcjet/nest';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ArcjetConfig } from './config/arcjet.js';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.local',
    }),
    ArcjetModule.forRootAsync({
      isGlobal: true,
      useClass: ArcjetConfig,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // You can enable ArcjetGuard globally on every route using the `APP_GUARD`
    // token; however, this is NOT recommended. If you need to inject the
    // ArcjetNest client, you want to make sure you aren't also running
    // ArcjetGuard on the handlers calling `protect()` to avoid making multiple
    // requests to Arcjet and you can't opt-out of this global Guard.
    {
      provide: APP_GUARD,
      useClass: ArcjetGuard,
    },
  ],
})
export class AppModule {}
