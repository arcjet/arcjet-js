/**
 * Load the Vercel AI SDK peers, or throw a single install line.
 *
 * A static `import { jsonSchema } from "ai"` fails at link time with Node's
 * generic `ERR_MODULE_NOT_FOUND` and names only the specifier that happened
 * to resolve first. Both `ai` and `@ai-sdk/provider-utils` are required, so
 * the load is deferred and any miss becomes one sentence.
 */

export const AI_PEERS_INSTALL_MESSAGE: string = "install ai and @ai-sdk/provider-utils.";

export function missingAiPeersError(cause?: unknown): Error {
  if (cause === undefined) {
    return new Error(`@arcjet/guard/vercel-ai/v7: ${AI_PEERS_INSTALL_MESSAGE}`);
  }
  return new Error(`@arcjet/guard/vercel-ai/v7: ${AI_PEERS_INSTALL_MESSAGE}`, {
    cause,
  });
}

export async function importAi(): Promise<typeof import("ai")> {
  try {
    const [ai] = await Promise.all([import("ai"), import("@ai-sdk/provider-utils")]);
    return ai;
  } catch (error) {
    throw missingAiPeersError(error);
  }
}
