import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ARCJET, ArcjetNest, validateEmail } from '@arcjet/nest';
import { ValidateEmailService } from './validate-email.service.js';

@Controller('email')
export class ValidateEmailController {
  constructor(
    private readonly validateEmailService: ValidateEmailService,
    // When you inject the ArcjetNest client, you want to make sure you aren't
    // also running ArcjetGuard on the handlers calling `protect()` to avoid
    // making multiple requests to Arcjet.
    @Inject(ARCJET) private readonly arcjet: ArcjetNest,
  ) {}

  @Post()
  async validateEmail(@Req() req: Request, @Body() email: string) {
    const decision = await this.arcjet
      .withRule(
        validateEmail({
          mode: 'LIVE',
          deny: ['DISPOSABLE', 'INVALID', 'NO_MX_RECORDS'],
          // Alternatively, you can specify a list of email types to allow.
          // This will block all others.
          // allow: ['FREE'],
        }),
      )
      .protect(req, { email });

    if (decision.isDenied()) {
      if (decision.reason.isEmail()) {
        throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      } else {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }
    }

    return this.validateEmailService.message(email);
  }
}
