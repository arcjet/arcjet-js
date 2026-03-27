/**
 * Shared mock Connect RPC server for `@arcjet/guard` runtime tests.
 *
 * Re-exports all pure in-memory handlers from `./mock-handlers.ts` and
 * adds Node-specific server starters (`startH2Server`, `startH2SecureServer`,
 * `startHttpServer`) that require `node:http2`, `node:http`, etc.
 *
 * Import from `./mock-handlers.ts` directly in environments that cannot
 * use Node APIs (e.g. Cloudflare Workers).
 *
 * @packageDocumentation
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import http2 from "node:http2";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { connectNodeAdapter } from "@connectrpc/connect-node";

import { DecideService, tokenBucketAllow } from "./mock-handlers.ts";

// Re-export everything from mock-handlers for backward compatibility
export {
  type MockHandler,
  createMockTransport,
  tokenBucketAllow,
  tokenBucketDeny,
  fixedWindowAllow,
  fixedWindowDeny,
  slidingWindowAllow,
  promptInjectionDeny,
  sensitiveInfoDeny,
  sensitiveInfoAllow,
  customRuleAllow,
  customRuleDeny,
  multiRuleAllow,
  errorResult,
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
} from "./mock-handlers.ts";

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
