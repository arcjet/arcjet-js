// This file is used when running on Deno.
// It uses DOM based APIs (`@connectrpc/connect-web`) to connect to the API
// rather than the Node.js HTTP/2 transport, because Deno's `fetch` has built-in
// proxy support and honors the standard proxy environment variables
// (`HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY`) while its Node.js HTTP
// compatibility layer does not.
//
// Like `edge-light.ts` and `workerd.ts`, this solves the `redirect` option set
// to `error` inside `connect`.
//
// For more information, see:
//
// * <https://github.com/connectrpc/connect-es/pull/589>
// * <https://github.com/connectrpc/connect-es/issues/749#issuecomment-1693507516>
// * <https://github.com/connectrpc/connect-es/pull/1082>
// * <https://github.com/e2b-dev/E2B/pull/669/files>
// * <https://github.com/connectrpc/connect-es/issues/577#issuecomment-2210103503>
import type { Transport } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { detectProxy } from "./detect-proxy.js";

export type {
  ProxyEnvironment,
  TransportLogger,
  TransportOptions,
} from "./detect-proxy.js";

import type { TransportOptions } from "./detect-proxy.js";

export function createTransport(
  baseUrl: string,
  options?: TransportOptions,
): Transport {
  // Deno's `fetch` performs the proxying itself; we detect to log a line.
  detectProxy(new URL(baseUrl), options);

  return createConnectTransport({
    baseUrl,
    fetch: fetchProxy,
  });
}

function fetchProxy(
  input: Request | URL | string,
  init?: RequestInit | undefined,
): Promise<Response> {
  return fetch(input, { ...init, redirect: "follow" });
}
