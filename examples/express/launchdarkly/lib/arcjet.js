import arcjet, { shield, slidingWindow } from "@arcjet/node";
import { getArcjetConfig } from "./launchdarkly.js";

// Get your Arcjet key at <https://app.arcjet.com>.
// Set it as an environment variable instead of hard coding it.
const arcjetKey = process.env.ARCJET_KEY;

if (!arcjetKey) {
  throw new Error("Cannot find `ARCJET_KEY` environment variable");
}

// Initialize Arcjet with your site key and rules
const aj = arcjet({
  key: arcjetKey,
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
