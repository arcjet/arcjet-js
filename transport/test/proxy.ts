import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Duplex } from "node:stream";

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
 * Live `CONNECT` tunnel sockets per proxy server.
 *
 * A `CONNECT` socket is detached from the server's normal connection tracking,
 * so neither `server.close()` nor `server.closeAllConnections()` will shut it
 * down. We track them here so `close()` can destroy them and stop a keep-alive
 * agent from holding the server open forever.
 */
const tunnelSockets = new WeakMap<http.Server, Set<Duplex>>();

/**
 * Start listening on a random port on the loopback interface.
 *
 * @param server
 *   Server to listen with.
 * @param protocol
 *   URL scheme to build the returned base URL with (defaults to `http`). Pass
 *   `https` for a TLS server.
 * @returns
 *   Base URL the server is listening on.
 */
export async function listen(
  server: http.Server,
  protocol: "http" | "https" = "http",
): Promise<string> {
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");

  return `${protocol}://127.0.0.1:${(address as { port: number }).port}`;
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

    // A keep-alive agent holds connections open, so `close()` would otherwise
    // wait forever. Force normal connections shut, then destroy any `CONNECT`
    // tunnel sockets (which `closeAllConnections()` doesn't track).
    server.closeAllConnections();
    const sockets = tunnelSockets.get(server);
    if (sockets) {
      for (const socket of sockets) {
        socket.destroy();
      }
    }
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

/**
 * Create a tunneling HTTP proxy that handles the `CONNECT` method.
 *
 * This is how a proxy handles HTTPS targets: the client sends
 * `CONNECT host:port`, the proxy opens a raw TCP tunnel to the origin and pipes
 * bytes through without terminating TLS. The proxy asserts that the requested
 * authority matches the expected origin before tunneling.
 *
 * @param expectedAuthority
 *   `host:port` the proxy expects to tunnel to.
 * @param onConnect
 *   Called for every `CONNECT` request the proxy receives.
 * @returns
 *   Proxy server.
 */
export function createConnectProxy(
  expectedAuthority: string,
  onConnect: () => void,
): http.Server {
  // Only `CONNECT` is expected; reject anything else so a mistaken
  // absolute-form request can't silently pass.
  const proxy = http.createServer((incoming, outgoing) => {
    outgoing.writeHead(405);
    outgoing.end();
  });

  const sockets = new Set<Duplex>();
  tunnelSockets.set(proxy, sockets);

  proxy.on("connect", (request, clientSocket, head) => {
    onConnect();

    assert.ok(request.url);
    assert.equal(request.url, expectedAuthority);

    sockets.add(clientSocket);
    clientSocket.on("close", () => sockets.delete(clientSocket));

    // Build the upstream target from the trusted `expectedAuthority` rather
    // than the (asserted, but externally provided) request URL.
    const separator = expectedAuthority.lastIndexOf(":");
    const host = expectedAuthority.slice(0, separator);
    const port = Number(expectedAuthority.slice(separator + 1));

    const upstream = net.connect(port, host, () => {
      clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length > 0) {
        upstream.write(head);
      }
      upstream.pipe(clientSocket);
      clientSocket.pipe(upstream);
    });

    upstream.on("error", () => clientSocket.destroy());
    clientSocket.on("error", () => upstream.destroy());
    // When the tunnel's client side is torn down (e.g. on `close()`), drop the
    // upstream connection too so the origin server can close cleanly.
    clientSocket.on("close", () => upstream.destroy());
  });

  return proxy;
}

/**
 * Generate a throwaway self-signed certificate for `127.0.0.1`.
 *
 * Used to stand up a real HTTPS origin so the HTTPS-through-proxy (`CONNECT`)
 * path can be exercised. The client deliberately doesn't trust this
 * certificate — `createTransport`'s agent exposes no `ca` option and disabling
 * TLS verification is a security anti-pattern — so the handshake over the
 * tunnel is expected to fail; the test verifies routing via the proxy
 * receiving the `CONNECT`.
 *
 * @returns
 *   PEM-encoded private key and certificate.
 */
export function generateSelfSignedCert(): { key: string; cert: string } {
  const directory = mkdtempSync(join(tmpdir(), "arcjet-transport-cert-"));
  const keyFile = join(directory, "key.pem");
  const certFile = join(directory, "cert.pem");

  execFileSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      keyFile,
      "-out",
      certFile,
      "-days",
      "1",
      "-subj",
      "/CN=127.0.0.1",
      "-addext",
      "subjectAltName=IP:127.0.0.1",
    ],
    { stdio: "ignore" },
  );

  return {
    key: readFileSync(keyFile, "utf8"),
    cert: readFileSync(certFile, "utf8"),
  };
}
