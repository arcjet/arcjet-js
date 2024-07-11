import _arcjet, { shield, slidingWindow } from "@arcjet/node";
import { getArcjetConfig } from "./launchdarkly.js";

// Initialize Arcjet with your site key and rules
const aj = _arcjet({
  // Get your site key from https://app.arcjet.com
  // and set it as an environment variable rather than hard coding.
  // See: https://www.npmjs.com/package/dotenv
  key: process.env.ARCJET_KEY,
  rules: [],
});


// This function will return an Arcjet instance with the latest rules
const arcjet = async () => {
  // Get the latest configuration from LaunchDarkly
  const newConfig = await getArcjetConfig();

    // Return the Arcjet instance with the latest rules
    return aj
      .withRule(shield({ mode: currentConfig.shieldMode }))
      .withRule(
        slidingWindow({
          mode: currentConfig.slidingWindowMode,
          max: currentConfig.slidingWindowMax,
          interval: currentConfig.slidingWindowInterval,
        })
      );
};

export default arcjet;
