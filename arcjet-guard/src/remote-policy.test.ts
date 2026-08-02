import assert from "node:assert/strict";
import { test } from "node:test";

import { create } from "@bufbuild/protobuf";

import { decisionFromProto } from "./convert.ts";
import { policyInput } from "./policy-input.ts";
import {
  GuardConclusion,
  GuardDecisionSchema,
  GetGuardPolicyResponseSchema,
  GuardPolicyEvaluationSchema,
  GuardPolicyRuleResultSchema,
  GuardPolicyStatus,
  GuardResponseSchema,
  GuardRuleExecution,
  GuardRuleMode,
  GuardRuleSource,
  GuardRuleType,
  GuardLocalPolicyProjectionSchema,
  GuardPolicyLookupStatus,
  ResultStringConstraintSchema,
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
  const runtime = new RemotePolicyRuntime("key", "agent", async () => {
    fetches++;
    await Promise.resolve();
    return create(GetGuardPolicyResponseSchema, {
      status: GuardPolicyLookupStatus.AVAILABLE,
      policy: create(GuardLocalPolicyProjectionSchema, {
        policyId: "policy-1",
        revision: "revision-1",
        label: "email.sent",
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

test("retains the last successful projection when forced refresh is unavailable", async () => {
  let fetches = 0;
  const runtime = new RemotePolicyRuntime("key", "agent", () => {
    fetches++;
    if (fetches > 1) return Promise.reject(new Error("unavailable"));
    return Promise.resolve(
      create(GetGuardPolicyResponseSchema, {
        status: GuardPolicyLookupStatus.AVAILABLE,
        policy: create(GuardLocalPolicyProjectionSchema, { revision: "revision-1" }),
      }),
    );
  });
  const inputs = { subject: policyInput.local.string("secret") };
  const signal = new AbortController().signal;

  const first = await runtime.prepare("email.sent", inputs, signal);
  const stale = await runtime.prepare("email.sent", inputs, signal, true);

  assert.equal(fetches, 2);
  assert.equal(first.revision, "revision-1");
  assert.equal(stale.revision, "revision-1");
});

test("successful NOT_CONFIGURED clears the last successful projection", async () => {
  let fetches = 0;
  const runtime = new RemotePolicyRuntime("key", "agent", () => {
    fetches++;
    return Promise.resolve(
      create(GetGuardPolicyResponseSchema, {
        status:
          fetches === 1
            ? GuardPolicyLookupStatus.AVAILABLE
            : GuardPolicyLookupStatus.NOT_CONFIGURED,
        ...(fetches === 1 && {
          policy: create(GuardLocalPolicyProjectionSchema, { revision: "revision-1" }),
        }),
      }),
    );
  });
  const inputs = { subject: policyInput.local.string("secret") };
  const signal = new AbortController().signal;

  assert.equal((await runtime.prepare("email.sent", inputs, signal)).revision, "revision-1");
  assert.equal((await runtime.prepare("email.sent", inputs, signal, true)).revision, "");
  assert.equal((await runtime.prepare("email.sent", inputs, signal, true)).revision, "");
  assert.equal(fetches, 3);
});

test("remote policy status and keyed results stay separate from SDK results", () => {
  const response = create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_policy",
      conclusion: GuardConclusion.DENY,
      policyEvaluation: create(GuardPolicyEvaluationSchema, {
        revision: "revision-1",
        status: GuardPolicyStatus.APPLIED,
      }),
      policyRuleResults: [
        create(GuardPolicyRuleResultSchema, {
          policyId: "policy-1",
          policyRevision: "revision-1",
          ruleId: "allowed-recipient",
          type: GuardRuleType.ALLOWED_STRING_VALUES,
          mode: GuardRuleMode.LIVE,
          execution: GuardRuleExecution.SERVER,
          source: GuardRuleSource.REMOTE,
          result: {
            case: "allowedStringValues",
            value: create(ResultStringConstraintSchema, {
              conclusion: GuardConclusion.DENY,
            }),
          },
        }),
      ],
    }),
  });

  const decision = decisionFromProto(response, []);
  assert.deepEqual(decision.results, []);
  assert.equal(decision.policyEvaluation?.status, "APPLIED");
  assert.equal(decision.policyResults?.[0]?.ruleId, "allowed-recipient");
  assert.equal(decision.policyResults?.[0]?.result.reason, "INPUT_CONSTRAINT");
});
