import { launchArcjet } from "@arcjet/guard";

export const arcjet = launchArcjet({
  // Get your site key from https://app.arcjet.com
  key: process.env.ARCJET_KEY!,
});
