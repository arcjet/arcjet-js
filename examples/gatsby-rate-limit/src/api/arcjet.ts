// @ts-expect-error: TS1479: TS emits ESM/CJS error, which Gatsby solves.
import arcjet, { slidingWindow } from "@arcjet/node";
import type { GatsbyFunctionRequest, GatsbyFunctionResponse } from 'gatsby';

const aj = arcjet({
    key: process.env.ARCJET_KEY!,
    rules: [
        slidingWindow({
            mode: "LIVE",
            interval: "1m",
            max: 1,
        }),
    ],
});

export default async function handler(
    req: GatsbyFunctionRequest,
    res: GatsbyFunctionResponse
) {
    const decision = await aj.protect(req);

    console.log("Arcjet decision", decision);

    if (decision.isErrored()) {
        console.error("Encountered Arcjet Error", decision.reason);
    }

    if (decision.isDenied()) {
        if (decision.reason.type === "RATE_LIMIT") {
            return res.status(429).json({ error: "Too many requests" });
        }

        return res.status(403).json({ error: "Forbidden" });
    }

    return res.json({ message: "Hello world!" });
}
