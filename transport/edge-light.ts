import { createConnectTransport } from "@connectrpc/connect-web";

export function createTransport(baseUrl: string) {
  // The Connect Node client doesn't work on edge runtimes: https://github.com/bufbuild/connect-es/pull/589
  // so set the transport using connect-web. The interceptor is required for it work in the edge runtime.
  return createConnectTransport({
    baseUrl,
    interceptors: [
      /**
       * Ensures redirects are followed to properly support the Next.js/Vercel Edge
       * Runtime.
       * @see
       * https://github.com/connectrpc/connect-es/issues/749#issuecomment-1693507516
       */
      (next) => (req) => {
        req.init.redirect = "follow";
        return next(req);
      },
    ],
    fetch,
  });
}
