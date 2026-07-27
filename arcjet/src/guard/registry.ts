import { createFailOpenDecision } from "./client.ts";
import {
  createDiagnosticHandler,
  symbolArcjetDiagnostics,
  type ArcjetDiagnostic,
  type DiagnosticHandler,
} from "./diagnostics.ts";
import type { ArcjetClient } from "./index.ts";
import type { CaptureOptions, Decision, GuardOptions } from "./types.ts";

/** One slot shared by duplicate package copies in the same JavaScript realm. */
const CLIENT_SLOT = Symbol.for("arcjet.client");

type GlobalWithArcjet = typeof globalThis & {
  [CLIENT_SLOT]?: ArcjetClient;
};

type ClientWithDiagnostics = ArcjetClient & {
  [symbolArcjetDiagnostics]: DiagnosticHandler;
};

const fallbackDiagnostics = createDiagnosticHandler();

/** Register a client for the free `guard()`, `capture()`, and `flush()` calls. */
export function registerArcjet(client: ArcjetClient): void {
  const globalWithArcjet: GlobalWithArcjet = globalThis;
  const incumbent = globalWithArcjet[CLIENT_SLOT];
  if (incumbent === undefined) {
    globalWithArcjet[CLIENT_SLOT] = client;
    return;
  }
  if (incumbent === client) {
    return;
  }

  diagnose(incumbent, {
    code: "AJ3004",
    message: "An Arcjet client is already registered; the incumbent was preserved",
  });
}

/** Clear the currently registered client, if any. */
export function unregisterArcjet(): void {
  const globalWithArcjet: GlobalWithArcjet = globalThis;
  // oxlint-disable-next-line typescript/no-dynamic-delete -- clear the global slot
  delete globalWithArcjet[CLIENT_SLOT];
}

/** Evaluate guard rules through the registered client. */
export function guard(options: GuardOptions): Promise<Decision> {
  const client = registeredClient();
  if (client) {
    return client.guard(options);
  }
  diagnoseMissingClient();
  return Promise.resolve(
    createFailOpenDecision("guard() called without a registered Arcjet client"),
  );
}

/** Capture an event through the registered client. */
export function capture(options: CaptureOptions): void {
  const client = registeredClient();
  if (client) {
    client.capture(options);
    return;
  }
  diagnoseMissingClient();
}

/** Flush the registered client's capture delivery queue. */
export function flush(timeoutMs?: number): Promise<void> {
  const client = registeredClient();
  if (client) {
    return client.flush(timeoutMs);
  }
  diagnoseMissingClient();
  return Promise.resolve();
}

function registeredClient(): ArcjetClient | undefined {
  const globalWithArcjet: GlobalWithArcjet = globalThis;
  return globalWithArcjet[CLIENT_SLOT];
}

function diagnoseMissingClient(): void {
  fallbackDiagnostics({
    code: "AJ3005",
    message: "No Arcjet client is registered; the operation failed open",
  });
}

function diagnose(client: ArcjetClient, diagnostic: ArcjetDiagnostic): void {
  if (hasDiagnostics(client)) {
    client[symbolArcjetDiagnostics](diagnostic);
  } else {
    fallbackDiagnostics(diagnostic);
  }
}

function hasDiagnostics(client: ArcjetClient): client is ClientWithDiagnostics {
  return symbolArcjetDiagnostics in client && typeof client[symbolArcjetDiagnostics] === "function";
}
