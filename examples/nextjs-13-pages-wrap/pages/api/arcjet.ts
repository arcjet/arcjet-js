// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import arcjet, { fixedWindow, withArcjet } from "@arcjet/next";
import type { NextApiRequest, NextApiResponse } from "next";

const aj = arcjet({
  // Get your site key from https://app.arcjet.com
  // and set it as an environment variable rather than hard coding.
  // See: https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables
  key: process.env.AJ_KEY!,
  rules: [
    fixedWindow({
      mode: "LIVE",
      // Limiting by ip.src is the default if not specified
      //characteristics: ["ip.src"],
      window: "1m",
      max: 1,
    }),
  ],
});

export default withArcjet(
  aj,
  async function handler(req: NextApiRequest, res: NextApiResponse) {
    res.status(200).json({ name: "Hello world" });
  },
);