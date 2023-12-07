// TODO(#180): Implement our own format utility
import { format } from "util";

export type LogLevel = "DEBUG" | "LOG" | "WARN" | "ERROR";

function getEnvLogLevel(): LogLevel | undefined {
  const level = process.env["ARCJET_LOG_LEVEL"];
  switch (level) {
    case "DEBUG":
    case "LOG":
    case "WARN":
    case "ERROR":
      return level;
    default:
      return undefined;
  }
}

function getTimeLabel(label: string) {
  return `✦Aj Latency ${label}`;
}

export class Logger {
  #logLevel: number;

  constructor() {
    const levelStr = getEnvLogLevel() ?? "WARN";
    switch (levelStr) {
      case "DEBUG":
        this.#logLevel = 0;
        break;
      case "LOG":
        this.#logLevel = 1;
        break;
      case "WARN":
        this.#logLevel = 2;
        break;
      case "ERROR":
        this.#logLevel = 3;
        break;
      default:
        const _exhaustiveCheck: never = levelStr;
        throw new Error(`Unknown log level: ${levelStr}`);
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

  debug(msg: string, ...details: unknown[]) {
    if (this.#logLevel <= 0) {
      console.debug("✦Aj %s", format(msg, ...details));
    }
  }

  log(msg: string, ...details: unknown[]) {
    if (this.#logLevel <= 1) {
      console.log("✦Aj %s", format(msg, ...details));
    }
  }

  warn(msg: string, ...details: unknown[]) {
    if (this.#logLevel <= 2) {
      console.warn("✦Aj %s", format(msg, ...details));
    }
  }

  error(msg: string, ...details: unknown[]) {
    if (this.#logLevel <= 3) {
      console.error("✦Aj %s", format(msg, ...details));
    }
  }
}

// Singleton logger that only accounts for `process.env["ARCJET_LOG_LEVEL"]` at module-load time
const logger = new Logger();
export default logger;
