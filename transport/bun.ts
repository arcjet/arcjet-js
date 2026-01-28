// This file is used when running in Bun.
// It uses DOM based APIs (`@arcjet-vendor/connectrpc-connect-web`) to connect to the API.
// Bun slightly differs in how it implements Node APIs and that causes problems.
import { createConnectTransport } from "@arcjet-vendor/connectrpc-connect-web";

export function createTransport(baseUrl: string) {
  return createConnectTransport({
    baseUrl,
  });
}
