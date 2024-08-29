import { initializeWasm } from "@arcjet/redact-wasm";
import type { SensitiveInfoEntity } from "@arcjet/redact-wasm";

export type ArcjetSensitiveInfoType =
  | "email"
  | "phone-number"
  | "ip-address"
  | "credit-card-number";

type ReplaceSensitiveInfoEntities<T> = (
  identifiedType: ArcjetSensitiveInfoType | T,
) => string | undefined;

type DetectSensitiveInfoEntities<T> = (
  tokens: string[],
) => Array<ArcjetSensitiveInfoType | T | undefined>;

type SensitiveInfoEntities<
  Detect extends DetectSensitiveInfoEntities<CustomEntities>,
  CustomEntities extends string,
> = Array<
  ArcjetSensitiveInfoType | Exclude<ReturnType<Detect>[number], undefined>
>;

type RedactOptions<
  Detect extends DetectSensitiveInfoEntities<CustomEntities>,
  Replace extends ReplaceSensitiveInfoEntities<CustomEntities>,
  CustomEntities extends string,
> = {
  allow?: never;
  redact: SensitiveInfoEntities<Detect, CustomEntities>;
  contextWindowSize?: number;
  detect?: Detect;
  replace?: Replace;
};

function userEntitiesToWasm<Custom extends string>(
  entity: ArcjetSensitiveInfoType | Custom,
) {
  if (typeof entity !== "string") {
    throw new Error("Redaction entities must be a string");
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

function noOpDetect(_tokens: string[]): Array<SensitiveInfoEntity | undefined> {
  return [];
}
function noOpReplace(_input: SensitiveInfoEntity): string | undefined {
  return undefined;
}

interface RedactedSensitiveInfoEntity {
  original: string;
  redacted: string;
  start: number;
  end: number;
  identifiedType: string;
}

async function callRedactWasm<
  Detect extends DetectSensitiveInfoEntities<CustomEntities>,
  Replace extends ReplaceSensitiveInfoEntities<CustomEntities>,
  CustomEntities extends string,
>(
  candidate: string,
  options: RedactOptions<Detect, Replace, CustomEntities>,
): Promise<RedactedSensitiveInfoEntity[]> {
  let convertedDetect = noOpDetect;
  if (typeof options.detect === "function") {
    const detect = options.detect;
    convertedDetect = (tokens: string[]) => {
      return detect(tokens)
        .filter((e) => typeof e !== "undefined")
        .map((e) => userEntitiesToWasm(e));
    };
  }

  let convertedReplace = noOpReplace;
  if (typeof options.replace === "function") {
    const replace = options.replace;
    convertedReplace = (identifiedType: SensitiveInfoEntity) => {
      // We need to use an `as` here because the Wasm generated types just use `string` for custom.
      return replace(
        wasmEntitiesToString(identifiedType) as
          | CustomEntities
          | ArcjetSensitiveInfoType,
      );
    };
  }

  const wasm = await initializeWasm(convertedDetect, convertedReplace);

  if (typeof wasm !== "undefined") {
    const skipCustomDetect = typeof options.detect !== "function";
    const skipCustomRedact = typeof options.replace !== "function";

    const config = {
      entities: options.redact.map(userEntitiesToWasm),
      contextWindowSize: options.contextWindowSize,
      skipCustomDetect,
      skipCustomRedact,
    };

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
  Detect extends DetectSensitiveInfoEntities<CustomEntities>,
  Replace extends ReplaceSensitiveInfoEntities<CustomEntities>,
  CustomEntities extends string,
>(
  candidate: string,
  options: RedactOptions<Detect, Replace, CustomEntities>,
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
      const position = input.indexOf(redaction.redacted);
      if (position !== -1) {
        input = performReplacementInText(
          input,
          redaction.original,
          position,
          position + redaction.redacted.length,
        );
      }
    }

    return input;
  }

  return [candidate, unredact];
}
