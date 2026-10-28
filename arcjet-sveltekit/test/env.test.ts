import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

// Stands in for SvelteKit's `$env/dynamic/private`. On SvelteKit 3 it holds
// only the variables an app declares in `src/env.ts`.
const svelteKitEnv: Record<string, string | undefined> = {};
(globalThis as any).__svelteKitEnv = svelteKitEnv;

register(
  `data:text/javascript,export async function resolve(s,c,n){if(s==='$env/dynamic/private')return {shortCircuit:true,url:'data:text/javascript,export const env=globalThis.__svelteKitEnv'};return n(s,c)}`,
  import.meta.url,
);

const {
  default: arcjet,
  ArcjetAllowDecision,
  ArcjetReason,
  ArcjetRuleResult,
} = await import("../dist/index.js");

// The IP the rules see for a request whose peer address is unknown. In
// development mode Arcjet substitutes 127.0.0.1; otherwise the rules do not
// run, and this returns undefined.
async function ipForUnknownPeer(): Promise<string | undefined> {
  let details: any;
  const client = arcjet({
    client: {
      async decide() {
        return new ArcjetAllowDecision({ reason: new ArcjetReason(), results: [], ttl: 0 });
      },
      report() {},
    },
    key: "test-key",
    log: { debug() {}, info() {}, warn() {}, error() {} },
    rules: [
      [
        {
          mode: "LIVE",
          priority: 0,
          async protect(_context: any, request: any) {
            details = request;
            return new ArcjetRuleResult({
              conclusion: "ALLOW",
              fingerprint: "",
              reason: new ArcjetReason(),
              ruleId: "",
              state: "RUN",
              ttl: 0,
            });
          },
          validate() {},
          version: 0,
          type: "",
        },
      ],
    ],
  });
  const request = new Request("https://example.com/");
  await client.protect({
    cookies: {
      getAll() {
        return [];
      },
    },
    getClientAddress() {
      return "";
    },
    request,
    url: new URL(request.url),
  });
  return details?.ip;
}

test.afterEach(() => {
  delete svelteKitEnv.ARCJET_ENV;
  delete process.env.ARCJET_ENV;
});

test("a setting SvelteKit does not expose is read from process.env", async () => {
  process.env.ARCJET_ENV = "development";

  assert.equal(await ipForUnknownPeer(), "127.0.0.1");
});

test("a setting SvelteKit exposes takes precedence over process.env", async () => {
  svelteKitEnv.ARCJET_ENV = "production";
  process.env.ARCJET_ENV = "development";

  assert.equal(await ipForUnknownPeer(), undefined);
});

test("a setting SvelteKit exposes is used without process.env", async () => {
  svelteKitEnv.ARCJET_ENV = "development";

  assert.equal(await ipForUnknownPeer(), "127.0.0.1");
});

test("a setting in neither leaves development mode off", async () => {
  assert.equal(await ipForUnknownPeer(), undefined);
});
