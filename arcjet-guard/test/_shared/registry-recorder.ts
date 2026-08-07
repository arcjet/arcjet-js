/**
 * Recording client doubles shared by the registration tests.
 *
 * Lives under `test/` rather than `src/` because the build globs
 * `src/**\/*.ts` minus `*.test.ts`, so a helper here would otherwise be emitted
 * into `dist/`.
 *
 * @packageDocumentation
 */

import { createFailOpenDecision } from "../../src/client.ts";
import { symbolArcjetDiagnostics, type ArcjetDiagnostic } from "../../src/diagnostics.ts";
import type { ArcjetGuard } from "../../src/index.ts";
import { symbolArcjetClient } from "../../src/symbol.ts";
import type { CaptureOptions, Decision, GuardOptions } from "../../src/types.ts";

/** A client that records every call made through it. */
export type Recorder = ArcjetGuard & {
  guards: GuardOptions[];
  captures: CaptureOptions[];
  flushes: (number | undefined)[];
};

/** A {@link Recorder} that also records what the registry reported to it. */
export type RecorderWithDiagnostics = Recorder & { diagnostics: ArcjetDiagnostic[] };

/** Build a recording client. */
export function recorder(): Recorder {
  const guards: GuardOptions[] = [];
  const captures: CaptureOptions[] = [];
  const flushes: (number | undefined)[] = [];
  return {
    guards,
    captures,
    flushes,
    guard(options: GuardOptions): Promise<Decision> {
      guards.push(options);
      return Promise.resolve(createFailOpenDecision("stub"));
    },
    capture(options: CaptureOptions): void {
      captures.push(options);
    },
    flush(timeoutMs?: number): Promise<void> {
      flushes.push(timeoutMs);
      return Promise.resolve();
    },
  };
}

/** Build a recording client carrying a diagnostics channel. */
export function recorderWithDiagnostics(): RecorderWithDiagnostics {
  const diagnostics: ArcjetDiagnostic[] = [];
  return Object.assign(recorder(), {
    diagnostics,
    [symbolArcjetDiagnostics]: (diagnostic: ArcjetDiagnostic): void => {
      diagnostics.push(diagnostic);
    },
  });
}

/**
 * Put an arbitrary value in the global slot, bypassing `registerArcjet`.
 *
 * Used to simulate what another copy of the SDK — or anything else in the
 * process — could leave there.
 */
export function writeSlot(value: unknown): void {
  Object.defineProperty(globalThis, symbolArcjetClient, {
    configurable: true,
    enumerable: false,
    value,
    writable: true,
  });
}
