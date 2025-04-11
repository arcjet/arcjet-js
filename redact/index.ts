import { initializeWasm } from "@arcjet/redact-wasm";
import type { SensitiveInfoEntity } from "@arcjet/redact-wasm";

export type ArcjetSensitiveInfoType =
  | "email"
  | "phone-number"
  | "ip-address"
  | "credit-card-number";

type DetectSensitiveInfoEntities<T> = (
  tokens: string[],
) => Array<ArcjetSensitiveInfoType | T | undefined>;

type ValidEntities<Detect> = Array<
  // Via https://www.reddit.com/r/typescript/comments/17up72w/comment/k958cb0/
  // Conditional types distribute over unions. If you have ((string | undefined)
  // extends undefined ? 1 : 0) it is evaluated separately for each member of
  // the union, then union-ed together again. The result is (string extends
  // undefined ? 1 : 0) | (undefined extends undefined ? 1 : 0) which simplifies
  // to 0 | 1
  undefined extends Detect
    ? ArcjetSensitiveInfoType
    : Detect extends DetectSensitiveInfoEntities<infer CustomEntities>
      ? ArcjetSensitiveInfoType | CustomEntities
      : never
>;

export type RedactOptions<Detect> = {
  entities?: ValidEntities<Detect>;
  contextWindowSize?: number;
  detect?: Detect;
  replace?: (
    entity: ValidEntities<Detect>[number],
    plaintext: string,
  ) => string | undefined;
};

function userEntitiesToWasm(entity: unknown) {
  if (typeof entity !== "string") {
    throw new Error("redaction entities must be strings");
  }

  if (entity === "email") {
    return { tag: "email" as const };
  }

  if (entity === "phone-number") {
    return { tag: "phone-number" as const };
  }

  if (entity === "ip-address") {
    return { tag: "ip-address" as const };
  }

  if (entity === "credit-card-number") {
    return { tag: "credit-card-number" as const };
  }

  return {
    tag: "custom" as const,
    val: entity,
  };
}

function wasmEntitiesToString(entity: SensitiveInfoEntity) {
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

interface RedactedSensitiveInfoEntity {
  original: string;
  redacted: string;
  start: number;
  end: number;
  identifiedType: string;
}

function getWasmOptions<
  const Detect extends DetectSensitiveInfoEntities<CustomEntities> | undefined,
  const CustomEntities extends string,
>(options?: RedactOptions<Detect>) {
  if (typeof options === "object" && options !== null) {
    if (typeof options.entities !== "undefined") {
      if (Array.isArray(options.entities)) {
        if (options.entities.length < 1) {
          throw new Error("no entities configured for redaction");
        }
      } else {
        throw new Error("entities must be an array");
      }
    }

    return {
      entities: options.entities?.map(userEntitiesToWasm),
      contextWindowSize: options.contextWindowSize || 1,
      skipCustomDetect: typeof options.detect !== "function",
      skipCustomRedact: typeof options.replace !== "function",
    };
  } else {
    return {
      entities: undefined,
      contextWindowSize: 1,
      skipCustomDetect: true,
      skipCustomRedact: true,
    };
  }
}

async function callRedactWasm<
  const Detect extends DetectSensitiveInfoEntities<CustomEntities> | undefined,
  const CustomEntities extends string,
>(
  candidate: string,
  options?: RedactOptions<Detect>,
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

export async function redact<
  const Detect extends DetectSensitiveInfoEntities<CustomEntities> | undefined,
  const CustomEntities extends string,
>(
  candidate: string,
  options?: RedactOptions<Detect>,
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
