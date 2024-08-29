import { initializeWasm, type SensitiveInfoEntity } from "@arcjet/redact-wasm";

export type ArcjetSensitiveInfoType =
  | "email"
  | "phone-number"
  | "ip-address"
  | "credit-card-number";

type Replace = (identifiedType: string) => string | undefined;

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
  // TODO: Make these the same as analyze.js
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

function noOpFn(..._args: any[]): any {}

interface RedactedSensitiveInfoEntity {
  original: string;
  redacted: string;
  start: number;
  end: number;
  identifiedType: string;
}

async function callRedactWasm<
  Detect extends DetectSensitiveInfoEntities<CustomEntities>,
  CustomEntities extends string,
>(
  candidate: string,
  options: RedactOptions<Detect, CustomEntities>,
): Promise<RedactedSensitiveInfoEntity[]> {
  let convertedDetect = noOpFn;
  if (typeof options.detect !== "undefined") {
    const detect = options.detect;
    convertedDetect = (tokens: string[]) => {
      return detect(tokens)
        .filter((e) => typeof e !== "undefined")
        .map((e) => userEntitiesToWasm(e));
    };
  }

  let convertedRedact = noOpFn;
  if (typeof options.replace !== "undefined") {
    const replace = options.replace;
    convertedRedact = (identifiedType: SensitiveInfoEntity) => {
      return replace(wasmEntitiesToString(identifiedType));
    };
  }

  const wasm = await initializeWasm(convertedDetect, convertedRedact);

  const skipCustomDetect = options.detect === undefined;
  const skipCustomRedact = options.redact === undefined;

  const config = {
    entities: options.redact.map(userEntitiesToWasm),
    contextWindowSize: options.contextWindowSize,
    skipCustomDetect,
    skipCustomRedact,
  };

  if (typeof wasm !== "undefined") {
    return wasm.redact(candidate, config).map((e) => {
      return {
        ...e,
        identifiedType: wasmEntitiesToString(e.identifiedType),
      };
    });
  } else {
    throw new Error(
      "redact failed to run because wasm is not supported in this enviornment",
    );
  }
}

type Unredact = (input: string) => string;

export async function redact<
  Detect extends DetectSensitiveInfoEntities<CustomEntities>,
  CustomEntities extends string,
>(
  candidate: string,
  options: RedactOptions<Detect, CustomEntities>,
): Promise<[string, Unredact]> {
  const redactions = await callRedactWasm(candidate, options);

  let extraOffset = 0;
  for (const redaction of redactions) {
    candidate = performReplacementInText(
      candidate,
      redaction.redacted,
      redaction.start + extraOffset,
      redaction.end + extraOffset,
    );

    // We need to track an extra offset because the indices are relative to the original text.
    // When we make our first replacement we shift all subsequent replacements, and this needs to be accounted for.
    extraOffset += redaction.redacted.length - redaction.original.length;
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
