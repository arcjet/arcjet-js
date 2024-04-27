import { CanActivate, ExecutionContext, HttpException, HttpStatus, Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import arcjet from '@arcjet/node';
import { ARCJET_DEFAULT_RULES } from '../config/arcjet.js';

@Injectable()
export class ArcjetGuard implements CanActivate {
    private aj: any;

    constructor(
        private configService: ConfigService,
        @Optional() @Inject('ARCJET_RULES') private rules: any[] = []
    ) {
        // Take the rules defined in config/arcjet.js and overlay them with any
        // additional rules defined in the module file, and instantiate the Arcjet client
        this.aj = arcjet({
            key: this.configService.get<string>('ARCJET_KEY'),
            rules: [...ARCJET_DEFAULT_RULES, ...this.rules],
        });
    }

    async canActivate(
        context: ExecutionContext,
    ): Promise<boolean> {
        const request = context.switchToHttp().getRequest();;

        const decision = await this.aj.protect(request);

        if (decision.isDenied()) {
            if (decision.reason.isRateLimit()) {
                throw new HttpException("Too many requests", HttpStatus.TOO_MANY_REQUESTS);
            }
            if (decision.reason.isBot()) {
                throw new HttpException("Bot detected", HttpStatus.FORBIDDEN);
            }
            throw new HttpException("Forbidden", HttpStatus.FORBIDDEN);
        }

        return true;
    }
}
