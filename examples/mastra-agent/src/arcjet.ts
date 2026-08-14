import { launchArcjet, tokenBucket } from "@arcjet/guard";

export const arcjet = launchArcjet({
  key: process.env["ARCJET_KEY"] ?? "",
  baseUrl: process.env["ARCJET_BASE_URL"],
});

export const orderLookupLimit = tokenBucket({
  bucket: "order-lookup",
  refillRate: 10,
  intervalSeconds: 60,
  maxTokens: 10,
});

export const refundLimit = tokenBucket({
  bucket: "refunds",
  refillRate: 3,
  intervalSeconds: 60,
  maxTokens: 3,
});

export const mcpLimit = tokenBucket({
  bucket: "mcp-access",
  refillRate: 20,
  intervalSeconds: 60,
  maxTokens: 20,
});
