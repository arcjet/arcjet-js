// This file is used when running in Bun.
// It uses DOM based APIs (`@connectrpc/connect-web`) to connect to the API.
// Bun slightly differs in how it implements Node APIs and that causes problems.
//
// Bun's `fetch` has built-in proxy support and honors the standard proxy
// environment variables (`HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY`), so we
// only need to detect and log when a proxy is in use.
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
  // Bun's `fetch` performs the proxying itself; we detect to log a line.
  detectProxy(new URL(baseUrl), options);

  return createConnectTransport({
    baseUrl,
  });
}
