import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  message(): string {
    return `
      This entire application is protected by Arcjet. The configuration is
      loaded via LaunchDarkly at startup, but you could use any type of sync or
      async logic in your applications!
    `;
  }
}
