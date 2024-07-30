import { createConnectTransport } from "@connectrpc/connect-node";

export function createTransport(baseUrl: string) {
  return createConnectTransport({
    baseUrl,
    httpVersion: "2",
  });
}
