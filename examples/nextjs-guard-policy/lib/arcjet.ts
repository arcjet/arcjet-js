import { launchArcjet } from "@arcjet/guard";
import { rampart } from "@arcjet/sensitive-info-rampart";

export const arcjet = launchArcjet({
  key: process.env.ARCJET_KEY!,
  baseUrl: process.env.ARCJET_BASE_URL,
  sensitiveInfoBackend: rampart(),
});
