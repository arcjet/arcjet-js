import { Injectable } from '@nestjs/common';

@Injectable()
export class ValidateEmailService {
  message(content: string): string {
    return `
      In addition to being protected by shield, this route is also protected
      against invalid email submissions.
      You submitted: "${content}". Try sending an invalid email!
    `;
  }
}
