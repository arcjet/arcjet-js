import _arcjet, { shield } from "@arcjet/next";

export const arcjet = _arcjet({
  // Get your site key from https://app.arcjet.com
  // and set it as an environment variable rather than hard coding.
  // See: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
  key: process.env.ARCJET_KEY!,
  // Define a global characteristic that we can use to identify users
  characteristics: ["fingerprint"],
  // Define the global rules that we want to run on every request
  rules: [
    // Shield detects suspicious behavior, such as SQL injection and cross-site
    // scripting attacks. We want to run it on every request
    shield({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
    }),
  ],
});
