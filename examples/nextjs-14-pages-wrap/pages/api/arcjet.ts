// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import arcjet, { rateLimit, withArcjet } from "@arcjet/next";
import type { NextApiRequest, NextApiResponse } from "next";

const aj = arcjet({
  // mark
  key: "ajkey_yourkey",
  rules: [
    rateLimit({
      mode: "LIVE",
      // Limiting by ip.src is the default if not specified
      //characteristics: ["ip.src"],
      window: "1m",
      max: 1,
      timeout: "10m",
    }),
  ],
});

export default withArcjet(
  aj,
  async function handler(req: NextApiRequest, res: NextApiResponse) {
    res.status(200).json({ name: "Hello world" });
  },
);
