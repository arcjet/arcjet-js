import { shouldWarn } from "../../agents/capture.ts";
import { correlationIdProblem } from "../../agents/context.ts";
import type { ArcjetMetadata } from "../../types.ts";

/**
 * Structural source `langgraphAgentContext` can read. Accepts a LangGraph
 * `RunnableConfig` (`configurable.thread_id`), a `ToolRuntime` (which spreads
 * that config and also nests it on `config`), or the `configurable` object
 * itself.
 *
 * Declared here so this module never value-imports `@langchain/langgraph` or
 * `@langchain/core` — CI must pass with those packages absent from
 * `node_modules`.
 */
export interface LangGraphContextSource {
  configurable?: Record<string, unknown>;
  config?: {
    configurable?: Record<string, unknown>;
    runId?: unknown;
    metadata?: Record<string, unknown>;
  };
  runId?: unknown;
  metadata?: Record<string, unknown>;
  thread_id?: unknown;
  checkpoint_ns?: unknown;
}

/**
 * Context derived from a LangGraph run. `correlationId` is omitted when the
 * graph did not provide a valid thread / checkpoint namespace / run id —
 * this helper never mints one.
 */
export interface LangGraphAgentContext {
  correlationId?: string;
  metadata?: ArcjetMetadata;
}

function asContextSource(source: unknown): LangGraphContextSource | undefined {
  if (source === undefined || source === null || typeof source !== "object") {
    return undefined;
  }
  return source;
}

function firstValidId(candidates: ReadonlyArray<{ value: unknown; label: string }>): {
  id: string | undefined;
  rejected: string | undefined;
} {
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

function firstString(values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

function readConfigurable(
  source: LangGraphContextSource | undefined,
): Record<string, unknown> | undefined {
  if (source === undefined) {
    return undefined;
  }
  if (source.configurable !== null && typeof source.configurable === "object") {
    return source.configurable;
  }
  if (source.config?.configurable !== null && typeof source.config?.configurable === "object") {
    return source.config.configurable;
  }
  if (source.thread_id !== undefined || source.checkpoint_ns !== undefined) {
    const configurable: Record<string, unknown> = {};
    if (source.thread_id !== undefined) {
      configurable["thread_id"] = source.thread_id;
    }
    if (source.checkpoint_ns !== undefined) {
      configurable["checkpoint_ns"] = source.checkpoint_ns;
    }
    return configurable;
  }
  return undefined;
}

/**
 * Derive correlation and metadata from a LangGraph `RunnableConfig` /
 * `ToolRuntime`. Never mints a new id. Never calls `createAgentContext`.
 *
 * Preference order for `correlationId`:
 * 1. `configurable.thread_id` — the checkpointer thread, what the graph
 *    already has
 * 2. `runId` / `configurable.run_id` — only if the graph already set one
 * 3. `configurable.checkpoint_ns` — subgraph namespace, a last resort
 *    (`""` for the parent graph is skipped as empty)
 *
 * An invalid candidate is skipped (and warned when `ARCJET_LOG_LEVEL` asks
 * for warnings). If nothing valid remains, `correlationId` is omitted so the
 * decision is uncorrelated rather than joined to a generated id nobody has.
 *
 * @example
 * ```ts
 * import { langgraphAgentContext } from "@arcjet/guard/langgraph/v1";
 *
 * export function fromConfig(config: { configurable?: { thread_id?: string } }) {
 *   return langgraphAgentContext(config);
 * }
 * ```
 */
export function langgraphAgentContext(
  source?: LangGraphContextSource,
  init?: { metadata?: ArcjetMetadata },
): LangGraphAgentContext {
  const ctx = asContextSource(source);
  const configurable = readConfigurable(ctx);

  const threadId = configurable?.["thread_id"];
  const checkpointNs = configurable?.["checkpoint_ns"];
  const runId = ctx?.runId ?? ctx?.config?.runId ?? configurable?.["run_id"];

  // Run id before checkpoint namespace: `checkpoint_ns` names a subgraph
  // (`"node_name:uuid"`, `""` for the parent), so sibling subgraphs of one
  // run would land under different correlation ids. A run id covers the whole
  // run, which is what a Sequence should join. The namespace stays as a last
  // resort and as metadata.
  const { id: correlationId, rejected } = firstValidId([
    { value: threadId, label: "thread_id" },
    { value: runId, label: "run id" },
    { value: checkpointNs, label: "checkpoint_ns" },
  ]);

  if (rejected !== undefined && correlationId === undefined && shouldWarn()) {
    console.warn(
      `@arcjet/guard: LangGraph ${rejected} rejected; no valid thread/checkpoint/run id, leaving the call uncorrelated`,
    );
  }

  const derivedMetadata: ArcjetMetadata = {};

  const thread = firstString([threadId]);
  if (thread !== undefined) {
    derivedMetadata["langgraph.thread"] = thread;
  }

  const namespace = firstString([checkpointNs]);
  if (namespace !== undefined) {
    derivedMetadata["langgraph.checkpoint_ns"] = namespace;
  }

  const run = firstString([runId]);
  if (run !== undefined) {
    derivedMetadata["langgraph.run"] = run;
  }

  const metadata: ArcjetMetadata = { ...derivedMetadata, ...init?.metadata };
  const result: LangGraphAgentContext = {};

  if (correlationId !== undefined) {
    result.correlationId = correlationId;
  }
  if (Object.keys(metadata).length > 0) {
    result.metadata = metadata;
  }

  return result;
}
