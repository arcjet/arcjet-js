import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

test("explicit ipSrc permits protect without Astro middleware address", async function () {
  register(
    `data:text/javascript,export async function resolve(s,c,n){if(s==='astro:env/server')return {shortCircuit:true,url:'data:text/javascript,export const ARCJET_BASE_URL=undefined,ARCJET_ENV=undefined,ARCJET_KEY=undefined,ARCJET_LOG_LEVEL=undefined,FIREBASE_CONFIG=undefined,FLY_APP_NAME=undefined,RENDER=undefined,VERCEL=undefined'};return n(s,c)};export async function load(u,c,n){const r=await n(u,c);if(u.endsWith('/arcjet-astro/dist/internal.js'))return {...r,shortCircuit:true,source:r.source.toString().replace('import.meta.env.MODE','undefined')};return r}`,
    import.meta.url,
  );
  const { createArcjetClient, ArcjetAllowDecision, ArcjetReason, ArcjetRuleResult } =
    await import("../dist/internal.js");
  let details: any;
  const client = createArcjetClient({
    client: {
      async decide() {
        return new ArcjetAllowDecision({ reason: new ArcjetReason(), results: [], ttl: 0 });
      },
      report() {},
    },
    key: "",
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

  await client.protect(new Request("https://example.com/"), { ipSrc: "203.0.113.10" });

  assert.equal(details.ip, "203.0.113.10");
  assert.deepEqual(details.extra, {});
});
