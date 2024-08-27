import { describe, expect, jest, test } from "@jest/globals";
import { RedactSession } from "../index";

const log = {
  time: jest.fn(),
  timeEnd: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe("ArcjetRedact", () => {
  describe("identify()", () => {
    test("it will identify the configured entities", async () => {
      const session = new RedactSession({
        redact: ["email", "credit-card-number"],
      });
      const text = "4242424242424242 test@example.com 011234567 number";
      const identified = await session.identify(text);
      const expected = [
        { end: 16, identifiedType: "credit-card-number", start: 0 },
        { end: 33, identifiedType: "email", start: 17 },
      ];
      expect(identified).toEqual(expected);
    });
    test("it will prefer custom entity types to inbuilt ones", async () => {
      const session = new RedactSession({
        redact: ["email", "credit-card-number", "test-email"],
        detect: (tokens) => {
          return tokens.map((t) =>
            t === "test@example.com" ? "test-email" : undefined,
          );
        },
      });
      const text = "4242424242424242 test@example.com 011234567 number";
      const identified = await session.identify(text);
      const expected = [
        { end: 16, identifiedType: "credit-card-number", start: 0 },
        { end: 33, identifiedType: "test-email", start: 17 },
      ];
      expect(identified).toEqual(expected);
    });
    test("it will identify nothing if the list is empty", async () => {
      const session = new RedactSession({
        redact: [],
      });
      const text = "4242424242424242 test@example.com 011234567 number";
      const identified = await session.identify(text);
      expect(identified).toEqual([]);
    });
  });
  describe("redact()", () => {
    test("it will do nothing if no entities are configured", async () => {
      const session = new RedactSession({ redact: [] });
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      const redacted = await session.redact(text);
      expect(redacted).toEqual(text);
    });

    test("it will redact the configured entities only", async () => {
      const session = new RedactSession({ redact: ["email", "phone-number"] });
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      const expected =
        "email <REDACTED INFO #0> phone <REDACTED INFO #1> ip 10.12.234.2";
      const redacted = await session.redact(text);
      expect(redacted).toEqual(expected);
    });

    test("it will use a custom replacement where configured", async () => {
      const session = new RedactSession({
        redact: ["email", "ip-address"],
        replacer: { email: () => "redacted-email" },
      });
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      const expected =
        "email redacted-email phone 011234567 ip <REDACTED INFO #1>";
      const redacted = await session.redact(text);
      expect(redacted).toEqual(expected);
    });

    test("it can detect entities using a custom detect function", async () => {
      const session = new RedactSession({
        redact: ["my-custom-entity"],
        contextWindowSize: 1,
        detect: (tokens) => {
          if (tokens[0] === "phone") {
            return ["my-custom-entity"];
          } else {
            return [];
          }
        },
      });
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      const expected =
        "email test@example.com <REDACTED INFO #0> 011234567 ip 10.12.234.2";
      const redacted = await session.redact(text);
      expect(redacted).toEqual(expected);
    });

    test("it can detect entities using a custom detect function and redact custom entities using a custom redactor", async () => {
      const session = new RedactSession({
        redact: ["my-custom-entity"],
        contextWindowSize: 1,
        detect: (tokens) => {
          if (tokens[0] === "phone") {
            return ["my-custom-entity"];
          } else {
            return [];
          }
        },
        replacer: {
          "my-custom-entity": () => "custom-replace",
        },
      });
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      const expected =
        "email test@example.com custom-replace 011234567 ip 10.12.234.2";
      const redacted = await session.redact(text);
      expect(redacted).toEqual(expected);
    });

    test("it will pass the number of tokens requested by the context window size parameter to the custom detect function", async () => {
      const session = new RedactSession({
        redact: [],
        contextWindowSize: 3,
        detect: (tokens) => {
          expect(tokens).toHaveLength(3);
          return new Array(tokens.length).fill(undefined);
        },
      });
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      const redacted = await session.redact(text);
      expect(redacted).toEqual(text);
    });
  });
  describe("unredact()", () => {
    test("it will do nothing if no entities are configured", async () => {
      const session = new RedactSession({ redact: [] });
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      const redacted = await session.redact(text);
      expect(redacted).toEqual(text);

      const newText = "hello test@example.com your phone number is 10.12.234.2";
      const unredacted = await session.unredact(newText);
      expect(unredacted).toEqual(newText);
    });

    test("it will redact and unredact configured entities", async () => {
      const session = new RedactSession({
        redact: ["email", "phone-number"],
      });
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      const expectedRedacted =
        "email <REDACTED INFO #0> phone <REDACTED INFO #1> ip 10.12.234.2";
      const redacted = await session.redact(text);
      expect(redacted).toEqual(expectedRedacted);

      const newText =
        "hello <REDACTED INFO #0> your phone number is <REDACTED INFO #1>";
      const expectedUnredacted =
        "hello test@example.com your phone number is 011234567";
      const unredacted = await session.unredact(newText);
      expect(unredacted).toEqual(expectedUnredacted);
    });

    test("it will redact and unredact configured entities", async () => {
      const session = new RedactSession({
        redact: ["email", "phone-number"],
        replacer: {
          email: () => "my-custom-email-replacement",
        },
      });
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      const expectedRedacted =
        "email my-custom-email-replacement phone <REDACTED INFO #1> ip 10.12.234.2";
      const redacted = await session.redact(text);
      expect(redacted).toEqual(expectedRedacted);

      const newText =
        "hello my-custom-email-replacement your phone number is <REDACTED INFO #1>";
      const expectedUnredacted =
        "hello test@example.com your phone number is 011234567";
      const unredacted = await session.unredact(newText);
      expect(unredacted).toEqual(expectedUnredacted);
    });
  });
});
