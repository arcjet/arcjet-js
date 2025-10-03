import { Module } from '@nestjs/common';
import { ValidateEmailController } from './validate-email.controller.js';
import { ValidateEmailService } from './validate-email.service.js';

@Module({
  imports: [],
  controllers: [ValidateEmailController],
  providers: [ValidateEmailService],
})
export class ValidateEmailModule {}
