import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import http from "node:http";
import http2 from "node:http2";
import net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
 * Open tunnel sockets per `CONNECT` proxy.
 *
 * A `net.Server` has no `closeAllConnections()`, and a keep-alive agent holds
 * the tunnel open, so we track the accepted sockets here and destroy them in
 * `close()` to let the server shut down.
 */
const tunnelSockets = new WeakMap<net.Server, Set<net.Socket>>();

/**
 * Open server-side HTTP/2 sessions per origin server.
 *
 * The client's `Http2SessionManager` keeps its session — and the underlying
 * socket — alive for reuse with a long idle timeout, so a direct HTTP/2 origin's
 * `server.close()` would wait on that idle connection (hanging the runner on
 * some Node versions; `closeAllConnections()` doesn't tear down an HTTP/2
 * *session*). We track sessions per server via {@linkcode trackHttp2Sessions}
 * and destroy them in {@linkcode close} to release the client connection.
 */
const http2Sessions = new WeakMap<
  net.Server,
  Set<http2.ServerHttp2Session>
>();

/**
 * Track the HTTP/2 sessions a server accepts so {@linkcode close} can destroy
 * them. Use this for direct HTTP/2 origins (those reached without a `CONNECT`
 * tunnel, whose teardown otherwise closes the client connection).
 *
 * @param server
 *   HTTP/2 server to track sessions for.
 * @returns
 *   The same server, for chaining with `http2.createServer(...)`.
 */
export function trackHttp2Sessions<
  T extends http2.Http2Server | http2.Http2SecureServer,
>(server: T): T {
  const sessions = new Set<http2.ServerHttp2Session>();
  server.on("session", (session) => {
    sessions.add(session);
    session.on("close", () => sessions.delete(session));
  });
  http2Sessions.set(server, sessions);
  return server;
}

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
  server: net.Server,
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
export async function close(server: net.Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });

    // A keep-alive agent (and an open tunnel) holds connections open, so
    // `close()` would otherwise wait forever. Force them shut: HTTP(S) servers
    // expose `closeAllConnections()`, while `CONNECT` proxies are `net.Server`s
    // whose accepted sockets we tracked above (destroying one tears down its
    // tunnel, which the upstream side follows via its `close` handler).
    const httpServer = server as net.Server & {
      closeAllConnections?: () => void;
    };
    httpServer.closeAllConnections?.();
    const sockets = tunnelSockets.get(server);
    if (sockets) {
      for (const socket of sockets) {
        socket.destroy();
      }
    }
    // Destroy any tracked HTTP/2 sessions so a client holding an idle session
    // (see `http2Sessions`) doesn't keep `server.close()` — and the process —
    // waiting on its idle timeout.
    const sessions = http2Sessions.get(server);
    if (sessions) {
      for (const session of sessions) {
        session.destroy();
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
 * Create a tunneling proxy that handles the `CONNECT` method.
 *
 * This is how a proxy handles HTTPS targets: the client sends
 * `CONNECT host:port`, the proxy opens a raw TCP tunnel to the origin and pipes
 * bytes through without terminating TLS. The proxy asserts that the requested
 * authority matches the expected origin before tunneling.
 *
 * Implemented with `node:net` rather than `http.createServer().on("connect")`
 * because some runtimes' Node compatibility layers (e.g. older Deno) don't emit
 * the `connect` event, whereas a raw TCP server works everywhere.
 *
 * @param expectedAuthority
 *   `host:port` the proxy expects to tunnel to.
 * @param onConnect
 *   Called for every `CONNECT` request the proxy receives.
 * @param connectHost
 *   Host to actually open the upstream connection to (optional). Defaults to the
 *   host in `expectedAuthority`. Pass `127.0.0.1` when the authority uses a
 *   hostname (e.g. to exercise SNI) but the origin listens on the loopback IP,
 *   so the tunnel stays on IPv4 regardless of how `localhost` resolves.
 * @returns
 *   Proxy server.
 */
export function createConnectProxy(
  expectedAuthority: string,
  onConnect: () => void,
  connectHost?: string,
): net.Server {
  const separator = expectedAuthority.lastIndexOf(":");
  const host = connectHost ?? expectedAuthority.slice(0, separator);
  const port = Number(expectedAuthority.slice(separator + 1));

  const sockets = new Set<net.Socket>();
  const proxy = net.createServer((client) => {
    sockets.add(client);
    client.on("close", () => sockets.delete(client));
    client.on("error", () => {});

    let request = "";
    function onData(chunk: Buffer) {
      request += chunk.toString("utf8");
      const lineEnd = request.indexOf("\r\n");
      // Wait until the full CONNECT request line has arrived. A client only
      // sends tunnel (TLS) bytes after the `200`, so nothing is lost here.
      if (lineEnd === -1) {
        return;
      }
      client.off("data", onData);

      onConnect();
      const match = /^CONNECT (\S+) HTTP\/1\.1$/.exec(request.slice(0, lineEnd));
      assert.ok(match, "expected a CONNECT request");
      // Tunnel to the trusted `expectedAuthority`, not the (asserted, but
      // externally provided) request target.
      assert.equal(match[1], expectedAuthority);

      const upstream = net.connect(port, host, () => {
        client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        upstream.pipe(client);
        client.pipe(upstream);
      });
      upstream.on("error", () => client.destroy());
      // When the client side is torn down (e.g. on `close()`), drop the
      // upstream connection too so the origin server can close cleanly.
      client.on("close", () => upstream.destroy());
    }

    client.on("data", onData);
  });

  tunnelSockets.set(proxy, sockets);
  return proxy;
}

/**
 * Generate a throwaway self-signed certificate for an origin.
 *
 * Used to stand up a real HTTPS origin so the HTTPS-through-proxy (`CONNECT`)
 * path can be exercised. Depending on the test, the client either trusts the
 * certificate (via `ca`) to complete the handshake and assert the negotiated
 * protocol, or deliberately doesn't trust it (so the handshake fails and the
 * test only verifies routing via the proxy receiving the `CONNECT`).
 *
 * @param host
 *   Host the certificate identifies (defaults to `127.0.0.1`). An IP literal is
 *   added as an `IP` subjectAltName; a hostname as a `DNS` subjectAltName (which
 *   is what a real TLS client validates against the SNI it sends).
 * @returns
 *   PEM-encoded private key and certificate.
 */
export function generateSelfSignedCert(host = "127.0.0.1"): {
  key: string;
  cert: string;
} {
  const directory = mkdtempSync(join(tmpdir(), "arcjet-transport-cert-"));
  const keyFile = join(directory, "key.pem");
  const certFile = join(directory, "cert.pem");
  const subjectAltName = net.isIP(host) ? `IP:${host}` : `DNS:${host}`;

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
      `/CN=${host}`,
      "-addext",
      `subjectAltName=${subjectAltName}`,
    ],
    { stdio: "ignore" },
  );

  return {
    key: readFileSync(keyFile, "utf8"),
    cert: readFileSync(certFile, "utf8"),
  };
}
