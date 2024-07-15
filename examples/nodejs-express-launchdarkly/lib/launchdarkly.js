import * as ld from "@launchdarkly/node-server-sdk";

// Initialize LaunchDarkly client
const client = ld.init(process.env.LAUNCHDARKLY_SDK_KEY);

// Define default values for the LaunchDarkly flags
const defaultConfig = {
  shieldMode: "LIVE",
  slidingWindowMode: "LIVE",
  slidingWindowMax: 60,
  slidingWindowInterval: 60,
};

export const getArcjetConfig = async () => {
  // Wait for the LaunchDarkly client to be initialized
  await client.waitForInitialization({ timeout: 1 });

  // Set the user context for LaunchDarkly - in this example, every user is treated the same.
  const context = { key: "guest" };

  // Get the latest configuration from LaunchDarkly
  const shieldMode = await client.variation(
    "shieldMode",
    context,
    defaultConfig.shieldMode
  );
  const slidingWindowMode = await client.variation(
    "slidingWindowMode",
    context,
    defaultConfig.slidingWindowMode
  );
  const slidingWindowMax = await client.variation(
    "slidingWindowMax",
    context,
    defaultConfig.slidingWindowMax
  );
  const slidingWindowInterval = await client.variation(
    "slidingWindowInterval",
    context,
    defaultConfig.slidingWindowInterval
  );

  return {
    shieldMode,
    slidingWindowMode,
    slidingWindowMax,
    slidingWindowInterval,
  };
};
