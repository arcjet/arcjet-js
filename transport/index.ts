import {
  createConnectTransport,
  Http2SessionManager,
} from "@connectrpc/connect-node";

export function createTransport(baseUrl: string) {
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
}
