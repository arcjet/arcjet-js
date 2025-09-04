// This file is used when running on the edge.
// Specifically `edge-light` by Vercel and `workerd` by Cloudflare.
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
    interceptors: [
      (next) => (req) => {
        req.init.redirect = "follow";
        return next(req);
      },
    ],
    fetch,
  });
}
