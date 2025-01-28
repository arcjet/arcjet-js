export type Env = {
  [key: string]: unknown;
  FLY_APP_NAME?: string;
  VERCEL?: string;
  MODE?: string;
  NODE_ENV?: string;
  ARCJET_KEY?: string;
  ARCJET_ENV?: string;
  ARCJET_LOG_LEVEL?: string;
  ARCJET_BASE_URL?: string;
};

export function platform(env: Env) {
  if (typeof env["FLY_APP_NAME"] === "string" && env["FLY_APP_NAME"] !== "") {
    return "fly-io" as const;
  }

  if (typeof env["VERCEL"] === "string" && env["VERCEL"] === "1") {
    return "vercel" as const;
  }
}

export function isDevelopment(env: Env) {
  return (
    env.NODE_ENV === "development" ||
    env.MODE === "development" ||
    env.ARCJET_ENV === "development"
  );
}

export function logLevel(env: Env) {
  const level = env["ARCJET_LOG_LEVEL"];
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

export function baseUrl(env: Env) {
  // TODO(#90): Remove this conditional before 1.0.0
  if (isDevelopment(env)) {
    if (env["ARCJET_BASE_URL"]) {
      return env["ARCJET_BASE_URL"];
    }

    // If we're running on fly.io, use the Arcjet Decide Service hosted on fly
    // Ref: https://fly.io/docs/machines/runtime-environment/#environment-variables
    if (platform(env) === "fly-io") {
      return "https://fly.decide.arcjet.com";
    }

    return "https://decide.arcjet.com";
  } else {
    // Use ARCJET_BASE_URL if it is set and belongs to our allowlist; otherwise
    // use the hardcoded default.
    if (
      typeof env["ARCJET_BASE_URL"] === "string" &&
      baseUrlAllowed.includes(env["ARCJET_BASE_URL"])
    ) {
      return env["ARCJET_BASE_URL"];
    }

    // If we're running on fly.io, use the Arcjet Decide Service hosted on fly
    // Ref: https://fly.io/docs/machines/runtime-environment/#environment-variables
    if (platform(env) === "fly-io") {
      return "https://fly.decide.arcjet.com";
    }

    return "https://decide.arcjet.com";
  }
}

export function apiKey(env: Env) {
  const key = env["ARCJET_KEY"];
  if (typeof key === "string" && key.startsWith("ajkey_")) {
    return key;
  }
}
