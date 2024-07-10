import * as ld from "@launchdarkly/node-server-sdk";

// Initialize LaunchDarkly client
const client = ld.init(process.env.LAUNCHDARKLY_SDK_KEY);

export const getArcjetConfig = async () => {
  // Wait for the LaunchDarkly client to be initialized
  await client.waitForInitialization({ timeout: 5000 });

  // Set the user context for LaunchDarkly - in this example, every user is treated the same.
  const context = { key: "guest" };

  // Get the latest configuration from LaunchDarkly
  const shieldMode = await client.variation("shieldMode", context, "LIVE");
  const slidingWindowMode = await client.variation(
    "slidingWindowMode",
    context,
    "LIVE"
  );
  const slidingWindowMax = await client.variation(
    "slidingWindowMax",
    context,
    60
  );
  const slidingWindowInterval = await client.variation(
    "slidingWindowInterval",
    context,
    60
  );

  return {
    shieldMode,
    slidingWindowMode,
    slidingWindowMax,
    slidingWindowInterval,
  };
};
