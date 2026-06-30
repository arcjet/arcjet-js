import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeLabel } from "./entities.js";
import type { DetectedSpan } from "./recognizers.js";

/**
 * A single token emitted by the token-classification model. The
 * `transformers.js` token-classification pipeline returns the label, score, the
 * token text (`word`), and its position (`index`), but not character offsets, so
 * those are reconstructed by {@linkcode assignOffsets}.
 */
export interface RawToken {
  /**
   * Raw label (such as `"B-GIVEN_NAME"`).
   */
  entity: string;
  /**
   * Confidence score in the range `[0, 1]`.
   */
  score: number;
  /**
   * Token text, normalized by the model (lower-cased, accents stripped, sub-word
   * pieces optionally prefixed with `##`).
   */
  word: string;
  /**
   * Token position in the sequence, used to order tokens.
   */
  index?: number;
  /**
   * Start offset (inclusive) into the text, once reconstructed.
   */
  start?: number;
  /**
   * End offset (exclusive) into the text, once reconstructed.
   */
  end?: number;
}

/**
 * Function that runs the model over `value` and returns detected spans.
 */
export type ModelRunner = (value: string) => Promise<DetectedSpan[]>;

/**
 * Options controlling how the Rampart model is loaded and run.
 */
export interface ModelOptions {
  /**
   * Directory that contains the bundled model (default: the `models` directory
   * shipped with this package). Pass this to load weights from elsewhere.
   */
  modelPath?: string;
  /**
   * Model identifier within `modelPath` (default: `"rampart"`).
   */
  modelId?: string;
  /**
   * ONNX weight precision to load (default: `"q4"`, the quantized weights the
   * model ships with).
   */
  dtype?: string;
  /**
   * Execution device (default: `"cpu"`). Set to `"webgpu"` to use a GPU when the
   * runtime supports it.
   */
  device?: string;
  /**
   * Minimum confidence score for a token to count (default: `0.5`).
   */
  threshold?: number;
}

const DEFAULT_THRESHOLD = 0.5;

/**
 * Normalize text the way the model's BERT tokenizer does — Unicode NFD
 * decomposition, combining marks stripped, lower-cased — while tracking the
 * original character index each normalized character came from.
 *
 * NFD (canonical) is used rather than NFKD (compatibility) to match the
 * tokenizer's accent stripping; NFKD would also fold ligatures and full-width
 * forms the tokenizer leaves intact, which would desync the offset mapping.
 *
 * @param value
 *   Original text.
 * @returns
 *   The normalized string and a map from each normalized character index back to
 *   its original character index.
 */
export function normalizeWithMap(value: string): {
  normalized: string;
  map: number[];
} {
  const combiningMark = /\p{M}/u;
  const chars: string[] = [];
  const map: number[] = [];
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    // Fast path for ASCII (the common case): no decomposition or combining
    // marks are possible, so skip the expensive `normalize`/regex per character.
    if (code < 0x80) {
      chars.push(
        // Lower-case A–Z without allocating via `toLowerCase`.
        code >= 0x41 && code <= 0x5a
          ? String.fromCharCode(code + 0x20)
          : value[index],
      );
      map.push(index);
      continue;
    }

    const normalized = value[index].normalize("NFD").toLowerCase();
    for (const char of normalized) {
      // Drop combining marks (such as the accent in a decomposed "é").
      if (combiningMark.test(char)) {
        continue;
      }
      chars.push(char);
      map.push(index);
    }
  }
  return { normalized: chars.join(""), map };
}

/**
 * Reconstruct character offsets for model tokens that lack them.
 *
 * Tokens are matched, in sequence order, against a normalized copy of the
 * original text using a forward-moving cursor, then mapped back to original
 * offsets. Tokens that cannot be located (such as those lost to normalization)
 * are returned without offsets and ignored downstream.
 *
 * This is pure so it can be unit-tested without loading the model.
 *
 * @param value
 *   Original text.
 * @param tokens
 *   Model tokens.
 * @returns
 *   Tokens with `start`/`end` populated where they could be located.
 */
