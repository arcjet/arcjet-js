import { Injectable } from '@nestjs/common';

@Injectable()
export class SensitiveInfoService {
  message(content: string): string {
    return `
      In addition to being protected by shield, this route is also protected
      from sensitive info submission.
      You submitted: "${content}". Try sending a phone number!
    `;
  }
}
