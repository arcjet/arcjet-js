// Shared test helpers for the `createTransport` unit tests, which all need to
// neutralize the ambient proxy environment and (for the Bun/Deno cases) fake a
// runtime global.
import { afterEach, beforeEach } from "node:test";

// Standard proxy variables, cleared around every test so the host environment
// (e.g. a developer or CI runner with `HTTPS_PROXY` set) can't flip a no-proxy
// case onto the proxy path or leak a stray startup log.
const proxyEnvironmentKeys = [
  "HTTP_PROXY",
  "http_proxy",
  "HTTPS_PROXY",
  "https_proxy",
  "NO_PROXY",
  "no_proxy",
];

/**
 * Clear the standard proxy environment variables before each test in the
 * calling suite and restore them afterward. Call once inside a `describe`.
 */
export function isolateProxyEnvironment(): void {
  const saved = new Map<string, string>();

  beforeEach(() => {
    for (const key of proxyEnvironmentKeys) {
      const value = process.env[key];
      if (typeof value === "string") {
        saved.set(key, value);
      }
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of proxyEnvironmentKeys) {
      delete process.env[key];
    }
    for (const [key, value] of saved) {
      process.env[key] = value;
    }
    saved.clear();
  });
}

/**
 * Run `fn` with `globalThis[name]` defined, to simulate running under the Bun
 * or Deno runtime, restoring the previous global and silencing the startup log
 * afterward.
 *
 * @param name
 *   Global to define (`"Bun"` or `"Deno"`).
 * @param fn
 *   Function to run with the simulated runtime.
 */
export function withSimulatedRuntime(name: string, fn: () => void): void {
  const had = name in globalThis;
  const original: unknown = Reflect.get(globalThis, name);
  const originalInfo = console.info;
  Reflect.set(globalThis, name, {});
  console.info = (): void => {};

  try {
    fn();
  } finally {
    if (had) {
      Reflect.set(globalThis, name, original);
    } else {
      Reflect.deleteProperty(globalThis, name);
    }
    console.info = originalInfo;
  }
}
