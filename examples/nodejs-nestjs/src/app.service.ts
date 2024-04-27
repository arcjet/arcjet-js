import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'This endpoint is protected by shield. Go to /protected to test the addition of rate limiting.';
  }
}
