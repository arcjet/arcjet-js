import { shouldWarn } from "../../agents/capture.ts";
import { correlationIdProblem } from "../../agents/context.ts";
import type { ArcjetMetadata } from "../../types.ts";

/**
 * Reserved RequestContext keys from `@mastra/core`. Hardcoded so this module
 * never value-imports Mastra — CI must pass with `@mastra/core` absent from
 * `node_modules`.
 *
 * @see https://mastra.ai/docs/server/request-context
 */
export const MASTRA_THREAD_ID_KEY = "mastra__threadId" as const;
export const MASTRA_RESOURCE_ID_KEY = "mastra__resourceId" as const;

/**
 * Minimal RequestContext surface this helper reads. Structural so tests and
 * callers can pass a Map-like mock without importing Mastra.
 */
export interface MastraRequestContextLike {
  get(key: string): unknown;
}

/**
 * Execution-shaped source `mastraAgentContext` can read. Accepts a
 * RequestContext directly, or a tool / processor / hook context that carries
 * `requestContext`, optional agent thread/resource, and optional workflow run.
 */
export interface MastraContextSource {
  requestContext?: MastraRequestContextLike;
  agent?: {
    threadId?: string;
    resourceId?: string;
  };
  workflow?: {
    runId?: string;
  };
}

/**
 * Context derived from Mastra. `correlationId` is omitted when Mastra did not
 * provide a valid thread, resource, or run id — this helper never mints one.
 */
export interface MastraAgentContext {
  correlationId?: string;
  metadata?: ArcjetMetadata;
}

function isRequestContextLike(value: unknown): value is MastraRequestContextLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "get" in value &&
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- structural `get` check without importing Mastra
    typeof (value as { get?: unknown }).get === "function"
  );
}

function asContextSource(source: unknown): MastraContextSource | undefined {
  if (source === undefined || source === null) {
    return undefined;
  }
  if (isRequestContextLike(source)) {
    return { requestContext: source };
  }
  if (typeof source === "object") {
    return source;
  }
  return undefined;
}

function readContextValue(
  requestContext: MastraRequestContextLike | undefined,
  key: string,
): unknown {
  if (requestContext === undefined) {
    return undefined;
  }
  try {
    return requestContext.get(key);
  } catch {
    return undefined;
  }
}

function firstValidId(
  candidates: ReadonlyArray<{ value: unknown; label: string }>,
): { id: string | undefined; rejected: string | undefined } {
  let rejected: string | undefined;
  for (const candidate of candidates) {
    if (typeof candidate.value !== "string") {
      continue;
    }
    const problem = correlationIdProblem(candidate.value);
    if (problem === undefined) {
      return { id: candidate.value, rejected: undefined };
    }
    rejected = `${candidate.label} (${problem})`;
  }
  return { id: undefined, rejected };
}

/**
 * Derive correlation and metadata from a Mastra RequestContext or execution
 * context. Never mints a new id.
 *
 * Preference order for `correlationId`:
 * 1. `MASTRA_THREAD_ID_KEY` (`mastra__threadId`), then `agent.threadId`
 * 2. `MASTRA_RESOURCE_ID_KEY` (`mastra__resourceId`), then `agent.resourceId`
 * 3. `workflow.runId`
 *
 * An invalid candidate is skipped (and warned when `ARCJET_LOG_LEVEL` asks
 * for warnings). If nothing valid remains, `correlationId` is omitted so the
 * decision is uncorrelated rather than joined to a generated id nobody has.
 *
 * @example
 * ```ts
 * import { mastraAgentContext } from "@arcjet/guard/mastra/v1";
 * import type { RequestContext } from "@mastra/core/request-context";
 *
 * export function fromRequest(requestContext: RequestContext) {
 *   return mastraAgentContext(requestContext);
 * }
 * ```
 */
export function mastraAgentContext(
  source?: MastraRequestContextLike | MastraContextSource,
  init?: { metadata?: ArcjetMetadata },
): MastraAgentContext {
  const ctx = asContextSource(source);
  const requestContext = ctx?.requestContext;

  const threadFromKey = readContextValue(requestContext, MASTRA_THREAD_ID_KEY);
  const resourceFromKey = readContextValue(requestContext, MASTRA_RESOURCE_ID_KEY);
  const threadFromAgent = ctx?.agent?.threadId;
  const resourceFromAgent = ctx?.agent?.resourceId;
  const runFromWorkflow = ctx?.workflow?.runId;

  const { id: correlationId, rejected } = firstValidId([
    { value: threadFromKey, label: "thread id" },
    { value: threadFromAgent, label: "agent.threadId" },
    { value: resourceFromKey, label: "resource id" },
    { value: resourceFromAgent, label: "agent.resourceId" },
    { value: runFromWorkflow, label: "workflow.runId" },
  ]);

  if (rejected !== undefined && correlationId === undefined && shouldWarn()) {
    console.warn(
      `@arcjet/guard: Mastra ${rejected} rejected; no valid thread/resource/run id, leaving the call uncorrelated`,
    );
  }

  const derivedMetadata: ArcjetMetadata = {};

  if (typeof threadFromKey === "string") {
    derivedMetadata["mastra.thread"] = threadFromKey;
  } else if (typeof threadFromAgent === "string") {
    derivedMetadata["mastra.thread"] = threadFromAgent;
  }

  if (typeof resourceFromKey === "string") {
    derivedMetadata["mastra.resource"] = resourceFromKey;
  } else if (typeof resourceFromAgent === "string") {
    derivedMetadata["mastra.resource"] = resourceFromAgent;
  }

  if (typeof runFromWorkflow === "string") {
    derivedMetadata["mastra.run"] = runFromWorkflow;
  }

  const user =
    (typeof resourceFromKey === "string" && resourceFromKey.length > 0
      ? resourceFromKey
      : undefined) ??
    (typeof resourceFromAgent === "string" && resourceFromAgent.length > 0
      ? resourceFromAgent
      : undefined);
  if (user !== undefined) {
    derivedMetadata["user"] = user;
  }

  const metadata: ArcjetMetadata = { ...derivedMetadata, ...init?.metadata };
  const result: MastraAgentContext = {};

  if (correlationId !== undefined) {
    result.correlationId = correlationId;
  }
  if (Object.keys(metadata).length > 0) {
    result.metadata = metadata;
  }

  return result;
}
