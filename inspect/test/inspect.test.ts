import { describe, test, mock } from "node:test";
import { expect } from "expect";
import { isSpoofedBot, isVerifiedBot, isMissingUserAgent } from "../index";
import {
  ArcjetBotReason,
  ArcjetErrorReason,
  ArcjetRuleResult,
  ArcjetRuleState,
} from "@arcjet/protocol";

describe("isSpoofedBot", () => {
  test("returns true for active bots that are spoofed", () => {
    const activeStates: Exclude<ArcjetRuleState[], "DRY_RUN"> = [
      "RUN",
      "NOT_RUN",
      "CACHED",
    ];

    for (const state of activeStates) {
      expect(
        isSpoofedBot(
          new ArcjetRuleResult({
            ttl: 0,
            state,
            conclusion: "DENY",
            reason: new ArcjetBotReason({
              allowed: [],
              denied: ["example"],
              spoofed: true,
              verified: false,
            }),
          }),
        ),
      ).toEqual(true);
    }
  });

  test("returns false for active bots that are not spoofed", () => {
    const activeStates: Exclude<ArcjetRuleState[], "DRY_RUN"> = [
      "RUN",
      "NOT_RUN",
      "CACHED",
    ];

    for (const state of activeStates) {
      expect(
        isSpoofedBot(
          new ArcjetRuleResult({
            ttl: 0,
            state,
            conclusion: "DENY",
            reason: new ArcjetBotReason({
              allowed: [],
              denied: ["example"],
              spoofed: false,
              verified: false,
            }),
          }),
        ),
      ).toEqual(false);
    }
  });

  test("returns undefined for dry run bots that are spoofed", () => {
    expect(
      isSpoofedBot(
        new ArcjetRuleResult({
          ttl: 0,
          state: "DRY_RUN",
          conclusion: "DENY",
          reason: new ArcjetBotReason({
            allowed: [],
            denied: ["example"],
            spoofed: true,
            verified: false,
          }),
        }),
      ),
    ).toBeUndefined();
  });

  test("works with array methods", () => {
    const results = [
      new ArcjetRuleResult({
        ttl: 0,
        state: "RUN",
        conclusion: "DENY",
        reason: new ArcjetBotReason({
          allowed: [],
          denied: ["example"],
          spoofed: true,
          verified: false,
        }),
      }),
    ];

    expect(results.some(isSpoofedBot)).toEqual(true);
    expect(results.find(isSpoofedBot)).toEqual(results[0]);
  });

  test("returns undefined for non-bot values", () => {
    expect(
      isSpoofedBot(
        // @ts-expect-error
        1,
      ),
    ).toBeUndefined();
    expect(
      isSpoofedBot(
        // @ts-expect-error
        "",
      ),
    ).toBeUndefined();
    expect(
      isSpoofedBot(
        // @ts-expect-error
        [],
      ),
    ).toBeUndefined();
    expect(
      isSpoofedBot(
        // @ts-expect-error
        {},
      ),
    ).toBeUndefined();
  });
});

