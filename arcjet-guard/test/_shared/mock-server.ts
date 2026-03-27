/**
 * Shared mock Connect RPC server for `@arcjet/guard` runtime tests.
 *
 * Provides `createMockTransport()` for in-memory tests, and
 * `startH2Server()` / `startH2SecureServer()` / `startHttpServer()`
 * for real-network tests that validate HTTP/2 and fetch transports end-to-end.
 *
 * @packageDocumentation
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import http2 from "node:http2";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { create } from "@bufbuild/protobuf";
import { createRouterTransport } from "@connectrpc/connect";
import type { Transport } from "@connectrpc/connect";
import { connectNodeAdapter } from "@connectrpc/connect-node";

import {
  DecideService,
  GuardResponseSchema,
  GuardDecisionSchema,
  GuardRuleResultSchema,
  ResultTokenBucketSchema,
  ResultFixedWindowSchema,
  ResultSlidingWindowSchema,
  ResultPromptInjectionSchema,
  ResultLocalSensitiveInfoSchema,
  ResultLocalCustomSchema,
  ResultErrorSchema,
  GuardConclusion,
  GuardRuleType,
  type GuardRequest,
  type GuardResponse,
} from "../../src/proto/proto/decide/v2/decide_pb.js";

export {
  create,
  createRouterTransport,
  type Transport,
  DecideService,
  GuardResponseSchema,
  GuardDecisionSchema,
  GuardRuleResultSchema,
  ResultTokenBucketSchema,
  ResultFixedWindowSchema,
  ResultSlidingWindowSchema,
  ResultPromptInjectionSchema,
  ResultLocalSensitiveInfoSchema,
  ResultLocalCustomSchema,
  ResultErrorSchema,
  GuardConclusion,
  GuardRuleType,
  type GuardRequest,
  type GuardResponse,
};

/** Handler type for mock server. */
export type MockHandler = (req: GuardRequest, context: { requestHeader: Headers }) => GuardResponse;

/** Extract the first rule submission or throw (test helper). */
function firstSubmission(req: GuardRequest): GuardRequest["ruleSubmissions"][number] {
  const sub = req.ruleSubmissions[0];
  if (sub === undefined) throw new Error("Expected at least one rule submission");
  return sub;
}

/** Create an in-memory Connect transport with a custom handler. */
export function createMockTransport(handler: MockHandler): Transport {
  return createRouterTransport(({ service }) => {
    service(DecideService, { guard: handler });
  });
}
/** Build an ALLOW response for a token bucket rule. */
export function tokenBucketAllow(req: GuardRequest): GuardResponse {
  const sub = firstSubmission(req);
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_allow_tb",
      conclusion: GuardConclusion.ALLOW,
      ruleResults: [
        create(GuardRuleResultSchema, {
          resultId: "gres_tb_allow",
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.TOKEN_BUCKET,
          result: {
            case: "tokenBucket",
            value: create(ResultTokenBucketSchema, {
              conclusion: GuardConclusion.ALLOW,
              remainingTokens: 95,
              maxTokens: 100,
              resetSeconds: 60,
              refillRate: 10,
              refillIntervalSeconds: 60,
            }),
          },
        }),
      ],
    }),
  });
}

/** Build a DENY response for a token bucket rule. */
export function tokenBucketDeny(req: GuardRequest): GuardResponse {
  const sub = firstSubmission(req);
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_deny_tb",
      conclusion: GuardConclusion.DENY,
      ruleResults: [
        create(GuardRuleResultSchema, {
          resultId: "gres_tb_deny",
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.TOKEN_BUCKET,
          result: {
            case: "tokenBucket",
            value: create(ResultTokenBucketSchema, {
              conclusion: GuardConclusion.DENY,
              remainingTokens: 0,
              maxTokens: 100,
              resetSeconds: 55,
              refillRate: 10,
              refillIntervalSeconds: 60,
            }),
          },
        }),
      ],
    }),
  });
}

