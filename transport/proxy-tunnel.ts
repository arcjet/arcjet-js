import type { SecureClientSessionOptions } from "node:http2";
import * as net from "node:net";
import { Duplex } from "node:stream";
import * as tls from "node:tls";

/**
 * Route an HTTP/2 session through a forward proxy using an HTTP `CONNECT`
 * tunnel, preserving HTTP/2 to the origin.
 *
 * Node's built-in HTTP agent proxy support (and the `https-proxy-agent` family)
 * only wire a proxy into the HTTP/1.1 agent, which is why proxying otherwise
 * forces a downgrade from HTTP/2. But HTTP/2 survives a `CONNECT` tunnel
 * end-to-end: the proxy is told to open a raw TCP tunnel and thereafter only
 * blindly forwards bytes (RFC 9110 §9.3.6), so the TLS handshake — including the
 * ALPN negotiation that selects `h2` — happens directly with the origin. The
 * proxy never sees, and so cannot downgrade, the negotiated protocol.
 *
 * The one wrinkle is that {@linkcode http2.connect}'s `createConnection`
 * callback must return a {@linkcode Duplex} synchronously, but the `CONNECT`
 * handshake is asynchronous. We bridge that gap with a small `Duplex` that
 * buffers whatever the consumer writes (the TLS `ClientHello`, or the HTTP/2
 * client preface for a cleartext target) until the proxy answers `2xx`, then
 * splices itself onto the proxy socket. Because the contract stays synchronous,
 * this drops into `@connectrpc/connect-node`'s default `Http2SessionManager`
 * via `nodeOptions.createConnection` with no fork — reconnection, pings, and the
 * idle timeout all keep working.
 *
 * This is Node-only. Bun and Deno don't implement the agent option this sits
 * alongside, and their `fetch` is used for proxying instead.
 *
 * @param proxyUrl
 *   Proxy to route through (for example `http://127.0.0.1:3128`). An HTTPS proxy
 *   (TLS to the proxy itself) is supported too.
 * @returns
 *   A `createConnection` callback for `http2.connect(..., { createConnection })`
 *   (and therefore for connect-node's `nodeOptions.createConnection`).
 */
export function createTunnelingConnection(
  proxyUrl: string,
): (authority: URL, options: SecureClientSessionOptions) => Duplex {
  const proxy = new URL(proxyUrl);
  const proxyIsHttps = proxy.protocol === "https:";
  const proxyPort = Number(proxy.port) || (proxyIsHttps ? 443 : 80);

  // `Proxy-Authorization` header from any credentials embedded in the proxy URL.
  const proxyAuthorization =
    proxy.username === ""
      ? undefined
      : "Basic " +
        Buffer.from(
          decodeURIComponent(proxy.username) +
            ":" +
            decodeURIComponent(proxy.password),
        ).toString("base64");

  return function createConnection(authority, options): Duplex {
    const originIsHttps = authority.protocol === "https:";
    const originPort = Number(authority.port) || (originIsHttps ? 443 : 80);
    const originAuthority = authority.hostname + ":" + originPort;

    // The bridge is the underlying transport the HTTP/2 client writes into. We
    // hold those bytes until the `CONNECT` tunnel is established, then flush and
    // splice the bridge onto the proxy socket.
    let tunnelReady = false;
    const pending: Array<{
      chunk: Buffer;
      callback: (error?: Error | null) => void;
    }> = [];

    const bridge = new Duplex({
      read() {
        // Push-driven; see the splice below.
      },
      write(chunk, _encoding, callback) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        if (tunnelReady) {
          proxySocket.write(buffer, callback);
        } else {
          pending.push({ chunk: buffer, callback });
        }
      },
    });

    // 1. Open the connection to the proxy itself. Typed as the common
    //    `net.Socket` supertype (a `tls.TLSSocket` is one) so `.on(...)` event
    //    listeners resolve against a single typed event map rather than a union
    //    that would leave their parameters implicitly `any`.
    const proxySocket: net.Socket = proxyIsHttps
      ? tls.connect({
          host: proxy.hostname,
          port: proxyPort,
          servername: proxy.hostname,
        })
      : net.connect({ host: proxy.hostname, port: proxyPort });

    // Disable Nagle's algorithm on the tunnel. HTTP/2 sends many small,
    // dependent control frames; left on, Nagle interacts with the peer's
    // delayed ACK to add ~40ms per round trip. Node sets this on its own HTTP/2
    // sockets, but since we supply the socket we must set it ourselves. Note
    // that an intermediate proxy that buffers the tunnel can reintroduce the
    // same penalty regardless of this setting.
    proxySocket.setNoDelay(true);

    // 2. Once connected to the proxy, ask it to tunnel to the origin authority.
    proxySocket.once(proxyIsHttps ? "secureConnect" : "connect", () => {
      let request = "CONNECT " + originAuthority + " HTTP/1.1\r\n";
      request += "Host: " + originAuthority + "\r\n";
      if (proxyAuthorization !== undefined) {
        request += "Proxy-Authorization: " + proxyAuthorization + "\r\n";
      }
      request += "\r\n";
      proxySocket.write(request);
    });

    // 3. Read the proxy's response. Buffer until the header terminator, check
    //    the status line, and only on `2xx` splice the tunnel onto the bridge.
    let head = Buffer.alloc(0);
    function onData(chunk: Buffer) {
      head = Buffer.concat([head, chunk]);
      const terminator = head.indexOf("\r\n\r\n");
      if (terminator === -1) {
        return; // Wait for the full response head.
      }

      proxySocket.off("data", onData);

      const statusLine = head
        .subarray(0, head.indexOf("\r\n"))
        .toString("latin1");
      const status = Number(statusLine.split(" ")[1]);
      if (!(status >= 200 && status < 300)) {
        const error = new Error(
          "Proxy CONNECT failed with status: " + statusLine.trim(),
        );
        proxySocket.destroy(error);
        bridge.destroy(error);
        return;
      }

      // Anything past the header terminator is already tunnel data (rare for a
      // fresh handshake, but never drop it).
      const leftover = head.subarray(terminator + 4);
      if (leftover.length > 0) {
        bridge.push(leftover);
      }

      // Splice: proxy -> bridge, so origin bytes become readable by the client.
      proxySocket.on("data", (data: Buffer) => bridge.push(data));
      proxySocket.on("end", () => bridge.push(null));

      // Flush whatever the client buffered while the tunnel was establishing.
      tunnelReady = true;
      for (const { chunk: queued, callback } of pending) {
        proxySocket.write(queued, callback);
      }
      pending.length = 0;

      // The CONNECT response head is no longer needed; release it so it isn't
      // retained for the lifetime of the (long-lived) connection.
      head = Buffer.alloc(0);
    }
    proxySocket.on("data", onData);

    // Propagate failures in both directions so the session manager observes them.
    proxySocket.on("error", (error: Error) => bridge.destroy(error));
    bridge.on("close", () => proxySocket.destroy());

    // 4. For an HTTPS origin, run TLS *to the origin* over the tunnel, offering
    //    h2 via ALPN; ALPN is negotiated with the origin, not the proxy. For a
    //    cleartext origin, the bridge itself carries HTTP/2 (h2c) over the
    //    tunnel.
    if (!originIsHttps) {
      return bridge;
    }

    return tls.connect({
      ...options,
      socket: bridge,
      servername: authority.hostname,
      ALPNProtocols: ["h2"],
    });
  };
}
