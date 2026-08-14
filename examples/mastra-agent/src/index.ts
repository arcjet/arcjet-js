import {
  MASTRA_RESOURCE_ID_KEY,
  MASTRA_THREAD_ID_KEY,
  RequestContext,
} from "@mastra/core/request-context";

import { agent } from "./agent.js";

/**
 * Run one turn with Mastra's reserved correlation keys set.
 *
 * Manual E2E with a real ARCJET_KEY is still-to-verify. This file exists so
 * the example typechecks the inbound PI processor, guarded tools (deny / PII
 * on args / rate limit / fail-closed), hooks, and thread/resource correlation.
 */
export async function runTurn(options: {
  message: string;
  conversationId: string;
  userId: string;
}): Promise<unknown> {
  const requestContext = new RequestContext();
  requestContext.set(MASTRA_THREAD_ID_KEY, options.conversationId);
  requestContext.set(MASTRA_RESOURCE_ID_KEY, options.userId);

  return await agent.generate(options.message, { requestContext });
}

export { agent } from "./agent.js";
