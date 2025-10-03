import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  message(): string {
    return `
      This entire application is protected by shield.
      <br />
      To explore other protections:
      <br />
      * GET /rate-limit
      <br />
      * POST a phone number to /sensitive-info
      <br />
      * POST an email to /email
      <br />
      * GET /bot with the curl command
    `;
  }
}
