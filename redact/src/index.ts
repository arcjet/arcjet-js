import { initializeWasm } from "@arcjet/redact-wasm";
import type {
  RedactedSensitiveInfoEntity as RedactedSensitiveInfoEntityWasm,
  RedactSensitiveInfoConfig,
  SensitiveInfoEntity,
} from "@arcjet/redact-wasm";

/**
 * Types of standard sensitive information that can be detected.
 */
export type ArcjetSensitiveInfoType = Exclude<SensitiveInfoEntity["tag"], "custom">;

/**
 * Options for the `redact` function.
 *
 * @template DetectedEntities
 *   Custom entity names that are returned from `detect` and optionally listed in `entities`.
 * @template ListedEntities
 *   Entity names that can be listed in the `entities` option.
 */
export type RedactOptions<
  DetectedEntities extends string | undefined = undefined,
  ListedEntities extends ArcjetSensitiveInfoType | Exclude<DetectedEntities, undefined> =
    | ArcjetSensitiveInfoType
    | Exclude<DetectedEntities, undefined>,
> = {
  /**
   * Entities to redact.
   */
  entities?: ReadonlyArray<
    // Note that `DetectedEntities` is included here, even though it is also in `ListedEntities`,
    // so that strings *flow* into that.
    ListedEntities | Exclude<DetectedEntities, undefined>
  >;
  /**
   * Size of tokens to consider.
   */
  contextWindowSize?: number;
  /**
   * Custom detection function to identify sensitive information.
   *
   * @template DetectedEntities
   *   Custom entity names that are returned from `detect` and optionally listed in `entities`.
   * @template ListedEntities
   *   Entity names that can be listed in the `entities` option.
   * @param tokens
   *   Tokens.
   * @returns
   *   List of entities (or undefined).
   */
  detect?: (tokens: string[]) => ReadonlyArray<DetectedEntities>;
  /**
   * Custom replace function to redact sensitive information.
   *
   * @template DetectedEntities
   *   Custom entity names that are returned from `detect` and optionally listed in `entities`.
   * @template ListedEntities
   *   Entity names that can be listed in the `entities` option.
   * @param entity
   *   Entity to redact.
   * @param plaintext
   *   The plaintext string to redact.
   * @returns
   *   Redacted string or nothing.
   */
  replace?: (entity: ListedEntities, plaintext: string) => string | undefined;
};

/**
 * Turn an entity name into a `SensitiveInfoEntity`.
 *
 * See also `protocolSensitiveInfoEntitiesToAnalyze` in `arcjet/index.ts`.
 *
 * @param entity
 *   Entity name.
 * @returns
 *   Entity object.
 */
function userEntitiesToWasm(entity: unknown): SensitiveInfoEntity {
  if (typeof entity !== "string") {
    throw new Error("redaction entities must be strings");
  }

  if (
    entity === "credit-card-number" ||
    entity === "email" ||
    entity === "ip-address" ||
    entity === "phone-number"
  ) {
    return { tag: entity };
  }

  return { tag: "custom", val: entity };
}

/**
 * Turn a `SensitiveInfoEntity` object into its name.
 *
 * See also `analyzeSensitiveInfoEntitiesToString` in `arcjet/index.ts`.
 *
 * @param entity
 *   Entity object.
 * @returns
 *   Entity name.
 */
function wasmEntitiesToString(entity: SensitiveInfoEntity): string {
  if (
    entity.tag === "credit-card-number" ||
    entity.tag === "email" ||
    entity.tag === "ip-address" ||
    entity.tag === "phone-number"
  ) {
    return entity.tag;
  }

  return entity.val;
}

function performReplacementInText(
  text: string,
  replacement: string,
  start: number,
  end: number,
): string {
  return text.substring(0, start) + replacement + text.substring(end);
}

/**
 * Number of bytes a code point occupies in UTF-8.
 *
 * @param codePoint
 *   Code point.
 * @returns
 *   Byte length.
 */
function utf8Length(codePoint: number): number {
  if (codePoint < 0x80) return 1;
  if (codePoint < 0x800) return 2;
  // A lone surrogate has no UTF-8 encoding; it reaches Wasm as U+FFFD, which is
  // also three bytes, so the arithmetic stays aligned either way.
  if (codePoint < 0x10000) return 3;
  return 4;
}

