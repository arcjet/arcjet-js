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
  symbolArcjetDiagnostics,
  type ArcjetDiagnostic,
  type DiagnosticHandler,
} from "./diagnostics.ts";
import type { ArcjetGuard } from "./index.ts";
import { symbolArcjetClient } from "./symbol.ts";
import type { CaptureOptions, Decision, GuardOptions } from "./types.ts";
import { VERSION } from "./version.ts";

type GlobalWithArcjet = typeof globalThis & {
  [symbolArcjetClient]?: unknown;
};

type ClientWithDiagnostics = ArcjetGuard & {
  [symbolArcjetDiagnostics]: DiagnosticHandler;
};

/**
 * What actually goes in the global slot.
 *
 * The client is wrapped rather than stored bare so the version travels with
 * it, and so registering never has to mutate an object the caller owns.
 */
type Registration = {
  version: string;
  client: ArcjetGuard;
};

/**
 * Whether a registration was written by this exact build of the SDK.
 *
 * `Symbol.for` is realm-wide, so the slot is shared by every copy of
 * `@arcjet/guard` in the process — including copies at other versions, which
 * is the normal outcome of one dependency pinning a different range than
 * another. What is stored is a live object, and its usable surface is more
 * than the three public methods: the diagnostics symbol, the decision shape,
 * and the internal symbols on it are only guaranteed within a single build.
 *
 * So the check is exact string equality, not a range. A copy that finds a
 * registration it did not write treats it as absent and fails open, which is
 * the same degradation as nothing being registered at all. The cost is that
 * two versions in one process do not share a client — each keeps whatever it
 * registered, and the one that lost the race fails open rather than calling
 * into a shape it cannot verify.
 */
function isCurrentVersion(registration: Registration): boolean {
  return registration.version === VERSION;
}

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
  // Plain JavaScript callers can bypass the types, and a value that is not a
  // client would turn every later free call into a TypeError thrown into
  // application code. Refusing it here keeps the slot holding only things the
  // free calls can actually invoke.
  if (!isClient(client)) {
    return;
  }

  const globalWithArcjet: GlobalWithArcjet = globalThis;
  const existing = readRegistration();

  if (existing === undefined) {
    globalWithArcjet[symbolArcjetClient] = { version: VERSION, client };
    return;
  }

  if (!isCurrentVersion(existing)) {
    // A different build of the SDK owns the slot. Displacing it would break
    // that copy's free calls, so the incumbent stays and this copy degrades to
    // failing open — the same outcome as nothing being registered.
    //
    // Reported on the *registrant's* channel, unlike the same-version case
    // below. The incumbent belongs to a build whose internals this one cannot
    // verify, so its diagnostics channel is exactly what must not be called.
    diagnose(client, {
      code: "AJ3006",
      message:
        "An Arcjet client from a different SDK version is registered; the existing one was kept",
    });
    return;
  }

  if (existing.client === client) {
    return;
  }

  // Reported on the incumbent's logger, not the late registrant's: the
  // application that registered first configured that sink, and it is the one
  // whose telemetry an unnoticed second registration would have redirected.
  diagnose(existing.client, {
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

  // The decision is the report. It carries an error result, so
  // `hasFailedOpen()` is true and a caller that inspects it sees that no policy
  // ran — which is a better signal than a log line nobody configured.
  return Promise.resolve(
    createFailOpenDecision("guard() was called with no registered Arcjet client"),
  );
}

/**
 * Record a fact about what the application did, through the registered client.
 *
 * With nothing registered the event is dropped silently. Capture is best-effort
 * telemetry, which is what makes dropping acceptable, and this path has no
 * configured logger to report to — the client that would have carried one is
 * the thing that is missing.
 *
 * Silence is the deliberate choice over an unconfigurable console warning,
 * which would be noise on a request path with no way to turn it off. Making
 * this observable is a future opt-in on the call itself, so an application that
 * wants to hear about it can ask.
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
  }
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
  // `in` rather than a validated read: anything at all in the slot — including
  // a record this build cannot parse — means an earlier test left something
  // behind, which is what this is here to catch.
  if (symbolArcjetClient in globalWithArcjet) {
    throw new Error(
      "An Arcjet client is already registered. Call unregisterArcjet() first — " +
        "an earlier test probably left one behind.",
    );
  }

  globalWithArcjet[symbolArcjetClient] = { version: VERSION, client };
}

/**
 * The currently registered client, if any.
 *
 * @internal Not part of the public API. Unreachable outside the package: the
 * `exports` map lists no path that resolves here.
 */
export function registeredClient(): ArcjetGuard | undefined {
  const registration = readRegistration();
  if (registration === undefined || !isCurrentVersion(registration)) {
    return undefined;
  }

  return registration.client;
}

/**
 * Read and validate whatever is in the global slot.
 *
 * Validated on the way out, not only on the way in. The slot lives on
 * `globalThis` under a well-known symbol, so anything in the process can write
 * to it — a `null`, a half-built value, or a record from a version whose shape
 * this build cannot vouch for. Any of those reaching a call site would surface
 * as a TypeError thrown from `capture()` deep in application code, which is
 * what the never-throw contract exists to prevent.
 *
 * Returns the record regardless of version so callers can tell "nothing is
 * registered" from "another version registered", which need different
 * handling: the first is a free slot, the second is somebody else's.
 */
function readRegistration(): Registration | undefined {
  const globalWithArcjet: GlobalWithArcjet = globalThis;
  const candidate = globalWithArcjet[symbolArcjetClient];

  if (typeof candidate !== "object" || candidate === null) {
    return undefined;
  }

  const registration = candidate as Partial<Registration>;
  if (typeof registration.version !== "string" || !isClient(registration.client)) {
    return undefined;
  }

  return { version: registration.version, client: registration.client };
}

/**
 * Whether a value can actually serve the free calls.
 *
 * Structural rather than an instance check, because the test client and
 * hand-rolled fakes are legitimate registrations and none of them are built by
 * `launchArcjet()`.
 */
function isClient(value: unknown): value is ArcjetGuard {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<ArcjetGuard>;
  return (
    typeof candidate.guard === "function" &&
    typeof candidate.capture === "function" &&
    typeof candidate.flush === "function"
  );
}

/**
 * Report a diagnostic on a client's own channel.
 *
 * Drops it when the client has no channel. There is deliberately no fallback
 * sink: an unconfigurable console warning is noise an application cannot turn
 * off, and every client built by `launchArcjet()` carries a channel.
 */
function diagnose(client: ArcjetGuard, diagnostic: ArcjetDiagnostic): void {
  if (hasDiagnostics(client)) {
    client[symbolArcjetDiagnostics](diagnostic);
  }
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
