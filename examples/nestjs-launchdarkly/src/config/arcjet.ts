import { ConfigService } from '@nestjs/config';
import * as ld from '@launchdarkly/node-server-sdk';
import { fixedWindow, shield } from '@arcjet/nest';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ArcjetConfig {
  // Define default values for the LaunchDarkly flags
  static defaultConfig = {
    shieldMode: 'LIVE',
    rateLimitMode: 'LIVE',
    rateLimitMax: 1,
    rateLimitWindow: '5s',
  };

  constructor(private configService: ConfigService) {}

  async create() {
    // Initialize LaunchDarkly client
    const client = ld.init(this.configService.get('LAUNCHDARKLY_SDK_KEY'));

    // Wait for the LaunchDarkly client to be initialized
    await client.waitForInitialization({ timeout: 1 });

    // Set the user context for LaunchDarkly - in this example, every user is treated the same.
    const context = { key: 'guest' };

    // Get the latest configuration from LaunchDarkly
    const shieldMode = await client.variation(
      'shieldMode',
      context,
      ArcjetConfig.defaultConfig.shieldMode,
    );
    const rateLimitMode = await client.variation(
      'rateLimitMode',
      context,
      ArcjetConfig.defaultConfig.rateLimitMode,
    );
    const rateLimitMax = await client.variation(
      'rateLimitMax',
      context,
      ArcjetConfig.defaultConfig.rateLimitMax,
    );
    const rateLimitWindow = await client.variation(
      'rateLimitWindow',
      context,
      ArcjetConfig.defaultConfig.rateLimitWindow,
    );

    return {
      key: this.configService.get('ARCJET_KEY')!,
      rules: [
        shield({ mode: shieldMode }),
        fixedWindow({
          mode: rateLimitMode,
          max: rateLimitMax,
          window: rateLimitWindow,
        }),
      ],
    } as const;
  }
}
