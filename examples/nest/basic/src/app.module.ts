import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ArcjetModule, shield } from '@arcjet/nest';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { RateLimitModule } from './rate-limit/rate-limit.module.js';
import { DetectBotModule } from './detect-bot/detect-bot.module.js';
import { SensitiveInfoModule } from './sensitive-info/sensitive-info.module.js';
import { ValidateEmailModule } from './validate-email/validate-email.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.local',
    }),
    ArcjetModule.forRoot({
      isGlobal: true,
      // `!` because `envFilePath` loads it.
      key: process.env.ARCJET_KEY!,
      rules: [shield({ mode: 'LIVE' })],
    }),
    RateLimitModule,
    DetectBotModule,
    SensitiveInfoModule,
    ValidateEmailModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // You can enable ArcjetGuard globally on every route using the `APP_GUARD`
    // token; however, this is NOT recommended. If you need to inject the
    // ArcjetNest client, you want to make sure you aren't also running
    // ArcjetGuard on the handlers calling `protect()` to avoid making multiple
    // requests to Arcjet and you can't opt-out of this global Guard.
    // {
    //   provide: APP_GUARD,
    //   useClass: ArcjetGuard
    // }
  ],
})
export class AppModule {}
