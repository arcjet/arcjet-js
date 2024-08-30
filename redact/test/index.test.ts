import { describe, expect, test } from "@jest/globals";
import { redact } from "../index";

describe("ArcjetRedact", () => {
  describe("redact()", () => {
    test("it will redact all if no entities list is given", async () => {
      const text =
        "email test@example.com phone 011234567 credit 4242424242424242 ip 10.12.234.2";
      const expected =
        "email <Redacted email #0> phone <Redacted phone number #1> credit <Redacted credit card number #2> ip <Redacted IP address #3>";
      const [redacted] = await redact(text);
      expect(redacted).toEqual(expected);
    });

    test("it will throw if an empty entities list is given", async () => {
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      expect(async () => await redact(text, { entities: [] })).rejects.toThrow(
        new Error("no entities configured for redaction"),
      );
    });

    test("it will redact the configured entities only", async () => {
      const text =
        "email test@example.com phone 011234567 credit 4242424242424242 ip 10.12.234.2";
      const expected =
        "email <Redacted email #0> phone <Redacted phone number #1> credit <Redacted credit card number #2> ip 10.12.234.2";
      const [redacted] = await redact(text, {
        entities: ["email", "phone-number", "credit-card-number"],
      });
      expect(redacted).toEqual(expected);
    });

    test("it will use a custom replacement where configured", async () => {
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      const expected =
        "email redacted-email phone 011234567 ip <Redacted IP address #1>";
      const [redacted] = await redact(text, {
        entities: ["email", "ip-address"],
        replace: (entityType) => {
          if (entityType === "email") {
            return "redacted-email";
          }
        },
      });
      expect(redacted).toEqual(expected);
    });

    test("it can detect entities using a custom detect function", async () => {
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      const expected =
        "email test@example.com <Redacted my-custom-entity #0> 011234567 ip 10.12.234.2";
      const [redacted] = await redact(text, {
        entities: ["my-custom-entity"],
        contextWindowSize: 1,
        detect: (tokens: string[]) => {
          if (tokens[0] === "phone") {
            return ["my-custom-entity"];
          } else {
            return [];
          }
        },
      });
      expect(redacted).toEqual(expected);
    });

    test("it can detect entities using a custom detect function and redact custom entities using a custom redactor", async () => {
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      const expected =
        "email test@example.com custom-replace 011234567 ip 10.12.234.2";
      const [redacted] = await redact(text, {
        entities: ["my-custom-entity"],
        contextWindowSize: 1,
        detect: (tokens: string[]) => {
          if (tokens[0] === "phone") {
            return ["my-custom-entity"];
          } else {
            return [];
          }
        },
        replace: (entityType) => {
          if (entityType === "my-custom-entity") {
            return "custom-replace";
          }
        },
      });
      expect(redacted).toEqual(expected);
    });

    test("it will pass the number of tokens requested by the context window size parameter to the custom detect function", async () => {
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      await redact(text, {
        contextWindowSize: 3,
        detect: (tokens) => {
          expect(tokens).toHaveLength(3);
          return new Array(tokens.length).fill(undefined);
        },
      });
    });
  });
  describe("unredact()", () => {
    test("it will redact and unredact configured entities", async () => {
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      const expectedRedacted =
        "email <Redacted email #0> phone <Redacted phone number #1> ip 10.12.234.2";
      const [redacted, unredact] = await redact(text, {
        entities: ["email", "phone-number"],
      });
      expect(redacted).toEqual(expectedRedacted);

      const newText =
        "hello <Redacted email #0> your phone number is <Redacted phone number #1>";
      const expectedUnredacted =
        "hello test@example.com your phone number is 011234567";
      const unredacted = unredact(newText);
      expect(unredacted).toEqual(expectedUnredacted);
    });

    test("it will redact and unredact configured entities multiple times", async () => {
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      const expectedRedacted =
        "email <Redacted email #0> phone <Redacted phone number #1> ip 10.12.234.2";
      const [redacted, unredact] = await redact(text, {
        entities: ["email", "phone-number"],
      });
      expect(redacted).toEqual(expectedRedacted);

      const newText =
        "hello <Redacted email #0> your phone number is <Redacted phone number #1> <Redacted phone number #1>";
      const expectedUnredacted =
        "hello test@example.com your phone number is 011234567 011234567";
      const unredacted = unredact(newText);
      expect(unredacted).toEqual(expectedUnredacted);
    });

    test("it will redact and unredact custom entities", async () => {
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      const expectedRedacted =
        "email my-custom-email-replacement phone <Redacted phone number #1> ip 10.12.234.2";
      const [redacted, unredact] = await redact(text, {
        entities: ["email", "phone-number"],
        replace: (entityType) => {
          if (entityType === "email") {
            return "my-custom-email-replacement";
          }
        },
      });
      expect(redacted).toEqual(expectedRedacted);

      const newText =
        "hello my-custom-email-replacement your phone number is <Redacted phone number #1>";
      const expectedUnredacted =
        "hello test@example.com your phone number is 011234567";
      const unredacted = unredact(newText);
      expect(unredacted).toEqual(expectedUnredacted);
    });
  });
});
