/**
 * Mock Connect RPC server implementing the v1alpha1 `DecideService` that the
 * core `arcjet` SDK calls from `protect()`.
 *
 * Uses HTTP/1.1 because Workers' `fetch()` doesn't control the outbound HTTP
 * version — Cloudflare's edge negotiates the protocol transparently — so the
 * Worker-side smoke test must reach a plain HTTP/1.1 origin.
 *
 * @packageDocumentation
 */
import http from "node:http";

import { create } from "@bufbuild/protobuf";
import { connectNodeAdapter } from "@connectrpc/connect-node";
import type { ConnectRouter } from "@connectrpc/connect";
import {
  Conclusion,
  DecideResponseSchema,
  DecideService,
  ReportResponseSchema,
} from "@arcjet/protocol/proto/decide/v1alpha1/decide_pb.js";

let decideCalls = 0;
let lastDecideRequest: {
  sdkVersion: string;
  ruleCount: number;
} | null = null;

/** Number of `decide` RPCs the mock server has received. */
export function getDecideCalls(): number {
  return decideCalls;
}

/** Fields captured from the last `decide` RPC, or `null` if none received. */
export function getLastDecideRequest(): typeof lastDecideRequest {
  return lastDecideRequest;
}

function routes(router: ConnectRouter): void {
  router.service(DecideService, {
    decide(request) {
      decideCalls++;
      lastDecideRequest = {
        sdkVersion: request.sdkVersion,
        ruleCount: request.rules.length,
      };
      return create(DecideResponseSchema, {
        decision: { conclusion: Conclusion.ALLOW },
      });
    },
    report() {
      return create(ReportResponseSchema, {});
    },
  });
}

/** Start an HTTP/1.1 server with the mock handler. Returns `{ baseUrl, close }`. */
export async function startHttpServer(
  port = 0,
): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  // Reset captured state so each server start is independent and the suite is
  // not order-dependent.
  decideCalls = 0;
  lastDecideRequest = null;

  const server = http.createServer(connectNodeAdapter({ routes }));
  await new Promise<void>((resolve) =>
    server.listen(port, "127.0.0.1", resolve),
  );
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- always AddressInfo after listen()
  const addr = server.address() as import("node:net").AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${addr.port}`,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      }),
  };
}
