import format from "@arcjet/sprintf";

function bigintReplacer(key: string, value: unknown) {
  if (typeof value === "bigint") {
    return "[BigInt]";
  }

  return value;
}

// TODO: Deduplicate this and sprintf implementation
function tryStringify(o: unknown) {
  try {
    return JSON.stringify(o, bigintReplacer);
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
export interface LoggerOptions {
  /**
   * Log level.
   */
  level: LogLevel;
}

const PREFIX = "✦Aj";

function getMessage(obj: unknown, msg: unknown, args: unknown[]) {
  // The first argument was the message so juggle the args
  if (typeof obj === "string") {
    args = [msg, ...args];
    msg = obj;
  }

  // Prefer a string message over `obj.msg`, as per Pino:
  // https://github.com/pinojs/pino/blob/8db130eba0439e61c802448d31eb1998cebfbc98/docs/api.md#message-string
  if (typeof msg === "string") {
    return format(msg, ...args);
  }

  if (
    typeof obj === "object" &&
    obj !== null &&
    "msg" in obj &&
    typeof obj.msg === "string"
  ) {
    return format(obj.msg, [msg, ...args]);
  }
}

function getOutput(obj: unknown, msg: unknown, args: unknown[]) {
  let output = getMessage(obj, msg, args);
  if (typeof output !== "string") {
    return;
  }

  if (typeof obj === "object" && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
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
   * @param opts
   *   Configuration.
   * @returns
   *   Logger.
   */
  constructor(opts: LoggerOptions) {
    if (typeof opts.level !== "string") {
      throw new Error(`Invalid log level`);
    }

    switch (opts.level) {
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
        throw new Error(`Unknown log level: ${opts.level}`);
      }
    }
  }

  /**
   * Debug.
   *
   * @param msg
   *   Template.
   * @param args
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  debug(msg: string, ...args: unknown[]): void;
  /**
   * Debug.
   *
   * @param obj
   *   Merging object copied into the JSON log line.
   * @param msg
   *   Template.
   * @param args
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  debug(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  debug(obj: unknown, msg?: unknown, ...args: unknown[]): void {
    if (this.#logLevel <= 0) {
      const output = getOutput(obj, msg, args);
      if (typeof output !== "undefined") {
        console.debug(`${PREFIX} DEBUG ${output}`);
      }
    }
  }

  /**
   * Info.
   *
   * @param msg
   *   Template.
   * @param args
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  info(msg: string, ...args: unknown[]): void;
  /**
   * Info.
   *
   * @param obj
   *   Merging object copied into the JSON log line.
   * @param msg
   *   Template.
   * @param args
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  info(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  info(obj: unknown, msg?: unknown, ...args: unknown[]): void {
    if (this.#logLevel <= 1) {
      const output = getOutput(obj, msg, args);
      if (typeof output !== "undefined") {
        console.info(`${PREFIX} INFO ${output}`);
      }
    }
  }

  /**
   * Warn.
   *
   * @param msg
   *   Template.
   * @param args
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  warn(msg: string, ...args: unknown[]): void;
  /**
   * Warn.
   *
   * @param obj
   *   Merging object copied into the JSON log line.
   * @param msg
   *   Template.
   * @param args
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  warn(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  warn(obj: unknown, msg?: unknown, ...args: unknown[]): void {
    if (this.#logLevel <= 2) {
      const output = getOutput(obj, msg, args);
      if (typeof output !== "undefined") {
        console.warn(`${PREFIX} WARN ${output}`);
      }
    }
  }

  /**
   * Error.
   *
   * @param msg
   *   Template.
   * @param args
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  error(msg: string, ...args: unknown[]): void;
  /**
   * Error.
   *
   * @param obj
   *   Merging object copied into the JSON log line.
   * @param msg
   *   Template.
   * @param args
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  error(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  error(obj: unknown, msg?: unknown, ...args: unknown[]): void {
    if (this.#logLevel <= 3) {
      const output = getOutput(obj, msg, args);
      if (typeof output !== "undefined") {
        console.error(`${PREFIX} ERROR ${output}`);
      }
    }
  }
}
