// This entire workaround is to make SvelteKit run on Netlify Edge Functions
// which execute in an old version of Deno that doesn't support some `node:*`
// imports, such as `node:assert`. This makes the undici import fail when we try
// to use `@connectrpc/connect-node`.
//
// By making these dynamic imports, we can await them inside of the `unary` or
// `stream` function calls to figure out which client we are using.

export function createTransport(baseUrl: string) {
  const web = import("@connectrpc/connect-web").then(
    ({ createConnectTransport }) => {
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
    },
  );
  const node = import("@connectrpc/connect-node").then(
    ({ Http2SessionManager, createConnectTransport }) => {
      // We create our own session manager so we can attempt to pre-connect
      const sessionManager = new Http2SessionManager(baseUrl, {
        // AWS Global Accelerator doesn't support PING so we use a very high idle
        // timeout. Ref:
        // https://docs.aws.amazon.com/global-accelerator/latest/dg/introduction-how-it-works.html#about-idle-timeout
        idleConnectionTimeoutMs: 340 * 1000,
      });

      // We ignore the promise result because this is an optimistic pre-connect
      sessionManager.connect();

      return createConnectTransport({
        baseUrl,
        httpVersion: "2",
        sessionManager,
      });
    },
  );

  return {
    async unary(
      ...args: [any, any, any, any, any, any, any]
    ): Promise<unknown> {
      let client;
      try {
        client = await node;
      } catch {
        client = await web;
      }

      return client.unary(...args);
    },
    async stream(
      ...args: [any, any, any, any, any, any, any]
    ): Promise<unknown> {
      let client;
      try {
        client = await node;
      } catch {
        client = await web;
      }

      return client.stream(...args);
    },
  };
}
