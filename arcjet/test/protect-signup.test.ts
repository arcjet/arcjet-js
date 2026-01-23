import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { protectSignup } from "../index.js";

describe("Products > protectSignup", () => {
  test("allows configuration of rateLimit, bot, and email", () => {
    const rules = protectSignup({
      rateLimit: {
        mode: "DRY_RUN",
        characteristics: ["ip.src"],
        interval: 60 /* minutes */ * 60 /* seconds */,
        max: 1,
      },
      bots: {
        mode: "DRY_RUN",
        allow: [],
      },
      email: {
        allow: [],
        mode: "LIVE",
      },
    });
    assert.equal(rules.length, 3);
  });
});
