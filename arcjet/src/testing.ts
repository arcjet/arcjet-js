import { normalizeCaptureEvent } from "./guard/client.ts";
import { decisionMembers } from "./guard/convert.ts";
import { symbolArcjetDiagnostics, type DiagnosticHandler } from "./guard/diagnostics.ts";
import type { ArcjetClient } from "./guard/index.ts";
import { registerArcjetForTesting, unregisterArcjet } from "./guard/registry.ts";
import type {
  ArcjetMetadata,
  CaptureOptions,
  Decision,
  GuardOptions,
  Warning,
} from "./guard/types.ts";

const ignoreDiagnostic: DiagnosticHandler = () => {};

/** A capture event recorded synchronously by an {@link ArcjetTestClient}. */
export type ArcjetTestCapture = {
  action: string;
  correlationId?: string;
  decisionId?: string;
  occurredAt: Date;
  metadata: ArcjetMetadata;
  warnings: readonly Warning[];
};

/** A registered in-memory Arcjet client for application tests. */
export type ArcjetTestClient = ArcjetClient & {
  /** Capture events in call order. */
  readonly captures: readonly ArcjetTestCapture[];
  /** Guard calls in call order. */
  readonly guards: readonly GuardOptions[];
  /**
   * Unregister the client, so `using` cleans up at the end of the block.
   *
   * Disposal only unregisters. There is no transport and no delivery queue, so
   * there is nothing to drain — which is why this is a synchronous `dispose`
   * rather than an `asyncDispose` that would imply one.
   */
  [Symbol.dispose](): void;
};

/**
 * Register an in-memory client that records Guard and Capture calls.
 *
 * This is the one place launching and registering are a single act: a test that
 * wanted them separate would use `launchArcjet()` directly. Throws if another
 * client is already registered, which surfaces leaks from earlier tests.
 *
 * @example
 * ```ts
 * test("refund emits a capture", () => {
 *   using arcjet = registerTestClient();
 *
 *   refund();
 *
 *   assert.equal(arcjet.captures[0].action, "refund.issued");
 * });
 * ```
 */
export function registerTestClient(): ArcjetTestClient {
  const captures: ArcjetTestCapture[] = [];
  const guards: GuardOptions[] = [];

  const client: ArcjetTestClient & {
    [symbolArcjetDiagnostics]: DiagnosticHandler;
  } = {
    captures,
    guards,
    guard(options): Promise<Decision> {
      guards.push(options);
      return Promise.resolve(allowDecision());
    },
    capture(options: CaptureOptions): void {
      const event = normalizeCaptureEvent(options, ignoreDiagnostic);
      if (!event) {
        return;
      }

      const metadata: ArcjetMetadata = {};
      for (const [key, value] of Object.entries(event.metadataJson)) {
        Object.defineProperty(metadata, key, {
          configurable: true,
          enumerable: true,
          value: JSON.parse(value) as ArcjetMetadata[string],
          writable: true,
        });
      }
      captures.push({
        action: event.action,
        ...(event.correlationId === "" ? {} : { correlationId: event.correlationId }),
        ...(event.decisionId === "" ? {} : { decisionId: event.decisionId }),
        occurredAt: new Date(Number(event.occurredAtUnixMs)),
        metadata,
        warnings: event.localWarnings.map((warning) => ({
          code: warning.code,
          message: warning.message,
        })),
      });
    },
    flush(): Promise<void> {
      return Promise.resolve();
    },
    [Symbol.dispose](): void {
      unregisterArcjet();
    },
    [symbolArcjetDiagnostics]: ignoreDiagnostic,
  };

  registerArcjetForTesting(client);
  return client;
}

function allowDecision(): Decision {
  return {
    conclusion: "ALLOW",
    id: "",
    results: [],
    ...decisionMembers("ALLOW", [], []),
  };
}
