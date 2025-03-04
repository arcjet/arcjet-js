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

  test("returns false for dry run bots that are spoofed", () => {
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
    ).toEqual(false);
  });

  test("returns false for non-bot values", () => {
    expect(
      isSpoofedBot(
        // @ts-expect-error
        1,
      ),
    ).toEqual(false);
    expect(
      isSpoofedBot(
        // @ts-expect-error
        "",
      ),
    ).toEqual(false);
    expect(
      isSpoofedBot(
        // @ts-expect-error
        [],
      ),
    ).toEqual(false);
    expect(
      isSpoofedBot(
        // @ts-expect-error
        {},
      ),
    ).toEqual(false);
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

  test("returns false for dry run bots that are verified", () => {
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
    ).toEqual(false);
  });

  test("returns false for non-bot values", () => {
    expect(
      isVerifiedBot(
        // @ts-expect-error
        1,
      ),
    ).toEqual(false);
    expect(
      isVerifiedBot(
        // @ts-expect-error
        "",
      ),
    ).toEqual(false);
    expect(
      isVerifiedBot(
        // @ts-expect-error
        [],
      ),
    ).toEqual(false);
    expect(
      isVerifiedBot(
        // @ts-expect-error
        {},
      ),
    ).toEqual(false);
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

  test("returns false for dry run errors about missing user-agent header", () => {
    expect(
      isMissingUserAgent(
        new ArcjetRuleResult({
          ttl: 0,
          state: "DRY_RUN",
          conclusion: "DENY",
          reason: new ArcjetErrorReason("missing User-Agent header"),
        }),
      ),
    ).toEqual(false);
    expect(
      isMissingUserAgent(
        new ArcjetRuleResult({
          ttl: 0,
          state: "DRY_RUN",
          conclusion: "DENY",
          reason: new ArcjetErrorReason("requires user-agent header"),
        }),
      ),
    ).toEqual(false);
  });

  test("returns false for non-error values", () => {
    expect(
      isMissingUserAgent(
        // @ts-expect-error
        1,
      ),
    ).toEqual(false);
    expect(
      isMissingUserAgent(
        // @ts-expect-error
        "",
      ),
    ).toEqual(false);
    expect(
      isMissingUserAgent(
        // @ts-expect-error
        [],
      ),
    ).toEqual(false);
    expect(
      isMissingUserAgent(
        // @ts-expect-error
        {},
      ),
    ).toEqual(false);
  });
});