export function assignOffsets(
  value: string,
  tokens: ReadonlyArray<RawToken>,
): RawToken[] {
  const { normalized, map } = normalizeWithMap(value);
  const ordered = [...tokens].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  let cursor = 0;
  return ordered.map((token) => {
    const word = token.word.replace(/^##/, "");
    if (word.length === 0) {
      return token;
    }

    const found = normalized.indexOf(word, cursor);
    if (found < 0) {
      return token;
    }

    const start = map[found];
    const end = map[found + word.length - 1] + 1;
    cursor = found + word.length;
    return { ...token, start, end };
  });
}

/**
 * Aggregate per-token model output into entity spans.
 *
 * Consecutive tokens of the same type are merged into a single span when the
 * text between them is only whitespace, so sub-word tokens (and adjacent words
 * of one entity) collapse into one span. Tokens below `threshold`, tokens
 * labelled outside (`O`), and tokens without offsets break the current span.
 *
 * This is pure so it can be unit-tested without loading the model.
 *
 * @param value
 *   The text the tokens were produced from.
 * @param tokens
 *   Per-token model output, in order, with offsets assigned.
 * @param threshold
 *   Minimum confidence score (default: `0.5`).
 * @returns
 *   Aggregated spans.
 */
export function aggregateTokens(
  value: string,
  tokens: ReadonlyArray<RawToken>,
  threshold: number = DEFAULT_THRESHOLD,
): DetectedSpan[] {
  const spans: DetectedSpan[] = [];
  let current: DetectedSpan | undefined;

  function flush() {
    if (current) {
      spans.push(current);
      current = undefined;
    }
  }

  for (const token of tokens) {
    const type = normalizeLabel(token.entity);
    if (
      type === undefined ||
      token.score < threshold ||
      token.start === undefined ||
      token.end === undefined
    ) {
      flush();
      continue;
    }

    const isBegin = /^b-/i.test(token.entity);
    if (
      current !== undefined &&
      current.type === type &&
      !isBegin &&
      /^\s*$/.test(value.slice(current.end, token.start))
    ) {
      current.end = token.end;
      continue;
    }

    flush();
    current = { start: token.start, end: token.end, type };
  }

  flush();
  return spans;
}

// transformers.js exposes a `TokenClassificationPipeline`; we only rely on it
// being callable with text and returning `RawToken`-shaped objects.
type Classifier = (
  value: string,
  options?: Record<string, unknown>,
) => Promise<ReadonlyArray<RawToken>>;

// The pipeline is loaded once per unique configuration and reused across every
// request — model loading is the expensive part, so we never repeat it.
const classifierCache = new Map<string, Promise<Classifier>>();

function defaultModelPath(): string {
  // Resolve the bundled `models` directory from this module's location. We avoid
  // `new URL("./models/", import.meta.url)` because bundlers (webpack/Turbopack)
  // statically interpret that form as an asset import and fail to resolve it.
  return join(dirname(fileURLToPath(import.meta.url)), "models");
}

// transformers.js exposes its configuration as a single process-global object.
// We serialize loads through this chain so two configs can't race on it, and we
// save/restore it around each load so other transformers.js consumers in the
// process are not disturbed.
let loadLock: Promise<unknown> = Promise.resolve();

async function loadClassifier(options: ModelOptions): Promise<Classifier> {
  const modelPath = options.modelPath ?? defaultModelPath();
  const modelId = options.modelId ?? "rampart";
  const dtype = options.dtype ?? "q4";
  const device = options.device ?? "cpu";

  const key = JSON.stringify({ modelPath, modelId, dtype, device });
  const existing = classifierCache.get(key);
  if (existing !== undefined) {
    return existing;
  }

  const promise = (async () => {
    // Imported lazily so the heavy runtime is only loaded when the model is
    // actually used, keeping it out of the rule-configuration path.
    const { env, pipeline } = await import("@huggingface/transformers");

    const load = loadLock.then(async () => {
      // `env` is process-global, so set it only for the duration of this load
      // (serialized against other loads) and restore it afterward.
      const previousAllowRemoteModels = env.allowRemoteModels;
      const previousLocalModelPath = env.localModelPath;
      env.allowRemoteModels = false;
      env.localModelPath = modelPath;
      try {
        const pipe = await pipeline("token-classification", modelId, {
          dtype,
          device,
          local_files_only: true,
        } as Record<string, unknown>);
        return pipe as unknown as Classifier;
      } finally {
        env.allowRemoteModels = previousAllowRemoteModels;
        env.localModelPath = previousLocalModelPath;
      }
    });

    // The next load waits for this one to release the global `env`.
    loadLock = load.catch(() => undefined);
    return load;
  })();

  classifierCache.set(key, promise);

  try {
    return await promise;
  } catch (error) {
    // Don't cache a failed load — allow a later call to retry.
    classifierCache.delete(key);
    throw error;
  }
}

// The model has a 512-token window; longer input would error. We scan in
// overlapping character windows that cannot exceed it (each wordpiece token
// consumes at least one character, so <=480 characters stays under 512 tokens
// even before whitespace splitting). The overlap keeps entities that straddle a
// boundary intact, since detected spans are far shorter than it.
const MAX_INPUT_CHARS = 480;
const CHUNK_OVERLAP = 64;

/**
 * Create a {@linkcode ModelRunner} bound to the given options.
 *
 * The returned function lazily loads the model on first use and reuses it for
 * every subsequent call.
 *
 * @param options
 *   Model options.
 * @returns
 *   A function that detects spans in text using the model.
 */
export function createModelRunner(options: ModelOptions = {}): ModelRunner {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;

  return async function runModel(value) {
    const classifier = await loadClassifier(options);

    if (value.length <= MAX_INPUT_CHARS) {
      const tokens = await classifier(value);
      return aggregateTokens(value, assignOffsets(value, tokens), threshold);
    }

    // Scan long input in overlapping windows and rebase each window's spans to
    // absolute offsets. Duplicates from the overlap are de-duplicated later when
    // spans are merged.
    const spans: DetectedSpan[] = [];
    const step = MAX_INPUT_CHARS - CHUNK_OVERLAP;
    for (let start = 0; start < value.length; start += step) {
      const chunk = value.slice(start, start + MAX_INPUT_CHARS);
      const tokens = await classifier(chunk);
      for (const span of aggregateTokens(
        chunk,
        assignOffsets(chunk, tokens),
        threshold,
      )) {
        spans.push({
          start: span.start + start,
          end: span.end + start,
          type: span.type,
        });
      }
    }
    return spans;
  };
}