describe("isVerifiedBot", () => {
  test("returns true for active bots that are verified", () => {
    const activeStates: Exclude<ArcjetRuleState[], "DRY_RUN"> = [
      "RUN",
      "NOT_RUN",
      "CACHED",
    ];

    for (const state of activeStates) {
      expect(
        isVerifiedBot(
          new ArcjetRuleResult({
            ttl: 0,
            state,
            conclusion: "DENY",
            reason: new ArcjetBotReason({
              allowed: [],
              denied: ["example"],
              spoofed: false,
              verified: true,
            }),
          }),
        ),
      ).toEqual(true);
    }
  });

  test("returns false for active bots that are not verified", () => {
    const activeStates: Exclude<ArcjetRuleState[], "DRY_RUN"> = [
      "RUN",
      "NOT_RUN",
      "CACHED",
    ];

    for (const state of activeStates) {
      expect(
        isVerifiedBot(
          new ArcjetRuleResult({
            ttl: 0,
            state,
            conclusion: "DENY",
            reason: new ArcjetBotReason({
              allowed: [],
              denied: ["example"],
              spoofed: false,
              verified: false,
            }),
          }),
        ),
      ).toEqual(false);
    }
  });

  test("works with array methods", () => {
    const results = [
      new ArcjetRuleResult({
        ttl: 0,
        state: "RUN",
        conclusion: "DENY",
        reason: new ArcjetBotReason({
          allowed: [],
          denied: ["example"],
          spoofed: false,
          verified: true,
        }),
      }),
    ];

    expect(results.some(isVerifiedBot)).toEqual(true);
    expect(results.find(isVerifiedBot)).toEqual(results[0]);
  });

  test("returns undefined for dry run bots that are verified", () => {
    expect(
      isVerifiedBot(
        new ArcjetRuleResult({
          ttl: 0,
          state: "DRY_RUN",
          conclusion: "DENY",
          reason: new ArcjetBotReason({
            allowed: [],
            denied: ["example"],
            spoofed: false,
            verified: true,
          }),
        }),
      ),
    ).toBeUndefined();
  });

  test("returns undefined for non-bot values", () => {
    expect(
      isVerifiedBot(
        // @ts-expect-error
        1,
      ),
    ).toBeUndefined();
    expect(
      isVerifiedBot(
        // @ts-expect-error
        "",
      ),
    ).toBeUndefined();
    expect(
      isVerifiedBot(
        // @ts-expect-error
        [],
      ),
    ).toBeUndefined();
    expect(
      isVerifiedBot(
        // @ts-expect-error
        {},
      ),
    ).toBeUndefined();
  });
});

describe("isMissingUserAgent", () => {
  test("returns true for active errors about missing user-agent header", () => {
    const activeStates: Exclude<ArcjetRuleState[], "DRY_RUN"> = [
      "RUN",
      "NOT_RUN",
      "CACHED",
    ];

    for (const state of activeStates) {
      // Server error message
      expect(
        isMissingUserAgent(
          new ArcjetRuleResult({
            ttl: 0,
            state,
            conclusion: "DENY",
            reason: new ArcjetErrorReason("missing User-Agent header"),
          }),
        ),
      ).toEqual(true);
      // Local error message
      expect(
        isMissingUserAgent(
          new ArcjetRuleResult({
            ttl: 0,
            state,
            conclusion: "DENY",
            reason: new ArcjetErrorReason("requires user-agent header"),
          }),
        ),
      ).toEqual(true);
    }
  });

  test("returns undefined for dry run errors about missing user-agent header", () => {
    expect(
      isMissingUserAgent(
        new ArcjetRuleResult({
          ttl: 0,
          state: "DRY_RUN",
          conclusion: "DENY",
          reason: new ArcjetErrorReason("missing User-Agent header"),
        }),
      ),
    ).toBeUndefined();
    expect(
      isMissingUserAgent(
        new ArcjetRuleResult({
          ttl: 0,
          state: "DRY_RUN",
          conclusion: "DENY",
          reason: new ArcjetErrorReason("requires user-agent header"),
        }),
      ),
    ).toBeUndefined();
  });

  test("works with array methods", () => {
    const results = [
      new ArcjetRuleResult({
        ttl: 0,
        state: "RUN",
        conclusion: "DENY",
        reason: new ArcjetErrorReason("requires user-agent header"),
      }),
    ];

    expect(results.some(isMissingUserAgent)).toEqual(true);
    expect(results.find(isMissingUserAgent)).toEqual(results[0]);
  });

  test("returns undefined for non-error values", () => {
    expect(
      isMissingUserAgent(
        // @ts-expect-error
        1,
      ),
    ).toBeUndefined();
    expect(
      isMissingUserAgent(
        // @ts-expect-error
        "",
      ),
    ).toBeUndefined();
    expect(
      isMissingUserAgent(
        // @ts-expect-error
        [],
      ),
    ).toBeUndefined();
    expect(
      isMissingUserAgent(
        // @ts-expect-error
        {},
      ),
    ).toBeUndefined();
  });
});
