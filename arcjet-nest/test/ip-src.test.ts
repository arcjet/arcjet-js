import assert from "node:assert/strict";
import test from "node:test";

import {
  ARCJET,
  ArcjetModule,
  ArcjetAllowDecision,
  ArcjetReason,
  ArcjetRuleResult,
} from "../dist/index.js";

test("explicit ipSrc overrides the Nest request address and is stripped", async function () {
  let details: any;
  const options = {
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
  };
  const module = ArcjetModule.forRoot(options);
  const provider: any = module.providers?.find((candidate: any) => candidate.provide === ARCJET);
  const client = provider.useFactory(options);

  await client.protect(
    {
      headers: { host: "example.com" },
      ip: "192.0.2.1",
      method: "GET",
      originalUrl: "/signed/%2F?x=1",
      url: "/normalized",
    },
    { ipSrc: "203.0.113.10" },
  );

  assert.equal(details.ip, "203.0.113.10");
  assert.equal(details.path, "/signed/%2F");
  assert.equal(details.rawPath, "/signed/%2F");
  assert.deepEqual(details.extra, {});

  await client.protect(
    {
      headers: { host: "example.com" },
      id: "fastify",
      ip: "192.0.2.1",
      method: "GET",
      raw: { url: "/fastify/%2f?x=1" },
      url: "/normalized",
    },
    { ipSrc: "203.0.113.10" },
  );
  assert.equal(details.rawPath, "/fastify/%2f");

  await client.protect(
    {
      headers: { host: "example.com" },
      id: "fastify",
      ip: "192.0.2.1",
      method: "GET",
      originalUrl: "/fastify-original/%2F?x=1",
      raw: { url: "/fastify-rewritten?x=1" },
      url: "/fastify-rewritten?x=1",
    },
    { ipSrc: "203.0.113.10" },
  );
  assert.equal(details.path, "/fastify-original/%2F");
  assert.equal(details.rawPath, "/fastify-original/%2F");

  await client.protect(
    {
      headers: { host: "example.com" },
      ip: "192.0.2.1",
      method: "GET",
      url: "/fallback/%2f?x=1",
    },
    { ipSrc: "203.0.113.10" },
  );
  assert.equal(details.path, "/fallback/%2f");
  assert.equal(details.rawPath, "/fallback/%2f");
});
