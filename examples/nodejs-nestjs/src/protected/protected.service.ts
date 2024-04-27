import { Injectable } from '@nestjs/common';

@Injectable()
export class ProtectedService {
  getProtected(): string {
    return 'This is a protected route. In addition to being protected by shield, it is also protected by rate limiting. Try refreshing this page.';
  }
}
