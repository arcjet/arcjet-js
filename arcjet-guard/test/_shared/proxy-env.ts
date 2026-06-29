// Shared test helper for the `createTransport` unit tests, which all need to
// neutralize the ambient proxy environment so the host environment can't flip a
// no-proxy case onto the proxy path.
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
