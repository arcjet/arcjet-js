import { createConnectTransport } from "@connectrpc/connect-node";

export function createTransport(baseUrl: string) {
  return createConnectTransport({
    baseUrl,
    // Bun doesn't properly support HTTP/2 so we need to force HTTP/1.1
    httpVersion: "1.1",
  });
}
