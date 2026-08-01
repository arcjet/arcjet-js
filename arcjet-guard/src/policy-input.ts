/** Typed inputs for remotely configured Guard policies. */

const policyInputBrand: unique symbol = Symbol("arcjet.policy-input");

type ServerPolicyInputValue = string | boolean | number | bigint | readonly string[];

/** A value explicitly mapped to a remotely configured Guard policy. */
export type PolicyInput =
  | {
      readonly exposure: "SERVER";
      readonly kind: "STRING" | "BOOLEAN" | "INTEGER" | "NUMBER" | "STRING_LIST";
      readonly [policyInputBrand]: ServerPolicyInputValue;
    }
  | {
      readonly exposure: "LOCAL";
      readonly kind: "STRING";
      readonly [policyInputBrand]: string;
    };

/** Named, explicitly typed policy inputs. Plain JavaScript values are rejected. */
export type PolicyInputMap = Readonly<Record<string, PolicyInput>>;

type PolicyInputFactory = {
  readonly server: {
    string(value: string): PolicyInput;
    boolean(value: boolean): PolicyInput;
    integer(value: number | bigint): PolicyInput;
    number(value: number): PolicyInput;
    stringList(value: readonly string[]): PolicyInput;
  };
  readonly local: { string(value: string): PolicyInput };
};

function server(
  kind: "STRING" | "BOOLEAN" | "INTEGER" | "NUMBER" | "STRING_LIST",
  value: ServerPolicyInputValue,
): PolicyInput {
  return Object.freeze({ exposure: "SERVER" as const, kind, [policyInputBrand]: value });
}

function local(value: string): PolicyInput {
  return Object.freeze({
    exposure: "LOCAL" as const,
    kind: "STRING" as const,
    [policyInputBrand]: value,
  });
}

/** Constructors for wire-typed remote-policy inputs. */
export const policyInput: PolicyInputFactory = Object.freeze({
  server: Object.freeze({
    string(value: string): PolicyInput {
      return server("STRING", value);
    },
    boolean(value: boolean): PolicyInput {
      return server("BOOLEAN", value);
    },
    integer(value: number | bigint): PolicyInput {
      return server("INTEGER", value);
    },
    number(value: number): PolicyInput {
      return server("NUMBER", value);
    },
    stringList(value: readonly string[]): PolicyInput {
      return server("STRING_LIST", Object.freeze([...value]));
    },
  }),
  local: Object.freeze({
    string(value: string): PolicyInput {
      return local(value);
    },
  }),
});

/** @internal */
export function policyInputValue(input: PolicyInput): ServerPolicyInputValue {
  if (typeof input !== "object" || input === null || !(policyInputBrand in input)) {
    throw new TypeError("Guard policy inputs must be created with policyInput");
  }
  return input[policyInputBrand];
}
