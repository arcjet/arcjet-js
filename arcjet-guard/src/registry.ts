/**
 * Optional process-wide registration for an Arcjet client.
 *
 * Registering exists for one reason: so code that cannot reach a client handle
 * can still call `guard()` and `capture()`. Passing a client explicitly always
 * works and is the recommended path — this is the shortcut, not the default.
 *
 * Nothing here runs unless an application calls {@link registerArcjet}.
 * `launchArcjet()` has no global side effects.
 *
 * @packageDocumentation
 */

import { createFailOpenDecision } from "./client.ts";
import {
  createDiagnosticHandler,
  symbolArcjetDiagnostics,
  type ArcjetDiagnostic,
  type DiagnosticHandler,
} from "./diagnostics.ts";
import type { ArcjetGuard } from "./index.ts";
import { symbolArcjetClient } from "./symbol.ts";
import type { CaptureOptions, Decision, GuardOptions } from "./types.ts";

type GlobalWithArcjet = typeof globalThis & {
  [symbolArcjetClient]?: ArcjetGuard;
};

type ClientWithDiagnostics = ArcjetGuard & {
  [symbolArcjetDiagnostics]: DiagnosticHandler;
};

/**
 * Where a diagnostic goes when no registered client can take it.
 *
 * Module-scoped so it coalesces across calls: `capture()` sits on request
 * paths, and an application that forgot to register would otherwise emit a
 * line per event.
 */
const fallbackDiagnostics = createDiagnosticHandler();

/**
 * Register a client for the free {@link guard}, {@link capture} and
 * {@link flush} functions.
 *
 * Guarded on purpose. If something tries to register a second client the first
 * one stays and the attempt is reported, so a library — or a stray second
 * `launchArcjet()` — cannot quietly redirect an application's telemetry to a
 * different key. Registering the client that is already registered is a no-op
 * rather than a warning, so a module evaluated twice stays silent.
 *
 * @example
 * ```ts
 * // instrumentation.ts, or whatever runs at startup
 * import { launchArcjet, registerArcjet } from "@arcjet/guard";
 *
 * registerArcjet(launchArcjet({ key: process.env.ARCJET_KEY! }));
 * ```
 */
export function registerArcjet(client: ArcjetGuard): void {
  const globalWithArcjet: GlobalWithArcjet = globalThis;
  const incumbent = globalWithArcjet[symbolArcjetClient];

  if (incumbent === undefined) {
    globalWithArcjet[symbolArcjetClient] = client;
    return;
  }

  if (incumbent === client) {
    return;
  }

  // Reported on the incumbent's logger, not the late registrant's: the
  // application that registered first configured that sink, and it is the one
  // whose telemetry an unnoticed second registration would have redirected.
  diagnose(incumbent, {
    code: "AJ3004",
    message: "An Arcjet client is already registered; the existing one was kept",
  });
}

/**
 * Clear the registered client, if any.
 *
 * Takes no argument and clears whatever is there. That asymmetry with
 * {@link registerArcjet} is deliberate: requiring the client back would mean
 * every teardown has to keep hold of it, which is the exact problem
 * registration exists to avoid.
 *
 * The cost is that anything calling this clears the application's client, and
 * every free call after it fails open. Libraries should not call it — they take
 * a client explicitly. That is a convention, not something enforced here.
 */
export function unregisterArcjet(): void {
  const globalWithArcjet: GlobalWithArcjet = globalThis;
  // oxlint-disable-next-line typescript/no-dynamic-delete -- clearing the slot
  delete globalWithArcjet[symbolArcjetClient];
}

/**
 * Evaluate guard rules through the registered client.
 *
 * With nothing registered this returns a fail-open ALLOW carrying an error
 * result, so `decision.hasFailedOpen()` is true. It does not throw: these
 * functions behave exactly like the client methods they forward to, and the
 * never-throw contract holds.
 *
 * @example
 * ```ts
 * import { guard, detectPromptInjection } from "@arcjet/guard";
 *
 * const decision = await guard({
 *   label: "support.reply",
 *   rules: [detectPromptInjection()(userMessage)],
 * });
 * ```
 */
