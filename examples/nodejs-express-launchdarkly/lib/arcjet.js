import arcjet, { shield, slidingWindow } from "@arcjet/node";
import { getArcjetConfig } from "./launchdarkly.js";

// Initialize Arcjet with your site key and rules
const aj = arcjet({
  // Get your site key from https://app.arcjet.com
  // and set it as an environment variable rather than hard coding.
  // See: https://www.npmjs.com/package/dotenv
  key: process.env.ARCJET_KEY,
  rules: [],
});

// This function will return an Arcjet instance with the latest rules
export default async () => {
  // Get the latest configuration from LaunchDarkly
  const config = await getArcjetConfig();

  // Return the Arcjet instance with the latest rules
  return aj.withRule(shield({ mode: config.shieldMode })).withRule(
    slidingWindow({
      mode: config.slidingWindowMode,
      max: config.slidingWindowMax,
      interval: config.slidingWindowInterval,
    })
  );
};