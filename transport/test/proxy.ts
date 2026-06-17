import assert from "node:assert/strict";
import http from "node:http";

/**
 * Standard proxy environment variables that we save and restore around tests
 * so they cannot leak between cases or from the host environment.
 */
const proxyEnvironmentKeys = [
  "HTTP_PROXY",
  "http_proxy",
  "HTTPS_PROXY",
  "https_proxy",
  "NO_PROXY",
  "no_proxy",
];

/**
 * Start listening on a random port on the loopback interface.
 *
 * @param server
 *   Server to listen with.
 * @returns
 *   Base URL the server is listening on.
 */
export async function listen(server: http.Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");

  return `http://127.0.0.1:${(address as { port: number }).port}`;
}

/**
 * Close a server.
 *
 * @param server
 *   Server to close.
 * @returns
 *   Promise that resolves once the server is closed.
 */
export async function close(server: http.Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Create a forwarding HTTP proxy.
 *
 * The proxy asserts that the absolute-form request URI it receives targets the
 * expected origin, then forwards the request and pipes the response back.
 *
 * @param expectedOrigin
 *   Origin the proxy expects to forward to.
 * @param onRequest
 *   Called for every request the proxy receives.
 * @returns
 *   Proxy server.
 */
export function createProxy(
  expectedOrigin: string,
  onRequest: () => void,
): http.Server {
  return http.createServer((incoming, outgoing) => {
    onRequest();

    assert.ok(incoming.url);
    const requested = new URL(incoming.url);
    assert.equal(requested.origin, expectedOrigin);

    // Build the forwarded URL from the trusted `expectedOrigin` rather than the
    // incoming request, so the request target's host can't be influenced by the
    // (asserted, but still externally provided) request URL.
    const target = new URL(
      requested.pathname + requested.search,
      expectedOrigin,
    );

    const forwarded = http.request(
      target,
      {
        headers: incoming.headers,
        method: incoming.method,
      },
      (response) => {
        outgoing.writeHead(response.statusCode ?? 500, response.headers);
        response.pipe(outgoing);
      },
    );

    forwarded.on("error", (error) => {
      outgoing.destroy(error);
    });

    incoming.pipe(forwarded);
  });
}

/**
 * Run a function with a clean proxy environment.
 *
 * Saves and clears all standard proxy environment variables, sets `HTTP_PROXY`
 * (and optionally `NO_PROXY`), then restores the previous values afterwards.
 *
 * @param proxyUrl
 *   Value to use for `HTTP_PROXY`.
 * @param fn
 *   Function to run.
 * @param noProxy
 *   Optional value to use for `NO_PROXY`.
 * @returns
 *   Result of `fn`.
 */
export async function withHttpProxyEnvironment<T>(
  proxyUrl: string,
  fn: () => Promise<T>,
  noProxy?: string,
): Promise<T> {
  const previous = new Map<string, string>();
  for (const key of proxyEnvironmentKeys) {
    const value = process.env[key];
    if (typeof value === "string") {
      previous.set(key, value);
    }

    delete process.env[key];
  }

  process.env.HTTP_PROXY = proxyUrl;
  if (typeof noProxy === "string") {
    process.env.NO_PROXY = noProxy;
  }

  try {
    return await fn();
  } finally {
    for (const key of proxyEnvironmentKeys) {
      delete process.env[key];
    }

    for (const [key, value] of previous) {
      process.env[key] = value;
    }
  }
}
