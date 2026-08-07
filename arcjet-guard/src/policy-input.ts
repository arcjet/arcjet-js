/** Typed inputs for remotely configured Guard policies. */

const policyInputBrand: unique symbol = Symbol("arcjet.policy-input");

type ServerPolicyInputValue = string | boolean | number | bigint | readonly string[];

/**
 * A single value explicitly mapped to a remotely configured Guard policy.
 *
 * Create these with {@link policyInput} — plain JavaScript values are rejected
 * so a value can never be sent with the wrong wire type, and so `SERVER`
 * (transmitted) and `LOCAL` (hashed, kept in memory) exposure is always
 * explicit at the call site.
 *
 * @example
 * ```ts
 * const recipient: PolicyInput = policyInput.server.string("user@example.com");
 * const body: PolicyInput = policyInput.local.string(emailBody);
 * ```
 */
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

/**
 * Named, explicitly typed policy inputs keyed by the name the policy references.
 * Plain JavaScript values are rejected — each value must be built with
 * {@link policyInput}.
 *
 * @example
 * ```ts
 * const inputs: PolicyInputMap = {
 *   recipient: policyInput.server.string(recipient),
 *   allowed_recipients: policyInput.server.stringList(allowlist),
 *   body: policyInput.local.string(body),
 * };
 * ```
 */
export type PolicyInputMap = Readonly<Record<string, PolicyInput>>;

type PolicyInputFactory = {
  readonly server: {
    /** Transmit a string value to Arcjet for policy evaluation and evidence. */
    string(value: string): PolicyInput;
    /** Transmit a boolean value to Arcjet for policy evaluation and evidence. */
    boolean(value: boolean): PolicyInput;
    /** Transmit an integer value (number or bigint) to Arcjet for policy evaluation. */
    integer(value: number | bigint): PolicyInput;
    /** Transmit a finite number value to Arcjet for policy evaluation. */
    number(value: number): PolicyInput;
    /** Transmit a list of strings to Arcjet, e.g. for list-membership policies. */
    stringList(value: readonly string[]): PolicyInput;
  };
  readonly local: {
    /**
     * Keep a string local while sending a stable SHA-256 digest for policy
     * correlation. The digest is correlation data, not anonymization or a
     * privacy guarantee: low-entropy or enumerable values can be guessed.
     *
     * @example
     * ```ts
     * // The email body never leaves the SDK; only its digest is sent so the
     * // policy can correlate the same body across requests.
     * const body = policyInput.local.string(emailBody);
     * ```
     */
    string(value: string): PolicyInput;
  };
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

/**
 * Constructors for wire-typed remote-policy inputs.
 *
 * Values built here are passed to `guard()`, `guardAction`, or `guardTool` via
 * their `inputs` option and made available to a remotely configured policy.
 * `server.*` values are transmitted to Arcjet; `local.*` values stay in SDK
 * memory and only their SHA-256 digest is sent.
 *
 * @example
 * ```ts
 * const sendEmail = guardTool(arcjet, emailTool, {
 *   action: "email.sent",
 *   inputs: ({ recipient, body }) => ({
 *     recipient: policyInput.server.string(recipient),
 *     allowed_recipients: policyInput.server.stringList(allowlist),
 *     body: policyInput.local.string(body),
 *   }),
 * });
 * ```
 */
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
