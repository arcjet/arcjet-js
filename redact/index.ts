import { initializeWasm } from "@arcjet/redact-wasm";
import type {
  RedactedSensitiveInfoEntity as RedactedSensitiveInfoEntityWasm,
  RedactSensitiveInfoConfig,
  SensitiveInfoEntity,
} from "@arcjet/redact-wasm";

/**
 * Types of standard sensitive information that can be detected.
 */
export type ArcjetSensitiveInfoType = Exclude<
  SensitiveInfoEntity["tag"],
  "custom"
>;

/**
 * Types of sensitive information that can be detected which also allows
 * custom tags (arbitrary strings) while still retaining autocompletion and other IDE features
 * associated with the known standard types.
 */
// See: <https://stackoverflow.com/questions/69793164/typescript-weird-type-intersection-of-string>.
type SensitiveInfoTags = ArcjetSensitiveInfoType | (string & {});

/**
 * Options for the `redact` function.
 *
 * @template Entities
 *   Tags to find and redact.
 */
export type RedactOptions<Entities extends SensitiveInfoTags> = {
  /**
   * Entities to redact.
   */
  entities?: ReadonlyArray<Entities>;
  /**
   * Size of tokens to consider.
   */
  contextWindowSize?: number;
  /**
   * Custom detection function to identify sensitive information.
   *
   * @template Entities
   *   Tags to redact.
   * @param tokens
   *   Tokens.
   * @returns
   *   List of entities (or undefined).
   */
  detect?: (tokens: string[]) => Array<Entities | undefined>;
  /**
   * Custom replace function to redact sensitive information.
   *
   * @template Entities
   *   Tags to redact.
   * @param entity
   *   Entity to redact.
   * @param plaintext
   *   The plaintext string to redact.
   * @returns
   *   Redacted string or nothing.
   */
  replace?: (entity: Entities, plaintext: string) => string | undefined;
};

function userEntitiesToWasm(entity: unknown): SensitiveInfoEntity {
  if (typeof entity !== "string") {
    throw new Error("redaction entities must be strings");
  }

  if (entity === "email") {
    return { tag: "email" };
  }

  if (entity === "phone-number") {
    return { tag: "phone-number" };
  }

  if (entity === "ip-address") {
    return { tag: "ip-address" };
  }

  if (entity === "credit-card-number") {
    return { tag: "credit-card-number" };
  }

  return {
    tag: "custom",
    val: entity,
  };
}

function wasmEntitiesToString(entity: SensitiveInfoEntity): string {
  if (entity.tag === "email") {
    return "email";
  }

  if (entity.tag === "ip-address") {
    return "ip-address";
  }

  if (entity.tag === "credit-card-number") {
    return "credit-card-number";
  }

  if (entity.tag === "phone-number") {
    return "phone-number";
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

/* c8 ignore start */
// Coverage is ignored on these no-op functions because they are never executed
// due to the `skipCustomDetect` and `skipCustomReplace` options.
function noOpDetect(_tokens: string[]): Array<SensitiveInfoEntity | undefined> {
  return [];
}
function noOpReplace(
  _input: SensitiveInfoEntity,
  _plaintext: string,
): string | undefined {
  return undefined;
}
/* c8 ignore stop */

interface RedactedSensitiveInfoEntity
  extends Omit<RedactedSensitiveInfoEntityWasm, "identifiedType"> {
  identifiedType: string;
}

function getWasmOptions<const Entities extends SensitiveInfoTags>(
  options?: RedactOptions<Entities> | undefined,
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

async function callRedactWasm<const Entities extends SensitiveInfoTags>(
  candidate: string,
  options?: RedactOptions<Entities> | undefined,
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
    convertedReplace = (
      identifiedType: SensitiveInfoEntity,
      plaintext: string,
    ) => {
      return replace(
        // @ts-ignore because we know this is coming from Wasm
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
    throw new Error(
      "redact failed to run because Wasm is not supported in this environment",
    );
  }
}

type Unredact = (input: string) => string;

/**
 * Redact sensitive info.
 *
 * @template Entities
 *   Tags to find and redact.
 * @param candidate
 *   Value to redact.
 * @param options
 *   Configuration.
 * @returns
 *   Promise to a tuple with the redacted string and a function to unredact it.
 */
export async function redact<const Entities extends SensitiveInfoTags>(
  candidate: string,
  options?: RedactOptions<Entities>,
): Promise<[string, Unredact]> {
  const redactions = await callRedactWasm(candidate, options);

  // Need to apply the redactions in reverse order so that the offsets aren't changed
  // when we redact with strings that are longer/shorter than the original.
  redactions.reverse();

  for (const redaction of redactions) {
    candidate = performReplacementInText(
      candidate,
      redaction.redacted,
      redaction.start,
      redaction.end,
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
