import assert from "node:assert/strict";
import { test } from "node:test";

import { create } from "@bufbuild/protobuf";

import { policyInput } from "./policy-input.ts";
import {
  GetGuardPolicyResponseSchema,
  GuardLocalPolicyProjectionSchema,
  GuardPolicyLookupStatus,
} from "./proto/proto/decide/v2/decide_pb.js";
import { localStringDigest, RemotePolicyRuntime } from "./remote-policy.ts";

test("local policy input digest matches the pinned wire encoding", async () => {
  const digest = await localStringDigest("hello");
  assert.equal(
    Buffer.from(digest).toString("hex"),
    "344c730291b0156792dbdd8e4528370616e70ba828e9f4c614491b46cbcd4f8a",
  );
});

test("server inputs do not fetch a local projection", async () => {
  let fetches = 0;
  const runtime = new RemotePolicyRuntime("key", "agent", () => {
    fetches++;
    return Promise.reject(new Error("must not fetch"));
  });
  const prepared = await runtime.prepare(
    "email.sent",
    {
      recipient: policyInput.server.string("person@example.com"),
      attempts: policyInput.server.integer(2),
    },
    new AbortController().signal,
  );
  assert.equal(fetches, 0);
  assert.equal(prepared.inputs["recipient"]?.representation.case, "server");
  assert.equal(prepared.inputs["attempts"]?.representation.case, "server");
});

test("concurrent local inputs coalesce projection retrieval and never put raw values on wire", async () => {
  let fetches = 0;
  const now = BigInt(Date.now());
  const runtime = new RemotePolicyRuntime("key", "agent", async () => {
    fetches++;
    await Promise.resolve();
    return create(GetGuardPolicyResponseSchema, {
      status: GuardPolicyLookupStatus.AVAILABLE,
      serverTimeUnixMs: now,
      policy: create(GuardLocalPolicyProjectionSchema, {
        policyId: "policy-1",
        revision: "revision-1",
        label: "email.sent",
        refreshAfterUnixMs: now + 60_000n,
        validUntilUnixMs: now + 120_000n,
      }),
    });
  });

  const inputs = { subject: policyInput.local.string("secret subject") };
  const signal = new AbortController().signal;
  const [first, second] = await Promise.all([
    runtime.prepare("email.sent", inputs, signal),
    runtime.prepare("email.sent", inputs, signal),
  ]);

  assert.equal(fetches, 1);
  assert.equal(first.revision, "revision-1");
  assert.deepEqual(first.inputs, second.inputs);
  const representation = first.inputs["subject"]?.representation;
  assert.equal(representation?.case, "local");
  if (representation?.case === "local") {
    assert.equal(representation.value.valueSha256.length, 32);
    assert.equal(JSON.stringify(representation.value).includes("secret subject"), false);
  }
});