/**
 * Resolve the UTF-8 byte offsets reported by Wasm to UTF-16 code unit indices.
 *
 * The detector counts bytes; `String.prototype.substring` counts UTF-16 code
 * units. The two coincide for ASCII, so applying one as the other looks correct
 * until the text contains a multi-byte character *before* an entity — at which
 * point every replacement lands short by the number of excess bytes and part of
 * the entity survives in the "redacted" output.
 *
 * An offset that falls inside a character is snapped outward — starts back to
 * the beginning of that character, ends on to the end of it — so a span always
 * covers at least the bytes the detector reported. Over-redacting is the safe
 * direction here; under-redacting is the bug.
 *
 * @param text
 *   Text the offsets refer to.
 * @param redactions
 *   Detected entities, carrying byte offsets.
 * @returns
 *   Spans in UTF-16 code unit indices, parallel to `redactions`.
 */
function resolveByteOffsets(
  text: string,
  redactions: ReadonlyArray<RedactedSensitiveInfoEntity>,
): Array<{ start: number; end: number }> {
  const wanted = new Set<number>();
  for (const redaction of redactions) {
    wanted.add(redaction.start);
    wanted.add(redaction.end);
  }

  // Walk the string once, in ascending byte order, recording the code unit
  // index each requested byte offset corresponds to.
  const ascending = Array.from(wanted).sort((a, b) => a - b);
  const floors = new Map<number, number>();
  const ceilings = new Map<number, number>();
  let cursor = 0;
  let byteOffset = 0;
  let stringIndex = 0;

  while (cursor < ascending.length && ascending[cursor] <= 0) {
    floors.set(ascending[cursor], 0);
    ceilings.set(ascending[cursor], 0);
    cursor++;
  }

  for (const character of text) {
    if (cursor >= ascending.length) break;

    const nextByteOffset = byteOffset + utf8Length(character.codePointAt(0)!);
    const nextStringIndex = stringIndex + character.length;

    while (cursor < ascending.length && ascending[cursor] <= nextByteOffset) {
      const offset = ascending[cursor];
      const onBoundary = offset === nextByteOffset;
      floors.set(offset, onBoundary ? nextStringIndex : stringIndex);
      ceilings.set(offset, nextStringIndex);
      cursor++;
    }

    byteOffset = nextByteOffset;
    stringIndex = nextStringIndex;
  }

  // Anything past the end of the text clamps to the end.
  while (cursor < ascending.length) {
    floors.set(ascending[cursor], text.length);
    ceilings.set(ascending[cursor], text.length);
    cursor++;
  }

  return redactions.map((redaction) => {
    const start = floors.get(redaction.start) ?? 0;
    const end = ceilings.get(redaction.end) ?? text.length;
    return { start, end: Math.max(start, end) };
  });
}

/* c8 ignore start */
// Coverage is ignored on these no-op functions because they are never executed
// due to the `skipCustomDetect` and `skipCustomReplace` options.
function noOpDetect(_tokens: string[]): Array<SensitiveInfoEntity | undefined> {
  return [];
}
function noOpReplace(_input: SensitiveInfoEntity, _plaintext: string): string | undefined {
  return undefined;
}
/* c8 ignore stop */

interface RedactedSensitiveInfoEntity extends Omit<
  RedactedSensitiveInfoEntityWasm,
  "identifiedType"
> {
  identifiedType: string;
}

function getWasmOptions<
  DetectedEntities extends string | undefined = undefined,
  ListedEntities extends ArcjetSensitiveInfoType | Exclude<DetectedEntities, undefined> =
    | ArcjetSensitiveInfoType
    | Exclude<DetectedEntities, undefined>,