/** Build an ALLOW response for a fixed window rule. */
export function fixedWindowAllow(req: GuardRequest): GuardResponse {
  const sub = firstSubmission(req);
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_allow_fw",
      conclusion: GuardConclusion.ALLOW,
      ruleResults: [
        create(GuardRuleResultSchema, {
          resultId: "gres_fw_allow",
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.FIXED_WINDOW,
          result: {
            case: "fixedWindow",
            value: create(ResultFixedWindowSchema, {
              conclusion: GuardConclusion.ALLOW,
              remainingRequests: 999,
              maxRequests: 1000,
              resetSeconds: 3500,
              windowSeconds: 3600,
            }),
          },
        }),
      ],
    }),
  });
}

/** Build a DENY response for a fixed window rule. */
export function fixedWindowDeny(req: GuardRequest): GuardResponse {
  const sub = firstSubmission(req);
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_deny_fw",
      conclusion: GuardConclusion.DENY,
      ruleResults: [
        create(GuardRuleResultSchema, {
          resultId: "gres_fw_deny",
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.FIXED_WINDOW,
          result: {
            case: "fixedWindow",
            value: create(ResultFixedWindowSchema, {
              conclusion: GuardConclusion.DENY,
              remainingRequests: 0,
              maxRequests: 100,
              resetSeconds: 1800,
              windowSeconds: 3600,
            }),
          },
        }),
      ],
    }),
  });
}

/** Build an ALLOW response for a sliding window rule. */
export function slidingWindowAllow(req: GuardRequest): GuardResponse {
  const sub = firstSubmission(req);
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_allow_sw",
      conclusion: GuardConclusion.ALLOW,
      ruleResults: [
        create(GuardRuleResultSchema, {
          resultId: "gres_sw_allow",
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.SLIDING_WINDOW,
          result: {
            case: "slidingWindow",
            value: create(ResultSlidingWindowSchema, {
              conclusion: GuardConclusion.ALLOW,
              remainingRequests: 50,
              maxRequests: 100,
              resetSeconds: 3600,
              intervalSeconds: 3600,
            }),
          },
        }),
      ],
    }),
  });
}

/** Build a DENY response for prompt injection detection. */
export function promptInjectionDeny(req: GuardRequest): GuardResponse {
  const sub = firstSubmission(req);
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_deny_pi",
      conclusion: GuardConclusion.DENY,
      ruleResults: [
        create(GuardRuleResultSchema, {
          resultId: "gres_pi_deny",
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.PROMPT_INJECTION,
          result: {
            case: "promptInjection",
            value: create(ResultPromptInjectionSchema, {
              conclusion: GuardConclusion.DENY,
            }),
          },
        }),
      ],
    }),
  });
}

/** Build a DENY response for sensitive info detection. */
export function sensitiveInfoDeny(req: GuardRequest): GuardResponse {
  const sub = firstSubmission(req);
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_deny_si",
      conclusion: GuardConclusion.DENY,
      ruleResults: [
        create(GuardRuleResultSchema, {
          resultId: "gres_si_deny",
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.LOCAL_SENSITIVE_INFO,
          result: {
            case: "localSensitiveInfo",
            value: create(ResultLocalSensitiveInfoSchema, {
              conclusion: GuardConclusion.DENY,
            }),
          },
        }),
      ],
    }),
  });
}

/** Build an ALLOW response for a custom rule. */
export function customRuleAllow(req: GuardRequest): GuardResponse {
  const sub = firstSubmission(req);
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_allow_custom",
      conclusion: GuardConclusion.ALLOW,
      ruleResults: [
        create(GuardRuleResultSchema, {
          resultId: "gres_custom_allow",
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.CUSTOM,
          result: {
            case: "localCustom",
            value: create(ResultLocalCustomSchema, {
              conclusion: GuardConclusion.ALLOW,
            }),
          },
        }),
      ],
    }),
  });
}

/** Build a multi-rule ALLOW response (all rules pass). */
export function multiRuleAllow(req: GuardRequest): GuardResponse {
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_allow_multi",
      conclusion: GuardConclusion.ALLOW,
      ruleResults: req.ruleSubmissions.map((sub, i) =>
        create(GuardRuleResultSchema, {
          resultId: `gres_multi_${i}`,
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.TOKEN_BUCKET,
          result: {
            case: "tokenBucket",
            value: create(ResultTokenBucketSchema, {
              conclusion: GuardConclusion.ALLOW,
              remainingTokens: 90,
              maxTokens: 100,
              resetSeconds: 60,
              refillRate: 10,
              refillIntervalSeconds: 60,
            }),
          },
        }),
      ),
    }),
  });
}

