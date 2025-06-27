// Bun doesn't properly support connect-node so we need to use connect-web
import { createConnectTransport } from "@connectrpc/connect-web";

export function createTransport(baseUrl: string) {
  return createConnectTransport({
    baseUrl,
  });
}
