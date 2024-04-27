import { Controller, Get, UseGuards } from '@nestjs/common';
import { ArcjetGuard } from '../arcjet/arcjet.guard.js';
import { ProtectedService } from './protected.service.js';

@Controller('protected')
@UseGuards(ArcjetGuard)
export class ProtectedController {

    constructor(
        private readonly protectedService: ProtectedService,
    ) { }

    @Get()
    getProtected() {
        return this.protectedService.getProtected();
    }
}