>(
  options?: RedactOptions<DetectedEntities, ListedEntities> | undefined,
): RedactSensitiveInfoConfig {
  if (typeof options === "object" && options !== null) {
    const entities = options.entities;

    if (entities !== undefined) {
      if (!Array.isArray(entities)) {
        throw new Error("entities must be an array");
      }

      if (entities.length < 1) {
        throw new Error("no entities configured for redaction");
      }
    }

    // `entities` is an optional field but not allowed to be `undefined`.
    return entities
      ? {
          entities: entities.map(userEntitiesToWasm),
          contextWindowSize: options.contextWindowSize || 1,
          skipCustomDetect: typeof options.detect !== "function",
          skipCustomRedact: typeof options.replace !== "function",
        }
      : {
          contextWindowSize: options.contextWindowSize || 1,
          skipCustomDetect: typeof options.detect !== "function",
          skipCustomRedact: typeof options.replace !== "function",
        };
  } else {
    return {
      contextWindowSize: 1,
      skipCustomDetect: true,
      skipCustomRedact: true,
    };
  }
}

async function callRedactWasm<
  DetectedEntities extends string | undefined = undefined,
  ListedEntities extends ArcjetSensitiveInfoType | Exclude<DetectedEntities, undefined> =
    | ArcjetSensitiveInfoType
    | Exclude<DetectedEntities, undefined>,
>(
  candidate: string,
  options?: RedactOptions<DetectedEntities, ListedEntities> | undefined,
): Promise<RedactedSensitiveInfoEntity[]> {
  let convertedDetect = noOpDetect;
  if (typeof options?.detect === "function") {
    const detect = options.detect;
    convertedDetect = (tokens: string[]) => {
      return detect(tokens)
        .filter((e) => typeof e !== "undefined")
        .map((e) => userEntitiesToWasm(e));
    };
  }

  let convertedReplace = noOpReplace;
  if (typeof options?.replace === "function") {
    const replace = options.replace;
    convertedReplace = (identifiedType: SensitiveInfoEntity, plaintext: string) => {
      return replace(
        // @ts-expect-error because we know this is coming from Wasm
        wasmEntitiesToString(identifiedType),
        plaintext,
      );
    };
  }

  const wasm = await initializeWasm(convertedDetect, convertedReplace);

  if (typeof wasm !== "undefined") {
    const config = getWasmOptions(options);

    return wasm.redact(candidate, config).map((e) => {
      return {
        ...e,
        identifiedType: wasmEntitiesToString(e.identifiedType),
      };
    });
  } else {
    throw new Error("redact failed to run because Wasm is not supported in this environment");
  }
}

type Unredact = (input: string) => string;

/**
 * Redact sensitive info.
 *
 * @template DetectedEntities
 *   Custom entity names that are returned from `detect` and optionally listed in `entities`.
 * @template ListedEntities
 *   Entity names that can be listed in the `entities` option.
 * @param candidate
 *   Value to redact.
 * @param options
 *   Configuration.
 * @returns
 *   Promise to a tuple with the redacted string and a function to unredact it.
 */
export async function redact<
  const DetectedEntities extends string | undefined = undefined,
  const ListedEntities extends ArcjetSensitiveInfoType | Exclude<DetectedEntities, undefined> =
    | ArcjetSensitiveInfoType
    | Exclude<DetectedEntities, undefined>,
>(
  candidate: string,
  options?: RedactOptions<DetectedEntities, ListedEntities>,
): Promise<[string, Unredact]> {
  const redactions = await callRedactWasm(candidate, options);

  // Wasm reports UTF-8 byte offsets; `substring` indexes UTF-16 code units.
  // Resolve one to the other before splicing, or any multi-byte character
  // before an entity shifts the cut and leaves part of the entity behind.
  const spans = resolveByteOffsets(candidate, redactions);

  // Need to apply the redactions in reverse order so that the offsets aren't changed
  // when we redact with strings that are longer/shorter than the original.
  redactions.reverse();
  spans.reverse();

  for (const [index, redaction] of redactions.entries()) {
    candidate = performReplacementInText(
      candidate,
      redaction.redacted,
      spans[index].start,
      spans[index].end,
    );
  }

  function unredact(input: string): string {
    for (const redaction of redactions) {
      let position;
      while (position !== -1) {
        position = input.indexOf(redaction.redacted);
        if (position !== -1) {
          input = performReplacementInText(
            input,
            redaction.original,
            position,
            position + redaction.redacted.length,
          );
        }
      }
    }

    return input;
  }

  return [candidate, unredact];
}
