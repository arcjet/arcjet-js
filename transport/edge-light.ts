// This file is used when running on the `edge-light` condition.
// Specifically Edge by Vercel.
// It is the same as `workerd.ts`, which runs on Cloudflare.
// It uses DOM based APIs (`@connectrpc/connect-web`) to connect to the API.
// Differing from `bun.ts` this solves the `redirect` option set to `error`
// inside `connect` as that does not work on the edge.
//
// For more information, see:
//
// * <https://github.com/connectrpc/connect-es/pull/589>
// * <https://github.com/connectrpc/connect-es/issues/749#issuecomment-1693507516>
// * <https://github.com/connectrpc/connect-es/pull/1082>
// * <https://github.com/e2b-dev/E2B/pull/669/files>
import { createConnectTransport } from "@connectrpc/connect-web";

export function createTransport(baseUrl: string) {
  return createConnectTransport({
    baseUrl,
    fetch: fetchProxy,
  });
}

// See: <https://github.com/connectrpc/connect-es/issues/577#issuecomment-2210103503>.
function fetchProxy(
  input: Request | URL | string,
  init?: RequestInit | undefined,
): Promise<Response> {
  return fetch(input, { ...init, redirect: "manual" });
}
