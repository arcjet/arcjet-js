import assert from "node:assert/strict";
import { test } from "node:test";

import { policyInput } from "../policy-input.ts";
import { resolveActorInputs } from "./actor-inputs.ts";

test("omits actor and inputs when the policy does not set them", async () => {
  const resolved = await resolveActorInputs({}, { id: "one" });
  assert.deepEqual(resolved, {});
});

test("passes static actor and inputs through", async () => {
  const inputs = { id: policyInput.server.string("one") };
  const resolved = await resolveActorInputs({ actor: "user-1", inputs }, { id: "ignored" });
  assert.equal(resolved.actor, "user-1");
  assert.deepEqual(resolved.inputs, inputs);
});

test("resolves actor and inputs from the call argument", async () => {
  const resolved = await resolveActorInputs(
    {
      actor: (input: { id: string }) => `actor-${input.id}`,
      inputs: (input: { id: string }) => ({ id: policyInput.server.string(input.id) }),
    },
    { id: "one" },
  );
  assert.equal(resolved.actor, "actor-one");
  assert.deepEqual(resolved.inputs, { id: policyInput.server.string("one") });
});

test("awaits async resolvers", async () => {
  const resolved = await resolveActorInputs(
    {
      actor: (input: { id: string }) => Promise.resolve(`actor-${input.id}`),
      inputs: (input: { id: string }) =>
        Promise.resolve({
          id: policyInput.server.string(input.id),
        }),
    },
    { id: "two" },
  );
  assert.equal(resolved.actor, "actor-two");
  assert.deepEqual(resolved.inputs, { id: policyInput.server.string("two") });
});

test("propagates a resolver throw so the caller can fail closed", async () => {
  await assert.rejects(
    () =>
      resolveActorInputs(
        {
          inputs: () => {
            throw new Error("mapping failed");
          },
        },
        { id: "one" },
      ),
    /mapping failed/,
  );
});
