import assert from "node:assert/strict";
import { test } from "node:test";

import { securityMetadata } from "../dist/index.js";

test("AC4.1: securityMetadata maps all seven fields to documented wire keys", async () => {
  const result = securityMetadata({
    user: "user_alice",
    agent: "agent_review_bot",
    workflow: "approval_workflow",
    dataClass: "internal",
    destination: "backend_api",
    reversibility: "compensable",
    resource: "resource_123",
  });

  assert.deepEqual(result, {
    user: "user_alice",
    agent: "agent_review_bot",
    workflow: "approval_workflow",
    "data-class": "internal",
    destination: "backend_api",
    reversibility: "compensable",
    resource: "resource_123",
  });
});

test("AC4.2: securityMetadata passes custom string values through unchanged", async () => {
  const result = securityMetadata({
    dataClass: "customer-pii",
    destination: "our-internal-billing-thing",
  });

  assert.deepEqual(result, {
    "data-class": "customer-pii",
    destination: "our-internal-billing-thing",
  });
});

test("AC4.3: securityMetadata omits undefined fields entirely", async () => {
  const result1 = securityMetadata({ user: "user_123" });
  assert.deepEqual(result1, { user: "user_123" });

  const result2 = securityMetadata({});
  assert.deepEqual(result2, {});
});