/** Build an error result (fail-open). */
export function errorResult(req: GuardRequest): GuardResponse {
  const sub = firstSubmission(req);
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_allow_err",
      conclusion: GuardConclusion.ALLOW,
      ruleResults: [
        create(GuardRuleResultSchema, {
          resultId: "gres_error",
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.TOKEN_BUCKET,
          result: {
            case: "error",
            value: create(ResultErrorSchema, {
              message: "something went wrong",
            }),
          },
        }),
      ],
    }),
  });
}
/** Connect routes that echo back ALLOW for any single-rule request. */
function mockRoutes(router: import("@connectrpc/connect").ConnectRouter): void {
  router.service(DecideService, { guard: tokenBucketAllow });
}

/** Start a cleartext HTTP/2 server with the mock handler. Returns { baseUrl, close }. */
export async function startH2Server(
  port = 0,
): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const server = http2.createServer(connectNodeAdapter({ routes: mockRoutes }));
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
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

/**
 * Generate a test CA + server certificate via openssl.
 *
 * Produces a proper two-cert chain so that rustls-based runtimes (Deno, Bun)
 * can verify the server cert when given the CA cert. A single self-signed cert
 * used as both CA and end-entity is rejected by rustls with "CaUsedAsEndEntity".
 */
function generateTestCerts(): { key: string; cert: string; ca: string } {
  const tmp = mkdtempSync(join(tmpdir(), "arcjet-test-cert-"));
  const caKeyFile = join(tmp, "ca-key.pem");
  const caCertFile = join(tmp, "ca-cert.pem");
  const serverKeyFile = join(tmp, "server-key.pem");
  const serverCsrFile = join(tmp, "server.csr");
  const serverCertFile = join(tmp, "server-cert.pem");
  const extFile = join(tmp, "ext.cnf");
  try {
    // 1. Generate CA key + self-signed CA cert
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "ec",
        "-pkeyopt",
        "ec_paramgen_curve:prime256v1",
        "-keyout",
        caKeyFile,
        "-out",
        caCertFile,
        "-days",
        "1",
        "-nodes",
        "-subj",
        "/CN=Test CA",
      ],
      { stdio: "pipe" },
    );

    // 2. Generate server key + CSR
    execFileSync(
      "openssl",
      [
        "req",
        "-new",
        "-newkey",
        "ec",
        "-pkeyopt",
        "ec_paramgen_curve:prime256v1",
        "-keyout",
        serverKeyFile,
        "-out",
        serverCsrFile,
        "-nodes",
        "-subj",
        "/CN=localhost",
      ],
      { stdio: "pipe" },
    );

    // 3. Sign server cert with the CA (adding SAN extension)
    writeFileSync(extFile, "subjectAltName=IP:127.0.0.1\n");
    execFileSync(
      "openssl",
      [
        "x509",
        "-req",
        "-in",
        serverCsrFile,
        "-CA",
        caCertFile,
        "-CAkey",
        caKeyFile,
        "-CAcreateserial",
        "-out",
        serverCertFile,
        "-days",
        "1",
        "-extfile",
        extFile,
      ],
      { stdio: "pipe" },
    );

    return {
      key: readFileSync(serverKeyFile, "utf8"),
      cert: readFileSync(serverCertFile, "utf8"),
      ca: readFileSync(caCertFile, "utf8"),
    };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** Start an HTTPS HTTP/2 server with a test CA-signed cert. Returns { baseUrl, ca, close }. */
export async function startH2SecureServer(
  port = 0,
): Promise<{ baseUrl: string; ca: string; close: () => Promise<void> }> {
  const { key, cert, ca } = generateTestCerts();
  const server = http2.createSecureServer(
    { key, cert },
    connectNodeAdapter({ routes: mockRoutes }),
  );
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- always AddressInfo after listen()
  const addr = server.address() as import("node:net").AddressInfo;
  return {
    baseUrl: `https://127.0.0.1:${addr.port}`,
    ca,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      }),
  };
}

/** Start an HTTP/1.1 server with the mock handler. Returns { baseUrl, close }. */
export async function startHttpServer(
  port = 0,
): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const server = http.createServer(connectNodeAdapter({ routes: mockRoutes }));
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
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
