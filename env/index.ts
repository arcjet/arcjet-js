/**
 * Environment.
 */
export type Env = {
  [key: string]: unknown;
  /**
   * Base URL of Arcjet API.
   */
  ARCJET_BASE_URL?: string | undefined;
  /**
   * Environment of Arcjet SDK.
   */
  ARCJET_ENV?: string | undefined;
  /**
   * Key for Arcjet API.
   */
  ARCJET_KEY?: string | undefined;
  /**
   * Log level of Arcjet SDK.
   */
  ARCJET_LOG_LEVEL?: string | undefined;
  /**
   * Name of Fly.io app.
   */
  FLY_APP_NAME?: string | undefined;
  /**
   * Vite mode.
   */
  MODE?: string | undefined;
  /**
   * Environment of Node.js.
   */
  NODE_ENV?: string | undefined;
  /**
   * Render environment variable.
   */
  RENDER?: string | undefined;
  /**
   * Vercel environment variable.
   */
  VERCEL?: string | undefined;
};

type Platform = "fly-io" | "render" | "vercel";

/**
 * Detect the platform.
 *
 * @param environment
 *   Environment.
 * @returns
 *   Name of platform if found.
 */
export function platform(environment: Env): Platform | undefined {
  if (
    typeof environment["FLY_APP_NAME"] === "string" &&
    environment["FLY_APP_NAME"] !== ""
  ) {
    return "fly-io";
  }

  if (
    typeof environment["VERCEL"] === "string" &&
    environment["VERCEL"] === "1"
  ) {
    return "vercel";
  }

  // https://render.com/docs/environment-variables
  if (
    typeof environment["RENDER"] === "string" &&
    environment["RENDER"] === "true"
  ) {
    return "render";
  }
}

/**
 * Check if the environment is development.
 *
 * @param environment
 *   Environment.
 * @returns
 *   Whether the environment is development.
 */
export function isDevelopment(environment: Env): boolean {
  return (
    environment.NODE_ENV === "development" ||
    environment.MODE === "development" ||
    environment.ARCJET_ENV === "development"
  );
}

type Level = "debug" | "error" | "info" | "warn";

/**
 * Get the log level.
 *
 * @param environment
 *   Environment.
 * @returns
 *   Log level.
 */
export function logLevel(environment: Env): Level {
  const level = environment["ARCJET_LOG_LEVEL"];
  switch (level) {
    case "debug":
    case "info":
    case "warn":
    case "error":
      return level;
    default:
      // Default to warn if not set
      return "warn";
  }
}

const baseUrlAllowed = [
  "https://decide.arcjet.com",
  "https://decide.arcjettest.com",
  "https://fly.decide.arcjet.com",
  "https://fly.decide.arcjettest.com",
  "https://decide.arcjet.orb.local:4082",
];

/**
 * Get the base URL of an Arcjet API.
 *
 * @param environment
 *   Environment.
 * @returns
 *   Base URL of Arcjet API.
 */
export function baseUrl(environment: Env) {
  // Use ARCJET_BASE_URL if it is set and belongs to our allowlist; otherwise
  // use the hardcoded default.
  if (
    typeof environment["ARCJET_BASE_URL"] === "string" &&
    baseUrlAllowed.includes(environment["ARCJET_BASE_URL"])
  ) {
    return environment["ARCJET_BASE_URL"];
  }

  // If we're running on fly.io, use the Arcjet Decide Service hosted on fly
  // Ref: https://fly.io/docs/machines/runtime-environment/#environment-variables
  if (platform(environment) === "fly-io") {
    return "https://fly.decide.arcjet.com";
  }

  return "https://decide.arcjet.com";
}

/**
 * Get the key for an Arcjet API.
 *
 * @param environment
 *   Environment.
 * @returns
 *   Key for Arcjet API if found.
 */
export function apiKey(environment: Env): string | undefined {
  const key = environment["ARCJET_KEY"];
  if (typeof key === "string" && key.startsWith("ajkey_")) {
    return key;
  }
}
