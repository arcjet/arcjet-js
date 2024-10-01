import { Injectable } from '@nestjs/common';

@Injectable()
export class RateLimitService {
  message(): string {
    return `
      In addition to being protected by shield, this route is also protected by
      rate limiting.
      <br />
      Try refreshing this page.
    `;
  }
}
