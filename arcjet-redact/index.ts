import { logLevel } from "@arcjet/env";
import { Logger } from "@arcjet/logger";
import { type ArcjetLogger } from "@arcjet/protocol";
import {
  detectSensitiveInfo,
  type SensitiveInfoEntity,
} from "@arcjet/redact-wasm";

export type ArcjetSensitiveInfoType =
  | "email"
  | "phone-number"
  | "ip-address"
  | "credit-card-number";

type DetectedSensitiveInfoEntity = {
  start: number;
  end: number;
  identifiedType: string;
};

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
  replacer?: Replacers<Detect, CustomEntities>;
  log?: ArcjetLogger;
};

export type Replacers<
  Detect extends DetectSensitiveInfoEntities<CustomEntities>,
  CustomEntities extends string,
> = {
  [T in
    | ArcjetSensitiveInfoType
    | Exclude<ReturnType<Detect>[number], undefined>]?: () => string;
};

type RedactContext = {
  log: ArcjetLogger;
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

function analyzeEntitiesToString(entity: SensitiveInfoEntity): string {
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

type RedactedText = {
  original: string;
  replacement: string;
};

function performReplacementInText(
  text: string,
  replacement: string,
  start: number,
  end: number,
): string {
  return text.substring(0, start) + replacement + text.substring(end);
}

export class RedactSession<
  Detect extends DetectSensitiveInfoEntities<CustomEntities>,
  CustomEntities extends string,
> {
  private unredactEntities: RedactedText[];
  private opts: RedactOptions<Detect, CustomEntities>;
  private context: RedactContext;

  public constructor(options: RedactOptions<Detect, CustomEntities>) {
    this.unredactEntities = [];
    this.opts = options;
    this.context = {
      log: options.log || new Logger({ level: logLevel(process.env) }),
    };
  }

  public async identify(
    candidate: string,
  ): Promise<DetectedSensitiveInfoEntity[]> {
    const entities = this.opts.redact.map(userEntitiesToWasm);
    const windowSize = this.opts.contextWindowSize || 1;
    let convertedDetect = undefined;
    if (typeof this.opts.detect !== "undefined") {
      const detect = this.opts.detect;
      convertedDetect = (tokens: string[]): any[] => {
        return detect(tokens)
          .filter((e) => typeof e !== "undefined")
          .map((e) => userEntitiesToWasm(e));
      };
    }

    const detectedEntities = await detectSensitiveInfo(
      this.context,
      candidate,
      entities,
      windowSize,
      convertedDetect,
    );

    return detectedEntities.map((e) => {
      return {
        ...e,
        identifiedType: analyzeEntitiesToString(e.identifiedType),
      };
    });
  }

  public async redact(candidate: string): Promise<string> {
    const detectedEntities = await this.identify(candidate);

    let outputString = candidate;
    let redactedIdx = 0;
    let extraOffset = 0;
    for (const entity of detectedEntities) {
      const replacers: Replacers<Detect, CustomEntities> =
        this.opts.replacer || {};

      const original = outputString.substring(
        entity.start + extraOffset,
        entity.end + extraOffset,
      );
      let replacement = `<REDACTED INFO #${redactedIdx}>`;
      redactedIdx++;

      if (entity.identifiedType in replacers) {
        const customReplacer =
          replacers[entity.identifiedType as keyof typeof replacers];
        if (customReplacer !== undefined) {
          replacement = customReplacer();
        }
      }

      this.unredactEntities.push({ original, replacement });

      outputString = performReplacementInText(
        outputString,
        replacement,
        entity.start + extraOffset,
        entity.end + extraOffset,
      );
      // We need to track an extra offset because the indices are relative to the original text.
      // When we make our first replacement we shift all subsequent replacements, and this needs to be accounted for.
      extraOffset += replacement.length - original.length;
    }

    return outputString;
  }

  public async unredact(final: string): Promise<string> {
    let outputString = final;
    for (const entity of this.unredactEntities) {
      const position = outputString.indexOf(entity.replacement);
      if (position !== -1) {
        outputString = performReplacementInText(
          outputString,
          entity.original,
          position,
          position + entity.replacement.length,
        );
      }
    }

    return outputString;
  }
}
