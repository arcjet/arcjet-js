import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import { decisionAllow, stubClient } from "../../test/_shared/stub-client.ts";
import { createAgentContext } from "./context.ts";
import { captureAction } from "./guard-action.ts";
import { ArcjetInvalidLabelError, assertValidAction, labelProblem } from "./label.ts";

interface LabelCase {
  label: string;
  valid: boolean;
  reason?: string | undefined;
}

/**
 * Read the vendored cases, failing loudly on a malformed file.
 *
 * A fixture that parsed to nothing would leave every case below passing while
 * testing none of them.
 */
function readSharedCases(): LabelCase[] {
  const raw: unknown = JSON.parse(
    readFileSync(new URL("../../test/_shared/guard-label-cases.json", import.meta.url), "utf8"),
  );
  if (typeof raw !== "object" || raw === null || !("cases" in raw)) {
    throw new Error("guard-label-cases.json has no cases");
  }
  const { cases } = raw;
  if (!Array.isArray(cases)) {
    throw new TypeError("guard-label-cases.json cases is not an array");
  }
  return cases.map((entry: unknown): LabelCase => {
    if (typeof entry !== "object" || entry === null) {
      throw new TypeError("guard-label-cases.json holds a non-object case");
    }
    const label = "label" in entry ? entry.label : undefined;
    const valid = "valid" in entry ? entry.valid : undefined;
    if (typeof label !== "string" || typeof valid !== "boolean") {
      throw new TypeError("guard-label-cases.json case is missing label or valid");
    }
    const reason = "reason" in entry && typeof entry.reason === "string" ? entry.reason : undefined;
    return { label, valid, reason };
  });
}

const sharedCases = readSharedCases();

describe("guard label check", () => {
  test("the shared cases loaded", () => {
    assert.ok(sharedCases.length > 0, "no cases loaded");
  });

  for (const sharedCase of sharedCases) {
    const what = sharedCase.valid ? "accepts" : "rejects";
    const why = sharedCase.reason === undefined ? "" : ` (${sharedCase.reason})`;
    test(`${what} ${JSON.stringify(sharedCase.label)}${why}`, () => {
      assert.equal(labelProblem(sharedCase.label) === undefined, sharedCase.valid);
    });
  }

  test("accepts 256 bytes and rejects 257", () => {
    assert.equal(labelProblem("a".repeat(256)), undefined);
    assert.notEqual(labelProblem("a".repeat(257)), undefined);
  });

  /**
   * Every character a label may contain is ASCII, so byte count and character
   * count agree for anything that could pass. The two differ only for input
   * that is rejected either way — and there the difference is which reason the
   * caller is told, which is the part worth pinning.
   */
  test("reports an over-long label by length, not by its first odd character", () => {
    // 4 bytes each, so 64 of them plus one exceed 256 bytes while spanning
    // only 129 UTF-16 code units.
    const overLong = "a" + "\u{1F600}".repeat(64);
    assert.match(labelProblem(overLong) ?? "", /longer than 256 bytes/);
  });

  test("assertValidAction throws a typed error naming the label and the caller", () => {
    assert.throws(
      () => {
        assertValidAction("getWeather.invoked", "guardHooks");
      },
      (error: unknown) => {
        assert.ok(error instanceof ArcjetInvalidLabelError);
        assert.equal(error.label, "getWeather.invoked");
        assert.match(error.message, /guardHooks/);
        assert.match(error.message, /uppercase/);
        return true;
      },
    );
  });

  test("assertValidAction accepts a label the service accepts", () => {
    assert.doesNotThrow(() => {
      assertValidAction("send_email.invoked", "guardHooks");
    });
  });

  test("the reported problem names the offending character", () => {
    assert.match(labelProblem("getWeather.invoked") ?? "", /"W"/);
    assert.match(labelProblem("tools.a b") ?? "", /" "/);
  });
});

describe("capture warns rather than raising", () => {
  test("captureAction never throws on a label no policy can match", () => {
    const { client, captureCalls } = stubClient(decisionAllow());
    const ctx = createAgentContext({ correlationId: "c1" });

    assert.doesNotThrow(() => {
      captureAction(client, ctx, { action: "getWeather.invoked" });
    });
    assert.equal(captureCalls.length, 1, "the capture is still sent as written");
  });
});
