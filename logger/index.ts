import format from "@arcjet/sprintf";

function bigintReplacer(key: string, value: unknown) {
  if (typeof value === "bigint") {
    return "[BigInt]";
  }

  return value;
}

// TODO: Deduplicate this and sprintf implementation
function tryStringify(value: unknown) {
  try {
    return JSON.stringify(value, bigintReplacer);
  } catch {
    return "[Circular]";
  }
}

/**
 * Supported log levels.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Configuration.
 */
export interface Options {
  /**
   * Log level.
   */
  level: LogLevel;
}

/**
 * Configuration.
 *
 * @deprecated
 *   Use `Options` instead.
 */
export type LoggerOptions = Options;

const PREFIX = "✦Aj";

function getMessage(
  mergingObject: unknown,
  message: unknown,
  interpolationValues: unknown[],
) {
  // The first argument was the message so juggle the arguments
  if (typeof mergingObject === "string") {
    interpolationValues = [message, ...interpolationValues];
    message = mergingObject;
  }

  // Prefer a string message over `mergingObject.msg`, as per Pino:
  // https://github.com/pinojs/pino/blob/8db130eba0439e61c802448d31eb1998cebfbc98/docs/api.md#message-string
  if (typeof message === "string") {
    return format(message, ...interpolationValues);
  }

  if (
    typeof mergingObject === "object" &&
    mergingObject !== null &&
    "msg" in mergingObject &&
    typeof mergingObject.msg === "string"
  ) {
    return format(mergingObject.msg, [message, ...interpolationValues]);
  }
}

function getOutput(
  mergingObject: unknown,
  message: unknown,
  interpolationValues: unknown[],
) {
  let output = getMessage(mergingObject, message, interpolationValues);
  if (typeof output !== "string") {
    return;
  }

  if (typeof mergingObject === "object" && mergingObject !== null) {
    for (const [key, value] of Object.entries(mergingObject)) {
      output += `\n      ${key}: ${tryStringify(value)}`;
    }
  }

  return output;
}

/**
 * Logger.
 */
export class Logger {
  #logLevel: number;

  /**
   * Configuration.
   *
   * @param options
   *   Configuration.
   * @returns
   *   Logger.
   */
  constructor(options: Options) {
    if (typeof options.level !== "string") {
      throw new Error(`Invalid log level`);
    }

    switch (options.level) {
      case "debug":
        this.#logLevel = 0;
        break;
      case "info":
        this.#logLevel = 1;
        break;
      case "warn":
        this.#logLevel = 2;
        break;
      case "error":
        this.#logLevel = 3;
        break;
      default: {
        throw new Error(`Unknown log level: ${options.level}`);
      }
    }
  }

  /**
   * Debug.
   *
   * @param message
   *   Template.
   * @param interpolationValues
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  debug(message: string, ...interpolationValues: unknown[]): void;
  /**
   * Debug.
   *
   * @param mergingObject
   *   Merging object copied into the JSON log line.
   * @param message
   *   Template.
   * @param interpolationValues
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  debug(
    mergingObject: Record<string, unknown>,
    message?: string,
    ...interpolationValues: unknown[]
  ): void;
  debug(
    mergingObject: unknown,
    message?: unknown,
    ...interpolationValues: unknown[]
  ): void {
    if (this.#logLevel <= 0) {
      const output = getOutput(mergingObject, message, interpolationValues);
      if (typeof output !== "undefined") {
        console.debug(`${PREFIX} DEBUG ${output}`);
      }
    }
  }

  /**
   * Info.
   *
   * @param message
   *   Template.
   * @param interpolationValues
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  info(message: string, ...interpolationValues: unknown[]): void;
  /**
   * Info.
   *
   * @param mergingObject
   *   Merging object copied into the JSON log line.
   * @param message
   *   Template.
   * @param interpolationValues
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  info(
    mergingObject: Record<string, unknown>,
    message?: string,
    ...interpolationValues: unknown[]
  ): void;
  info(
    mergingObject: unknown,
    message?: unknown,
    ...interpolationValues: unknown[]
  ): void {
    if (this.#logLevel <= 1) {
      const output = getOutput(mergingObject, message, interpolationValues);
      if (typeof output !== "undefined") {
        console.info(`${PREFIX} INFO ${output}`);
      }
    }
  }

  /**
   * Warn.
   *
   * @param message
   *   Template.
   * @param interpolationValues
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  warn(message: string, ...interpolationValues: unknown[]): void;
  /**
   * Warn.
   *
   * @param mergingObject
   *   Merging object copied into the JSON log line.
   * @param message
   *   Template.
   * @param interpolationValues
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  warn(
    mergingObject: Record<string, unknown>,
    message?: string,
    ...interpolationValues: unknown[]
  ): void;
  warn(
    mergingObject: unknown,
    message?: unknown,
    ...interpolationValues: unknown[]
  ): void {
    if (this.#logLevel <= 2) {
      const output = getOutput(mergingObject, message, interpolationValues);
      if (typeof output !== "undefined") {
        console.warn(`${PREFIX} WARN ${output}`);
      }
    }
  }

  /**
   * Error.
   *
   * @param message
   *   Template.
   * @param interpolationValues
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  error(message: string, ...interpolationValues: unknown[]): void;
  /**
   * Error.
   *
   * @param mergingObject
   *   Merging object copied into the JSON log line.
   * @param message
   *   Template.
   * @param interpolationValues
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  error(
    mergingObject: Record<string, unknown>,
    message?: string,
    ...interpolationValues: unknown[]
  ): void;
  error(
    mergingObject: unknown,
    message?: unknown,
    ...interpolationValues: unknown[]
  ): void {
    if (this.#logLevel <= 3) {
      const output = getOutput(mergingObject, message, interpolationValues);
      if (typeof output !== "undefined") {
        console.error(`${PREFIX} ERROR ${output}`);
      }
    }
  }
}
