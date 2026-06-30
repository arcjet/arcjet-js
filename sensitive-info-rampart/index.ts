import type {
  DetectedSensitiveInfoEntity,
  SensitiveInfoEntities,
  SensitiveInfoResult,
} from "@arcjet/analyze";
import type {
  ArcjetSensitiveInfoType,
  SensitiveInfoBackend,
  SensitiveInfoBackendContext,
  SensitiveInfoBackendOptions,
} from "arcjet";
import { fromAnalyzeEntity, toAnalyzeEntity } from "./entities.js";
import { createModelRunner } from "./model.js";
import type { ModelOptions, ModelRunner } from "./model.js";
import { defaultRecognizers, runRecognizers } from "./recognizers.js";
import type { DetectedSpan, Recognizer } from "./recognizers.js";

export { rampartEntities } from "./entities.js";
export { defaultRecognizers } from "./recognizers.js";
export type { DetectedSpan, Recognizer } from "./recognizers.js";
export type { ModelOptions, ModelRunner, RawToken } from "./model.js";

/**
 * Options for the {@linkcode rampart} backend.
 */
export interface RampartOptions extends ModelOptions {
  /**
   * Deterministic recognizers to run alongside the model (default:
   * {@linkcode defaultRecognizers}).
   *
   * These handle structured, validatable types — email addresses, URLs, IP
   * addresses, phone numbers, SSNs, and Luhn-valid card numbers — which are more
   * reliable with patterns than with the model. They are also the supported
   * extension point for custom detection with this backend: add a recognizer to
   * detect additional spans.
   *
   * Pass `[]` to disable deterministic recognition and rely on the model alone.
   */
  recognizers?: ReadonlyArray<Recognizer>;
  /**
   * Override the model runner. Intended for testing — supply a function that
   * returns spans without loading the ONNX model.
   */
  runModel?: ModelRunner;
}

function overlaps(a: DetectedSpan, b: DetectedSpan): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Merge spans from several sources, resolving overlaps.
 *
 * The longer span wins, so a short recognizer match cannot delete a longer,
 * distinct entity it happens to overlap. When two overlapping spans are the same
 * length (such as a recognizer and the model labelling the exact same text), the
 * earlier group wins — the recognizer is deterministic and validated, so it is
 * authoritative for that text.
 *
 * @param groups
 *   Span groups in precedence order (highest first).
 * @returns
 *   Non-overlapping spans, ordered by start offset.
 */
function mergeSpans(
  groups: ReadonlyArray<ReadonlyArray<DetectedSpan>>,
): DetectedSpan[] {
  const ranked = groups.flatMap((group, priority) =>
    group.map((span) => ({ span, priority })),
  );

  ranked.sort((a, b) => {
    const lengthA = a.span.end - a.span.start;
    const lengthB = b.span.end - b.span.start;
    // Longest first, then higher-precedence group, then earliest start.
    if (lengthA !== lengthB) return lengthB - lengthA;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.span.start - b.span.start;
  });

  const accepted: DetectedSpan[] = [];
  for (const { span } of ranked) {
    if (!accepted.some((other) => overlaps(span, other))) {
      accepted.push(span);
    }
  }

  accepted.sort((a, b) => a.start - b.start);
  return accepted;
}

/**
 * Create a sensitive info detection backend powered by the on-device
 * [Rampart](https://huggingface.co/nationaldesignstudio/rampart) NER model.
 *
 * Pass the returned backend to the `sensitiveInfo` rule. It runs entirely
 * locally (Node.js, Bun, or Deno) using the model weights bundled with this
 * package, so no data leaves your environment. The model is loaded once on first
 * use and reused for every subsequent request.
 *
 * Supported sensitive info types (all built-in {@link ArcjetSensitiveInfoType}
 * values, so they can be listed in `allow`/`deny` directly, or all at once via
 * {@link rampartEntities}):
 *
 * Detected by the on-device NER model:
 * - `"GIVEN_NAME"`
 * - `"SURNAME"`
 * - `"EMAIL"`
 * - `"PHONE_NUMBER"`
 * - `"URL"`
 * - `"TAX_ID"`
 * - `"BANK_ACCOUNT"`
 * - `"ROUTING_NUMBER"`
 * - `"GOVERNMENT_ID"`
 * - `"PASSPORT"`
 * - `"DRIVERS_LICENSE"`
 * - `"BUILDING_NUMBER"`
 * - `"STREET_NAME"`
 * - `"SECONDARY_ADDRESS"`
 * - `"CITY"`
 * - `"STATE"`
 * - `"ZIP_CODE"`
 *
 * Detected by deterministic recognizers (structured, validated):
 * - `"EMAIL"`
 * - `"URL"`
 * - `"IP_ADDRESS"`
 * - `"PHONE_NUMBER"`
 * - `"SSN"`
 * - `"CREDIT_CARD_NUMBER"`
 *
 * The token-based `detect` callback of the `sensitiveInfo` rule is **not** used
 * by this backend (the model works on spans, not tokens). Use the
 * {@link RampartOptions.recognizers} option to add custom detection instead.
 *
 * @param options
 *   Backend options.
 * @returns
 *   A backend for `sensitiveInfo({ backend })`.
 *
 * @example
 *   ```ts
 *   import arcjet, { sensitiveInfo } from "@arcjet/node";
 *   import { rampart } from "@arcjet/sensitive-info-rampart";
 *
 *   const aj = arcjet({
 *     key: process.env.ARCJET_KEY!,
 *     rules: [
 *       sensitiveInfo({
 *         mode: "LIVE",
 *         deny: ["EMAIL", "GIVEN_NAME", "SURNAME"],
 *         backend: rampart(),
 *       }),
 *     ],
 *   });
 *   ```
 */
export function rampart(options: RampartOptions = {}): SensitiveInfoBackend {
  const recognizers = options.recognizers ?? defaultRecognizers;
  const runModel = options.runModel ?? createModelRunner(options);

  return {
    async detect(
      context: SensitiveInfoBackendContext,
      value: string,
      entities: SensitiveInfoEntities,
      options?: SensitiveInfoBackendOptions,
    ): Promise<SensitiveInfoResult> {
      if (typeof options?.detect === "function") {
        context.log.debug(
          "the `detect` callback is ignored by the Rampart backend; use the `recognizers` option instead",
        );
      }

      const [modelSpans, recognizerSpans] = await Promise.all([
        runModel(value),
        Promise.resolve(runRecognizers(value, recognizers)),
      ]);

      // Recognizers take precedence over the model on overlapping text.
      const merged = mergeSpans([recognizerSpans, modelSpans]);

      const listed = new Set<ArcjetSensitiveInfoType>(
        entities.val.map(fromAnalyzeEntity),
      );
      const denyListed = entities.tag === "deny";

      const allowed: DetectedSensitiveInfoEntity[] = [];
      const denied: DetectedSensitiveInfoEntity[] = [];

      for (const span of merged) {
        const entity: DetectedSensitiveInfoEntity = {
          start: span.start,
          end: span.end,
          identifiedType: toAnalyzeEntity(span.type),
        };

        const isListed = listed.has(span.type);
        // deny mode: deny the listed types. allow mode: deny everything else.
        if (denyListed ? isListed : !isListed) {
          denied.push(entity);
        } else {
          allowed.push(entity);
        }
      }

      return { allowed, denied };
    },
  };
}
