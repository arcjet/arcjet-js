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
  /**
   * Classify one chunk of text, in place of the bundled `transformers.js`
   * pipeline.
   *
   * The chunk is already windowed to the model's input budget, so an
   * implementation only has to run the model over the text it is given and
   * return the raw tokens. Normalization, windowing, offset reconstruction, and
   * aggregation stay in this package, so they cannot drift from the behavior
   * every other runtime gets.
   *
   * Use this on runtimes where the bundled loader cannot run — no filesystem
   * and no dynamic module loading, such as Cloudflare Workers — by supplying a
   * session created with that runtime's ONNX bindings. Nothing is loaded from
   * disk when this is set, so `modelPath`, `modelId`, `dtype`, and `device` are
   * ignored.
   */
  classify?: (value: string) => Promise<ReadonlyArray<RawToken>>;
}

const DEFAULT_THRESHOLD = 0.5;
const hasLetterOrNumber = /[\p{L}\p{N}]/u;

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
        code >= 0x41 && code <= 0x5a ? String.fromCharCode(code + 0x20) : value[index],
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
export function assignOffsets(value: string, tokens: ReadonlyArray<RawToken>): RawToken[] {
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
 * A `B-` token starts a new span unless it is a touching WordPiece continuation
 * (`##`), since the model can label each piece `B-`. An `I-` token can extend a
 * span across whitespace. Tokens below `threshold`, tokens labelled outside
 * (`O`), and tokens without offsets break the current span.
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
    // The model can label a standalone separator (such as the `$` between two
    // emails) as an entity. No supported entity consists only of punctuation.
    if (current && hasLetterOrNumber.test(value.slice(current.start, current.end))) {
      spans.push(current);
    }
    current = undefined;
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
      (isBegin
        ? token.word.startsWith("##") && token.start <= current.end
        : /^\s*$/.test(value.slice(current.end, token.start)))
    ) {
      current.end = Math.max(current.end, token.end);
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
  // Resolve the bundled `models` directory from this module's location. The
  // compiled module lives in `dist/`, so we step up one level to the package
  // root where `models/` is published. We avoid `new URL("../models/",
  // import.meta.url)` because bundlers (webpack/Turbopack) statically interpret
  // that form as an asset import and fail to resolve it.
  return join(dirname(fileURLToPath(import.meta.url)), "..", "models");
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

// The model has a 512-token window, including [CLS] and [SEP]; longer input
// would error. Input is scanned in overlapping 480-character windows, which is
// the context the model detects best in: its phone recall drops when given
// windows closer to the full 512 tokens. Character count does not bound token
// count, though (normalization can expand one character into several tokens, as
// a Hangul syllable becomes three Jamo), so a character window whose
// `tokenUpperBound` does not fit is itself scanned in overlapping windows that
// do. The overlaps keep entities that straddle a boundary intact, since
// detected spans are far shorter than them.
const MAX_INPUT_CHARS = 480;
const CHUNK_OVERLAP = 64;
const MAX_SEQUENCE_TOKENS = 512;
const WINDOW_TOKEN_BUDGET = MAX_SEQUENCE_TOKENS - 2;
const CHUNK_OVERLAP_TOKENS = 64;
// How far a window start moves back to reach the start of a word. The tokenizer
// reads a word longer than 100 characters as one `[UNK]`, so a longer run need
// not be kept whole, and the cap keeps windows advancing through it.
const MAX_WORD_TOKENS = 100;

const whitespace = /\s/u;
const nonspacingMark = /\p{Mn}/gu;

/**
 * Upper bound on the tokens one code point can produce, excluding special
 * tokens.
 *
 * The model's BERT tokenizer applies NFD, drops nonspacing marks, lower-cases,
 * then splits on whitespace and punctuation; WordPiece turns each word into
 * either one `[UNK]` or pieces that each consume at least one character. So a
 * text produces at most as many tokens as it has non-whitespace code points
 * after those steps, in that order. Only JavaScript whitespace is excluded,
 * which the tokenizer also treats as whitespace or removes, so this never
 * under-counts. A tokenizer that strips every combining mark after
 * lower-casing, like a plain `\p{M}` filter, produces no more.
 */
function codePointTokenCost(char: string): number {
  const code = char.charCodeAt(0);
  if (code < 0x80) {
    return whitespace.test(char) ? 0 : 1;
  }
  let cost = 0;
  for (const piece of char.normalize("NFD").replace(nonspacingMark, "").toLowerCase()) {
    if (!whitespace.test(piece)) {
      cost += 1;
    }
  }
  return cost;
}

/**
 * Upper bound on the number of tokens the model's tokenizer produces for
 * `value`, excluding `[CLS]` and `[SEP]`.
 *
 * @param value
 *   Text to measure.
 * @returns
 *   A count at least as large as the real token count.
 */
export function tokenUpperBound(value: string): number {
  let cost = 0;
  for (const char of value) {
    cost += codePointTokenCost(char);
  }
  return cost;
}

/**
 * Split `value` into overlapping `[start, end)` windows (UTF-16 offsets) whose
 * {@linkcode tokenUpperBound} is at most `budget`.
 *
 * Windows cover the whole value and never split a surrogate pair. Each window
 * after the first starts `overlap` tokens before the previous one ended, moved
 * back up to 100 tokens to the start of the word there so a window does not
 * open mid-word. It always starts after the previous window's start, so
 * planning progresses even when one word spans more tokens than the overlap.
 *
 * This is pure so it can be unit-tested without loading the model.
 *
 * @param value
 *   Text to window.
 * @param budget
 *   Maximum tokens per window, excluding special tokens.
 * @param overlap
 *   Tokens shared by adjacent windows (less than `budget`).
 * @returns
 *   Window bounds in order; empty when `value` is empty.
 */
export function planWindows(
  value: string,
  budget: number = WINDOW_TOKEN_BUDGET,
  overlap: number = CHUNK_OVERLAP_TOKENS,
): Array<[number, number]> {
  // Code point boundaries (UTF-16 offsets), each code point's cost, and whether
  // it is whitespace, so windows are planned on whole code points.
  const offsets: number[] = [];
  const costs: number[] = [];
  const spaces: boolean[] = [];
  let offset = 0;
  for (const char of value) {
    offsets.push(offset);
    costs.push(codePointTokenCost(char));
    spaces.push(whitespace.test(char));
    offset += char.length;
  }
  offsets.push(offset);

  const count = costs.length;
  const windows: Array<[number, number]> = [];
  let start = 0;
  while (start < count) {
    let end = start;
    let cost = 0;
    while (end < count && cost + costs[end] <= budget) {
      cost += costs[end];
      end += 1;
    }
    if (end === start) {
      // A single code point costs a few tokens at most, far below any budget.
      throw new Error(`Rampart window budget of ${budget} tokens is too small`);
    }
    windows.push([offsets[start], offsets[end]]);
    if (end === count) {
      break;
    }

    // Walk back from the end until the overlap is covered, then to the start
    // of that word, staying after this window's start.
    let next = end;
    let shared = 0;
    while (next - 1 > start && shared < overlap) {
      next -= 1;
      shared += costs[next];
    }
    let wordStart = next;
    let wordCost = 0;
    while (wordStart - 1 > start && !spaces[wordStart - 1] && wordCost < MAX_WORD_TOKENS) {
      wordStart -= 1;
      wordCost += costs[wordStart];
    }
    if (spaces[wordStart - 1]) {
      next = wordStart;
    }
    start = next;
  }
  return windows;
}

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff;
}

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
    const classifier = options.classify ?? (await loadClassifier(options));

    const spans: DetectedSpan[] = [];

    // Scan one character window, in token windows when it does not fit the
    // model, and rebase its spans by `offset`.
    async function scan(chunk: string, offset: number) {
      const windows: Array<[number, number]> =
        tokenUpperBound(chunk) <= WINDOW_TOKEN_BUDGET ? [[0, chunk.length]] : planWindows(chunk);
      for (const [start, end] of windows) {
        const text = chunk.slice(start, end);
        const tokens = await classifier(text);
        for (const span of aggregateTokens(text, assignOffsets(text, tokens), threshold)) {
          spans.push({
            start: span.start + offset + start,
            end: span.end + offset + start,
            type: span.type,
          });
        }
      }
    }

    if (value.length <= MAX_INPUT_CHARS) {
      await scan(value, 0);
      return spans;
    }

    // Scan long input in overlapping windows and rebase each window's spans to
    // absolute offsets. Duplicates from the overlap are de-duplicated later when
    // spans are merged.
    const step = MAX_INPUT_CHARS - CHUNK_OVERLAP;
    for (let start = 0; start < value.length; start += step) {
      // Window boundaries are counted in UTF-16 code units, so they can land in
      // the middle of a surrogate pair. Nudge them off it — a lone surrogate is
      // not text the model, or the normalization that reconstructs offsets, can
      // make sense of. Each nudge moves a boundary by a single code unit, well
      // within the overlap, so the pair is still scanned whole by a window.
      if (isLowSurrogate(value.charCodeAt(start)) && isHighSurrogate(value.charCodeAt(start - 1))) {
        start -= 1;
      }
      let end = start + MAX_INPUT_CHARS;
      if (isHighSurrogate(value.charCodeAt(end - 1)) && isLowSurrogate(value.charCodeAt(end))) {
        end -= 1;
      }

      await scan(value.slice(start, end), start);
    }
    return spans;
  };
}
