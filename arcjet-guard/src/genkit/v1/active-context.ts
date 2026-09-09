/**
 * The generate() context Genkit stores in async-local storage. Authored
 * tool handlers see it on `{ context }` even when the ToolAction call's
 * `options` omit it — `generate({ context })` does not copy that object
 * onto the tool invocation.
 *
 * Dynamic import so this namespace stays loadable when the optional
 * `genkit` peer is absent. Construction only runs on a live tool call,
 * which is only reachable in an app that already installed Genkit.
 */

let loadedGetContext: (() => unknown) | undefined;
let loadFailed = false;

async function readActiveContext(): Promise<unknown> {
  if (loadFailed) {
    return undefined;
  }
  if (loadedGetContext === undefined) {
    try {
      const core = await import("@genkit-ai/core");
      if (typeof core.getContext !== "function") {
        loadFailed = true;
        return undefined;
      }
      loadedGetContext = core.getContext;
    } catch {
      loadFailed = true;
      return undefined;
    }
  }
  try {
    return loadedGetContext();
  } catch {
    return undefined;
  }
}

function hasOwnContext(value: unknown): boolean {
  if (value === null || typeof value !== "object" || !("context" in value)) {
    return false;
  }
  const context = (value as { context?: unknown }).context;
  return context !== undefined && context !== null;
}

/**
 * Attach the ALS generate context onto a tool-call options / middleware
 * `ctx` object when that object does not already carry `context`.
 */
export async function withActiveGenkitContext(options: unknown): Promise<unknown> {
  if (hasOwnContext(options)) {
    return options;
  }
  const active = await readActiveContext();
  if (active === undefined) {
    return options;
  }
  if (options !== null && typeof options === "object") {
    return { ...options, context: active };
  }
  return { context: active };
}
