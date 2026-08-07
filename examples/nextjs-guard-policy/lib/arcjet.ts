import { launchArcjet } from "@arcjet/guard";
import { rampart } from "@arcjet/sensitive-info-rampart";

const key = process.env.ARCJET_KEY;
if (!key) {
  throw new Error("ARCJET_KEY is required. Copy .env.local.example to .env.local and set it.");
}

export const arcjet = launchArcjet({
  key,
  baseUrl: process.env.ARCJET_BASE_URL,
  sensitiveInfoBackend: rampart(),
});
