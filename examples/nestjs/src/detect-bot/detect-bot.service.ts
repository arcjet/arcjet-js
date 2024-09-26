import { Injectable } from '@nestjs/common';

@Injectable()
export class DetectBotService {
  message(): string {
    return `
      In addition to being protected by shield, this route is also protected
      against bots.
      <br />
      Try accessing the route with the curl command!
    `;
  }
}