export function guard(options: GuardOptions): Promise<Decision> {
  const client = registeredClient();
  if (client !== undefined) {
    return client.guard(options);
  }

  diagnoseMissingClient();
  return Promise.resolve(
    createFailOpenDecision("guard() was called with no registered Arcjet client"),
  );
}

/**
 * Record a fact about what the application did, through the registered client.
 *
 * With nothing registered the event is dropped and diagnosed. Capture is
 * best-effort telemetry, which is what makes dropping acceptable — the
 * diagnostic is the only way to hear about it, since a dropped event never
 * reaches the server and so has no response to carry a warning back on.
 *
 * @example
 * ```ts
 * // deep in application code — nothing was passed down here
 * import { capture } from "@arcjet/guard";
 *
 * export async function refund(id: string): Promise<void> {
 *   await issueRefund(id);
 *   capture({ action: "refund.issued", metadata: { invoice: id } });
 * }
 * ```
 */
export function capture(options: CaptureOptions): void {
  const client = registeredClient();
  if (client !== undefined) {
    client.capture(options);
    return;
  }

  diagnoseMissingClient();
}

/**
 * Drain the registered client's buffered capture events within a deadline.
 *
 * Resolves immediately with nothing registered — there is no queue to drain.
 */
export function flush(timeoutMs?: number): Promise<void> {
  const client = registeredClient();
  if (client !== undefined) {
    return client.flush(timeoutMs);
  }

  diagnoseMissingClient();
  return Promise.resolve();
}

/**
 * Register a client, refusing to displace or silently share with an incumbent.
 *
 * The test client uses this instead of {@link registerArcjet} because the
 * failure modes invert under test. In an application a second registration
 * should be survivable, so it warns and carries on. In a test suite a client
 * left registered by an earlier test is a leak that makes the current test
 * assert against the wrong recorder — quietly, and usually somewhere else. So
 * this throws.
 *
 * @internal Not part of the public API. Unreachable outside the package: the
 * `exports` map lists no path that resolves here.
 */
export function registerArcjetForTesting(client: ArcjetGuard): void {
  const globalWithArcjet: GlobalWithArcjet = globalThis;
  if (globalWithArcjet[symbolArcjetClient] !== undefined) {
    throw new Error(
      "An Arcjet client is already registered. Call unregisterArcjet() first — " +
        "an earlier test probably left one behind.",
    );
  }

  globalWithArcjet[symbolArcjetClient] = client;
}

/**
 * The currently registered client, if any.
 *
 * @internal Not part of the public API. Unreachable outside the package: the
 * `exports` map lists no path that resolves here.
 */
export function registeredClient(): ArcjetGuard | undefined {
  const globalWithArcjet: GlobalWithArcjet = globalThis;
  return globalWithArcjet[symbolArcjetClient];
}

/**
 * Report that a free call found nothing registered.
 *
 * This is the one failure the SDK cannot report well: with no client there is
 * no configured logger either, so it can only reach the coalescing fallback.
 */
function diagnoseMissingClient(): void {
  fallbackDiagnostics({
    code: "AJ3005",
    message: "No Arcjet client is registered; the call failed open",
  });
}

function diagnose(client: ArcjetGuard, diagnostic: ArcjetDiagnostic): void {
  if (hasDiagnostics(client)) {
    client[symbolArcjetDiagnostics](diagnostic);
    return;
  }

  fallbackDiagnostics(diagnostic);
}

/**
 * Whether a client carries a diagnostics channel.
 *
 * Anything can be registered — the test client is not built by
 * `launchArcjet()`, and neither is a hand-rolled fake — so the channel is
 * checked for rather than assumed.
 */
function hasDiagnostics(client: ArcjetGuard): client is ClientWithDiagnostics {
  return symbolArcjetDiagnostics in client && typeof client[symbolArcjetDiagnostics] === "function";
}
