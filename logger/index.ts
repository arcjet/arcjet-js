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
  } catch (e) {
    return "[Circular]";
  }
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LoggerOptions {
  level: LogLevel;
}

const PREFIX = "✦Aj";

function getTimeLabel(label: string) {
  return `${PREFIX} LATENCY ${label}`;
}

function getMessage(obj: unknown, msg: unknown, args: unknown[]) {
  // The first argument was the message so juggle the args
  if (typeof obj === "string") {
    args = [msg, ...args];
    msg = obj;
  }

  // The second argument was the message
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
      output += `\n    ${key}: ${tryStringify(value)}`;
    }
  }

  return output;
}

export class Logger {
  #logLevel: number;

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

  time(label: string) {
    if (this.#logLevel <= 0) {
      console.time(getTimeLabel(label));
    }
  }

  timeEnd(label: string) {
    if (this.#logLevel <= 0) {
      console.timeEnd(getTimeLabel(label));
    }
  }

  debug(msg: string, ...args: unknown[]): void;
  debug(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  debug(obj: unknown, msg?: unknown, ...args: unknown[]): void {
    if (this.#logLevel <= 0) {
      const output = getOutput(obj, msg, args);
      if (typeof output !== "undefined") {
        console.debug(`${PREFIX} DEBUG ${output}`);
      }
    }
  }

  info(msg: string, ...args: unknown[]): void;
  info(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  info(obj: unknown, msg?: unknown, ...args: unknown[]): void {
    if (this.#logLevel <= 1) {
      const output = getOutput(obj, msg, args);
      if (typeof output !== "undefined") {
        console.info(`${PREFIX} INFO ${output}`);
      }
    }
  }

  warn(msg: string, ...args: unknown[]): void;
  warn(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  warn(obj: unknown, msg?: unknown, ...args: unknown[]): void {
    if (this.#logLevel <= 2) {
      const output = getOutput(obj, msg, args);
      if (typeof output !== "undefined") {
        console.warn(`${PREFIX} WARN ${output}`);
      }
    }
  }

  error(msg: string, ...args: unknown[]): void;
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
