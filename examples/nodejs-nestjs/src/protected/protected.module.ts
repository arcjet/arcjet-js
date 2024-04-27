import { Module } from '@nestjs/common';
import { ProtectedController } from './protected.controller.js';
import { fixedWindow } from '@arcjet/node';
import { ArcjetGuard } from '../arcjet/arcjet.guard.js';
import { ConfigModule } from '@nestjs/config';
import { ProtectedService } from './protected.service.js';

@Module({
    imports: [ConfigModule.forRoot()],
    controllers: [ProtectedController],
    providers: [
        ProtectedService,

        // Define rate limiting rules for this module, which
        // we want to add to the ArcjetGuard configuration
        // See https://docs.arcjet.com/reference/nodejs#configuration
        // for information on the rules available
        {
            provide: 'ARCJET_RULES',
            useValue: [
                fixedWindow({
                    mode: "LIVE",
                    window: "1m",
                    max: 1,
                }),
            ],
        },

        // Add ArcjetGuard with default configuration
        // overlayed with the preceding additional rules
        ArcjetGuard,
    ],
})
export class ProtectedModule { }