import { TestEnvironment } from "jest-environment-node";

export default class extends TestEnvironment {
  constructor(config, context) {
    super(config, context);

    for (const [key, value] of Object.entries(
      config.projectConfig.testEnvironmentOptions,
    )) {
      this.global[key] = value;
    }
  }
  async setup() {
    await super.setup();
  }

  async teardown() {
    await super.teardown();
  }

  getVmContext() {
    return super.getVmContext();
  }
}
