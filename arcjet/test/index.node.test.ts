/**
 * @jest-environment node
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import {
  createRouterTransport,
  DecideRequest,
  DecideResponse,
  DecideService,
  Conclusion,
  ReportRequest,
  ReportResponse,
  Reason,
  Rule,
  SDKStack,
  Timestamp,
  RuleResult,
  RuleState,
} from "@arcjet/protocol/proto";
import { Logger } from "@arcjet/logger";

import arcjet, {
  ArcjetDecision,
  ArcjetMode,
  detectBot,
  rateLimit,
  ArcjetRule,
  defaultBaseUrl,
  ArcjetHeaders,
  Runtime,
  validateEmail,
  protectSignup,
  createRemoteClient,
  ArcjetBotType,
  ArcjetEmailType,
  ArcjetAllowDecision,
  ArcjetDenyDecision,
  ArcjetErrorDecision,
  ArcjetChallengeDecision,
  ArcjetReason,
  ArcjetErrorReason,
  ArcjetConclusion,
  ArcjetRuleResult,
  ArcjetEmailReason,
  ArcjetBotReason,
  ArcjetRateLimitReason,
  ArcjetLocalRule,
  fixedWindow,
  tokenBucket,
  slidingWindow,
  Primitive,
} from "../index";

// Type helpers from https://github.com/sindresorhus/type-fest but adjusted for
// our use.
//
// IsEqual:
// https://github.com/sindresorhus/type-fest/blob/e02f228f6391bb2b26c32a55dfe1e3aa2386d515/source/is-equal.d.ts
//
// Licensed: MIT License Copyright (c) Sindre Sorhus <sindresorhus@gmail.com>
// (https://sindresorhus.com)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions: The above copyright
// notice and this permission notice shall be included in all copies or
// substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
type IsEqual<A, B> = (<G>() => G extends A ? 1 : 2) extends <G>() => G extends B
  ? 1
  : 2
  ? true
  : false;

// Type testing utilities
type Assert<T extends true> = T;
type Props<P extends Primitive> = P extends Primitive<infer Props>
  ? Props
  : never;
type RequiredProps<P extends Primitive, E> = IsEqual<Props<P>, E>;

// Instances of Headers contain symbols that may be different depending
// on if they have been iterated or not, so we need this equality tester
// to only match the items inside the Headers instance.
function areHeadersEqual(a: unknown, b: unknown): boolean | undefined {
  const isAHeaders = a instanceof Headers;
  const isBHeaders = b instanceof Headers;

  if (isAHeaders && isBHeaders) {
    const aKeys = Array.from(a.keys());
    const bKeys = Array.from(b.keys());
    return (
      aKeys.every((key) => b.has(key)) &&
      bKeys.every((key) => a.has(key)) &&
      Array.from(a.entries()).every(([key, value]) => {
        return b.get(key) === value;
      })
    );
  } else if (isAHeaders === isBHeaders) {
    return undefined;
  } else {
    return false;
  }
}

expect.addEqualityTesters([areHeadersEqual]);

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllTimers();
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

function assertIsLocalRule(rule: ArcjetRule): asserts rule is ArcjetLocalRule {
  expect("validate" in rule && typeof rule.validate === "function").toEqual(
    true,
  );
  expect("protect" in rule && typeof rule.protect === "function").toEqual(true);
}

function deferred(): [Promise<void>, () => void, (reason?: unknown) => void] {
  let resolve: () => void;
  let reject: (reason?: unknown) => void;
  let promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  // @ts-expect-error
  return [promise, resolve, reject];
}

class ArcjetTestReason extends ArcjetReason {}

class ArcjetInvalidDecision extends ArcjetDecision {
  reason: ArcjetReason;
  conclusion: ArcjetConclusion;

  constructor() {
    super({ ttl: 0, results: [] });
    // @ts-expect-error
    this.conclusion = "INVALID";
    this.reason = new ArcjetTestReason();
  }
}

describe("defaultBaseUrl", () => {
  test("uses process.env.ARCJET_BASE_URL if set and allowed", () => {
    jest.replaceProperty(process, "env", {
      NODE_ENV: "production",
      ARCJET_BASE_URL: "https://decide.arcjet.orb.local:4082",
    });
    expect(defaultBaseUrl()).toEqual("https://decide.arcjet.orb.local:4082");
  });

  test("does not use process.env.ARCJET_BASE_URL if not allowed", () => {
    jest.replaceProperty(process, "env", {
      NODE_ENV: "production",
      ARCJET_BASE_URL: "http://localhost:1234",
    });
    expect(defaultBaseUrl()).toEqual("https://decide.arcjet.com");
  });

  test("does not use process.env.ARCJET_BASE_URL if empty string", () => {
    jest.replaceProperty(process, "env", {
      NODE_ENV: "production",
      ARCJET_BASE_URL: "",
    });
    expect(defaultBaseUrl()).toEqual("https://decide.arcjet.com");
  });

  test("uses production url if process.env.ARCJET_BASE_URL not set", () => {
    expect(defaultBaseUrl()).toEqual("https://decide.arcjet.com");
  });

  // TODO(#90): Remove these tests once production conditional is removed
  test("uses process.env.ARCJET_BASE_URL if set (in development)", () => {
    jest.replaceProperty(process, "env", {
      NODE_ENV: "development",
      ARCJET_BASE_URL: "http://localhost:1234",
    });
    expect(defaultBaseUrl()).toEqual("http://localhost:1234");
  });

  test("does not use process.env.ARCJET_BASE_URL if empty string (in development)", () => {
    jest.replaceProperty(process, "env", {
      NODE_ENV: "development",
      ARCJET_BASE_URL: "",
    });
    expect(defaultBaseUrl()).toEqual("https://decide.arcjet.com");
  });
});

describe("createRemoteClient", () => {
  test("throws if called without a transport", () => {
    expect(createRemoteClient).toThrow("Transport must be defined");
  });

  test("can be called with only a transport", () => {
    const client = createRemoteClient({
      transport: createRouterTransport(() => {}),
    });
    expect(typeof client.decide).toEqual("function");
    expect(typeof client.report).toEqual("function");
  });

  test("allows overriding the default timeout", async () => {
    // TODO(#32): createRouterTransport doesn't seem to handle timeouts/promises correctly
    const client = createRemoteClient({
      transport: createRouterTransport(({ service }) => {
        service(DecideService, {});
      }),
      timeout: 300,
    });
    expect(typeof client.decide).toEqual("function");
    expect(typeof client.report).toEqual("function");
  });

  test("allows overriding the sdkStack", async () => {
    const key = "test-key";
    const fingerprint =
      "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c";
    const context = {
      key,
      fingerprint,
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };

    const router = {
      decide: jest.fn((args) => {
        return new DecideResponse({
          decision: {
            conclusion: Conclusion.ALLOW,
          },
        });
      }),
    };

    const client = createRemoteClient({
      transport: createRouterTransport(({ service }) => {
        service(DecideService, router);
      }),
      sdkStack: "NEXTJS",
    });
    const _ = await client.decide(context, details, []);

    expect(router.decide).toHaveBeenCalledTimes(1);
    expect(router.decide).toHaveBeenCalledWith(
      new DecideRequest({
        details: {
          ip: details.ip,
          method: details.method,
          protocol: details.protocol,
          host: details.host,
          path: details.path,
          extra: { "extra-test": details["extra-test"] },
          headers: { "user-agent": "curl/8.1.2" },
        },
        fingerprint,
        rules: [],
        sdkStack: SDKStack.SDK_STACK_NEXTJS,
        sdkVersion: "__ARCJET_SDK_VERSION__",
      }),
      expect.anything(),
    );
  });

  test("sets the sdkStack as UNSPECIFIED if invalid", async () => {
    const key = "test-key";
    const fingerprint =
      "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c";
    const context = {
      key,
      fingerprint,
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };

    const router = {
      decide: jest.fn((args) => {
        return new DecideResponse({
          decision: {
            conclusion: Conclusion.ALLOW,
          },
        });
      }),
    };

    const client = createRemoteClient({
      transport: createRouterTransport(({ service }) => {
        service(DecideService, router);
      }),
      // @ts-expect-error
      sdkStack: "SOMETHING_INVALID",
    });
    const _ = await client.decide(context, details, []);

    expect(router.decide).toHaveBeenCalledTimes(1);
    expect(router.decide).toHaveBeenCalledWith(
      new DecideRequest({
        details: {
          ip: details.ip,
          method: details.method,
          protocol: details.protocol,
          host: details.host,
          path: details.path,
          extra: { "extra-test": details["extra-test"] },
          headers: { "user-agent": "curl/8.1.2" },
        },
        fingerprint,
        rules: [],
        sdkStack: SDKStack.SDK_STACK_UNSPECIFIED,
        sdkVersion: "__ARCJET_SDK_VERSION__",
      }),
      expect.anything(),
    );
  });

  test("calling `decide` will make RPC call with correct message", async () => {
    const key = "test-key";
    const fingerprint =
      "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c";
    const context = {
      key,
      fingerprint,
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };

    const router = {
      decide: jest.fn((args) => {
        return new DecideResponse({
          decision: {
            conclusion: Conclusion.ALLOW,
          },
        });
      }),
    };

    const client = createRemoteClient({
      transport: createRouterTransport(({ service }) => {
        service(DecideService, router);
      }),
    });
    const _ = await client.decide(context, details, []);

    expect(router.decide).toHaveBeenCalledTimes(1);
    expect(router.decide).toHaveBeenCalledWith(
      new DecideRequest({
        details: {
          ip: details.ip,
          method: details.method,
          protocol: details.protocol,
          host: details.host,
          path: details.path,
          extra: { "extra-test": details["extra-test"] },
          headers: { "user-agent": "curl/8.1.2" },
        },
        fingerprint,
        rules: [],
        sdkStack: SDKStack.SDK_STACK_NODEJS,
        sdkVersion: "__ARCJET_SDK_VERSION__",
      }),
      expect.anything(),
    );
  });

  test("calling `decide` will make RPC with email included", async () => {
    const key = "test-key";
    const fingerprint =
      "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c";
    const context = {
      key,
      fingerprint,
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
      email: "abc@example.com",
    };

    const router = {
      decide: jest.fn((args) => {
        return new DecideResponse({
          decision: {
            conclusion: Conclusion.ALLOW,
          },
        });
      }),
    };

    const client = createRemoteClient({
      transport: createRouterTransport(({ service }) => {
        service(DecideService, router);
      }),
    });
    const _ = await client.decide(context, details, []);

    expect(router.decide).toHaveBeenCalledTimes(1);
    expect(router.decide).toHaveBeenCalledWith(
      new DecideRequest({
        details: {
          ip: details.ip,
          method: details.method,
          protocol: details.protocol,
          host: details.host,
          path: details.path,
          extra: { "extra-test": details["extra-test"] },
          headers: { "user-agent": "curl/8.1.2" },
          email: details.email,
        },
        fingerprint,
        rules: [],
        sdkStack: SDKStack.SDK_STACK_NODEJS,
        sdkVersion: "__ARCJET_SDK_VERSION__",
      }),
      expect.anything(),
    );
  });

  test("calling `decide` will make RPC with rules included", async () => {
    const key = "test-key";
    const fingerprint =
      "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c";
    const context = {
      key,
      fingerprint,
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
      email: "abc@example.com",
    };

    const router = {
      decide: jest.fn((args) => {
        return new DecideResponse({
          decision: {
            conclusion: Conclusion.ALLOW,
          },
        });
      }),
    };

    const client = createRemoteClient({
      transport: createRouterTransport(({ service }) => {
        service(DecideService, router);
      }),
    });
    const rule: ArcjetRule = {
      type: "TEST_RULE",
      mode: "DRY_RUN",
      priority: 1,
    };
    const _ = await client.decide(context, details, [rule]);

    expect(router.decide).toHaveBeenCalledTimes(1);
    expect(router.decide).toHaveBeenCalledWith(
      new DecideRequest({
        details: {
          ip: details.ip,
          method: details.method,
          protocol: details.protocol,
          host: details.host,
          path: details.path,
          extra: { "extra-test": details["extra-test"] },
          headers: { "user-agent": "curl/8.1.2" },
          email: details.email,
        },
        fingerprint,
        rules: [new Rule()],
        sdkStack: SDKStack.SDK_STACK_NODEJS,
        sdkVersion: "__ARCJET_SDK_VERSION__",
      }),
      expect.anything(),
    );
  });

  test("calling `decide` creates an ALLOW ArcjetDecision if DecideResponse is allowed", async () => {
    const key = "test-key";
    const fingerprint =
      "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c";
    const context = {
      key,
      fingerprint,
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };

    const router = {
      decide: jest.fn((args) => {
        return new DecideResponse({
          decision: {
            conclusion: Conclusion.ALLOW,
          },
        });
      }),
    };

    const client = createRemoteClient({
      transport: createRouterTransport(({ service }) => {
        service(DecideService, router);
      }),
    });
    const decision = await client.decide(context, details, []);

    expect(decision.isErrored()).toBe(false);
    expect(decision.isAllowed()).toBe(true);
  });

  test("calling `decide` creates a DENY ArcjetDecision if DecideResponse is denied", async () => {
    const key = "test-key";
    const fingerprint =
      "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c";
    const context = {
      key,
      fingerprint,
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };

    const router = {
      decide: jest.fn((args) => {
        return new DecideResponse({
          decision: {
            conclusion: Conclusion.DENY,
          },
        });
      }),
    };

    const client = createRemoteClient({
      transport: createRouterTransport(({ service }) => {
        service(DecideService, router);
      }),
    });
    const decision = await client.decide(context, details, []);

    expect(decision.isDenied()).toBe(true);
  });

  test("calling `decide` creates a CHALLENGE ArcjetDecision if DecideResponse is challenged", async () => {
    const key = "test-key";
    const fingerprint =
      "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c";
    const context = {
      key,
      fingerprint,
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };

    const router = {
      decide: jest.fn((args) => {
        return new DecideResponse({
          decision: {
            conclusion: Conclusion.CHALLENGE,
          },
        });
      }),
    };

    const client = createRemoteClient({
      transport: createRouterTransport(({ service }) => {
        service(DecideService, router);
      }),
    });
    const decision = await client.decide(context, details, []);

    expect(decision.isChallenged()).toBe(true);
  });

  test("calling `decide` creates an ERROR ArcjetDecision with default message if DecideResponse is error and no reason", async () => {
    const key = "test-key";
    const fingerprint =
      "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c";
    const context = {
      key,
      fingerprint,
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };

    const router = {
      decide: jest.fn((args) => {
        return new DecideResponse({
          decision: {
            conclusion: Conclusion.ERROR,
          },
        });
      }),
    };

    const client = createRemoteClient({
      transport: createRouterTransport(({ service }) => {
        service(DecideService, router);
      }),
    });
    const decision = await client.decide(context, details, []);

    expect(decision.isErrored()).toBe(true);
    expect(decision.reason).toMatchObject({
      message: "Unknown error occurred",
    });
  });

  test("calling `decide` creates an ERROR ArcjetDecision with message if DecideResponse if error and reason available", async () => {
    const key = "test-key";
    const fingerprint =
      "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c";
    const context = {
      key,
      fingerprint,
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };

    const router = {
      decide: jest.fn((args) => {
        return new DecideResponse({
          decision: {
            conclusion: Conclusion.ERROR,
            reason: {
              reason: {
                case: "error",
                value: { message: "Boom!" },
              },
            },
          },
        });
      }),
    };

    const client = createRemoteClient({
      transport: createRouterTransport(({ service }) => {
        service(DecideService, router);
      }),
    });
    const decision = await client.decide(context, details, []);

    expect(decision.isErrored()).toBe(true);
    expect(decision.reason).toMatchObject({
      message: "Boom!",
    });
  });

  test("calling `decide` creates an ERROR ArcjetDecision if DecideResponse is unspecified", async () => {
    const key = "test-key";
    const fingerprint =
      "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c";
    const context = {
      key,
      fingerprint,
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };

    const router = {
      decide: jest.fn((args) => {
        return new DecideResponse({
          decision: {
            conclusion: Conclusion.UNSPECIFIED,
          },
        });
      }),
    };

    const client = createRemoteClient({
      transport: createRouterTransport(({ service }) => {
        service(DecideService, router);
      }),
    });
    const decision = await client.decide(context, details, []);

    expect(decision.isErrored()).toBe(true);
    expect(decision.isAllowed()).toBe(true);
  });

  test("calling `report` will make RPC call with ALLOW decision", async () => {
    const key = "test-key";
    const fingerprint =
      "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c";
    const context = {
      key,
      fingerprint,
      log: new Logger(),
    };
    const receivedAt = Timestamp.now();
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
      email: "test@example.com",
    };

    const [promise, resolve] = deferred();

    const router = {
      report: jest.fn((args) => {
        resolve();
        return new ReportResponse({});
      }),
    };

    const client = createRemoteClient({
      transport: createRouterTransport(({ service }) => {
        service(DecideService, router);
      }),
    });
    const decision = new ArcjetAllowDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    client.report(context, details, decision, []);

    await promise;

    expect(router.report).toHaveBeenCalledTimes(1);
    expect(router.report).toHaveBeenCalledWith(
      new ReportRequest({
        sdkStack: SDKStack.SDK_STACK_NODEJS,
        sdkVersion: "__ARCJET_SDK_VERSION__",
        fingerprint,
        details: {
          ip: details.ip,
          method: details.method,
          protocol: details.protocol,
          host: details.host,
          path: details.path,
          extra: { "extra-test": details["extra-test"] },
          headers: { "user-agent": "curl/8.1.2" },
          email: details.email,
        },
        decision: {
          id: decision.id,
          conclusion: Conclusion.ALLOW,
          reason: new Reason(),
          ruleResults: [],
        },
        receivedAt,
      }),
      expect.anything(),
    );
  });

  test("calling `report` will make RPC call with DENY decision", async () => {
    const key = "test-key";
    const fingerprint =
      "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c";
    const context = {
      key,
      fingerprint,
      log: new Logger(),
    };
    const receivedAt = Timestamp.now();
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };

    const [promise, resolve] = deferred();

    const router = {
      report: jest.fn((args) => {
        resolve();
        return new ReportResponse({});
      }),
    };

    const client = createRemoteClient({
      transport: createRouterTransport(({ service }) => {
        service(DecideService, router);
      }),
    });
    const decision = new ArcjetDenyDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    client.report(context, details, decision, []);

    await promise;

    expect(router.report).toHaveBeenCalledTimes(1);
    expect(router.report).toHaveBeenCalledWith(
      new ReportRequest({
        fingerprint,
        sdkStack: SDKStack.SDK_STACK_NODEJS,
        sdkVersion: "__ARCJET_SDK_VERSION__",
        details: {
          ip: details.ip,
          method: details.method,
          protocol: details.protocol,
          host: details.host,
          path: details.path,
          extra: { "extra-test": details["extra-test"] },
          headers: { "user-agent": "curl/8.1.2" },
        },
        decision: {
          id: decision.id,
          conclusion: Conclusion.DENY,
          reason: new Reason(),
          ruleResults: [],
        },
        receivedAt,
      }),
      expect.anything(),
    );
  });

  test("calling `report` will make RPC call with ERROR decision", async () => {
    const key = "test-key";
    const fingerprint =
      "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c";
    const context = {
      key,
      fingerprint,
      log: new Logger(),
    };
    const receivedAt = Timestamp.now();
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };

    const [promise, resolve] = deferred();

    const router = {
      report: jest.fn((args) => {
        resolve();
        return new ReportResponse({});
      }),
    };

    const client = createRemoteClient({
      transport: createRouterTransport(({ service }) => {
        service(DecideService, router);
      }),
    });
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason("Failure"),
      results: [],
    });
    client.report(context, details, decision, []);

    await promise;

    expect(router.report).toHaveBeenCalledTimes(1);
    expect(router.report).toHaveBeenCalledWith(
      new ReportRequest({
        sdkStack: SDKStack.SDK_STACK_NODEJS,
        sdkVersion: "__ARCJET_SDK_VERSION__",
        fingerprint,
        details: {
          ip: details.ip,
          method: details.method,
          protocol: details.protocol,
          host: details.host,
          path: details.path,
          extra: { "extra-test": details["extra-test"] },
          headers: { "user-agent": "curl/8.1.2" },
        },
        decision: {
          id: decision.id,
          conclusion: Conclusion.ERROR,
          reason: new Reason({
            reason: {
              case: "error",
              value: {
                message: "Failure",
              },
            },
          }),
          ruleResults: [],
        },
        receivedAt,
      }),
      expect.anything(),
    );
  });

  test("calling `report` will make RPC call with CHALLENGE decision", async () => {
    const key = "test-key";
    const fingerprint =
      "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c";
    const context = {
      key,
      fingerprint,
      log: new Logger(),
    };
    const receivedAt = Timestamp.now();
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };

    const [promise, resolve] = deferred();

    const router = {
      report: jest.fn((args) => {
        resolve();
        return new ReportResponse({});
      }),
    };

    const client = createRemoteClient({
      transport: createRouterTransport(({ service }) => {
        service(DecideService, router);
      }),
    });
    const decision = new ArcjetChallengeDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    client.report(context, details, decision, []);

    await promise;

    expect(router.report).toHaveBeenCalledTimes(1);
    expect(router.report).toHaveBeenCalledWith(
      new ReportRequest({
        sdkStack: SDKStack.SDK_STACK_NODEJS,
        sdkVersion: "__ARCJET_SDK_VERSION__",
        fingerprint,
        details: {
          ip: details.ip,
          method: details.method,
          protocol: details.protocol,
          host: details.host,
          path: details.path,
          extra: { "extra-test": details["extra-test"] },
          headers: { "user-agent": "curl/8.1.2" },
        },
        decision: {
          id: decision.id,
          conclusion: Conclusion.CHALLENGE,
          reason: new Reason(),
          ruleResults: [],
        },
        receivedAt,
      }),
      expect.anything(),
    );
  });

  test("calling `report` will make RPC call with UNSPECIFIED decision if invalid", async () => {
    const key = "test-key";
    const fingerprint =
      "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c";
    const context = {
      key,
      fingerprint,
      log: new Logger(),
    };
    const receivedAt = Timestamp.now();
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };

    const [promise, resolve] = deferred();

    const router = {
      report: jest.fn((args) => {
        resolve();
        return new ReportResponse({});
      }),
    };

    const client = createRemoteClient({
      transport: createRouterTransport(({ service }) => {
        service(DecideService, router);
      }),
    });
    const decision = new ArcjetInvalidDecision();
    client.report(context, details, decision, []);

    await promise;

    expect(router.report).toHaveBeenCalledTimes(1);
    expect(router.report).toHaveBeenCalledWith(
      new ReportRequest({
        sdkStack: SDKStack.SDK_STACK_NODEJS,
        sdkVersion: "__ARCJET_SDK_VERSION__",
        fingerprint,
        details: {
          ip: details.ip,
          method: details.method,
          protocol: details.protocol,
          host: details.host,
          path: details.path,
          extra: { "extra-test": details["extra-test"] },
          headers: { "user-agent": "curl/8.1.2" },
        },
        decision: {
          id: decision.id,
          conclusion: Conclusion.UNSPECIFIED,
          reason: new Reason(),
          ruleResults: [],
        },
        receivedAt,
      }),
      expect.anything(),
    );
  });

  test("calling `report` will make RPC with rules included", async () => {
    const key = "test-key";
    const fingerprint =
      "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c";
    const context = {
      key,
      fingerprint,
      log: new Logger(),
    };
    const receivedAt = Timestamp.now();
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
      email: "abc@example.com",
    };

    const [promise, resolve] = deferred();

    const router = {
      report: jest.fn((args) => {
        resolve();
        return new ReportResponse({});
      }),
    };

    const client = createRemoteClient({
      transport: createRouterTransport(({ service }) => {
        service(DecideService, router);
      }),
    });

    const decision = new ArcjetDenyDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [
        new ArcjetRuleResult({
          ttl: 0,
          state: "RUN",
          conclusion: "DENY",
          reason: new ArcjetReason(),
        }),
      ],
    });
    const rule: ArcjetRule = {
      type: "TEST_RULE",
      mode: "LIVE",
      priority: 1,
    };
    client.report(context, details, decision, [rule]);

    await promise;

    expect(router.report).toHaveBeenCalledTimes(1);
    expect(router.report).toHaveBeenCalledWith(
      new ReportRequest({
        sdkStack: SDKStack.SDK_STACK_NODEJS,
        sdkVersion: "__ARCJET_SDK_VERSION__",
        fingerprint,
        details: {
          ip: details.ip,
          method: details.method,
          protocol: details.protocol,
          host: details.host,
          path: details.path,
          extra: { "extra-test": details["extra-test"] },
          headers: { "user-agent": "curl/8.1.2" },
          email: details.email,
        },
        decision: {
          id: decision.id,
          conclusion: Conclusion.DENY,
          reason: new Reason(),
          ruleResults: [
            new RuleResult({
              ruleId: "",
              state: RuleState.RUN,
              conclusion: Conclusion.DENY,
              reason: new Reason(),
            }),
          ],
        },
        rules: [new Rule()],
        receivedAt,
      }),
      expect.anything(),
    );
  });

  test("calling `report` only logs if it fails", async () => {
    const key = "test-key";
    const fingerprint =
      "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c";
    const context = {
      key,
      fingerprint,
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };

    const [promise, resolve] = deferred();

    const logSpy = jest.spyOn(context.log, "log").mockImplementation(() => {
      resolve();
    });

    const client = createRemoteClient({
      transport: createRouterTransport(({ service }) => {
        service(DecideService, {});
      }),
    });
    const decision = new ArcjetAllowDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    client.report(context, details, decision, []);

    await promise;

    expect(logSpy).toHaveBeenCalledTimes(1);
  });
});

describe("ArcjetHeaders", () => {
  test("can be constructed no initializer", () => {
    const headers = new ArcjetHeaders();
    expect(headers).toBeInstanceOf(ArcjetHeaders);
    expect(headers).toBeInstanceOf(Headers);
  });

  test("can be constructed with a Headers instance", () => {
    const init = new Headers();
    init.set("foobar", "baz");
    const headers = new ArcjetHeaders(init);
    expect(headers.get("foobar")).toEqual("baz");
  });

  test("can be constructed with an ArcjetHeaders instance", () => {
    const init = new ArcjetHeaders();
    init.set("foobar", "baz");
    const headers = new ArcjetHeaders(init);
    expect(headers.get("foobar")).toEqual("baz");
  });

  test("can be constructed with an array of tuples", () => {
    const headers = new ArcjetHeaders([["foobar", "baz"]]);
    expect(headers.get("foobar")).toEqual("baz");
  });

  test("can be constructed with an object", () => {
    const headers = new ArcjetHeaders({
      foobar: "baz",
    });
    expect(headers.get("foobar")).toEqual("baz");
  });

  test("filters undefined values in an object", () => {
    const headers = new ArcjetHeaders({
      foobar: undefined,
    });
    expect(headers.has("foobar")).toEqual(false);
  });

  test("combines array values in an object", () => {
    const headers = new ArcjetHeaders({
      foo: ["bar", "baz"],
    });
    expect(headers.get("foo")).toEqual("bar, baz");
  });
});

describe("ArcjetDecision", () => {
  test("will default the `id` property if not specified", () => {
    const decision = new ArcjetAllowDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    expect(decision.id).toMatch(/^lreq_/);
  });

  test("the `id` property if to be specified to the constructor", () => {
    const decision = new ArcjetAllowDecision({
      id: "abc_123",
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    expect(decision.id).toEqual("abc_123");
  });

  // TODO: This test doesn't make sense anymore
  test("an ERROR decision can be constructed with an Error object", () => {
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason(new Error("Foo bar baz")),
      results: [],
    });
    expect(decision.reason).toBeInstanceOf(ArcjetErrorReason);
    expect(decision.reason).toMatchObject({
      message: "Foo bar baz",
    });
  });

  // TODO: This test doesn't make sense anymore
  test("an ERROR decision can be constructed with a string message", () => {
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason("Boom!"),
      results: [],
    });
    expect(decision.reason).toBeInstanceOf(ArcjetErrorReason);
    expect(decision.reason).toMatchObject({
      message: "Boom!",
    });
  });

  // TODO: This test doesn't make sense anymore
  test("use an unknown error for an ERROR decision constructed with other types", () => {
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason(["not", "valid", "error"]),
      results: [],
    });
    expect(decision.reason).toBeInstanceOf(ArcjetErrorReason);
    expect(decision.reason).toMatchObject({
      message: "Unknown error occurred",
    });
  });

  test("`isAllowed()` returns true when type is ALLOW", () => {
    const decision = new ArcjetAllowDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    expect(decision.isAllowed()).toEqual(true);
  });

  test("`isAllowed()` returns true when type is ERROR (fail open)", () => {
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason("Something"),
      results: [],
    });
    expect(decision.isAllowed()).toEqual(true);
  });

  test("`isAllowed()` returns false when type is DENY", () => {
    const decision = new ArcjetDenyDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    expect(decision.isAllowed()).toEqual(false);
  });

  test("`isDenied()` returns false when type is ALLOW", () => {
    const decision = new ArcjetAllowDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    expect(decision.isDenied()).toEqual(false);
  });

  test("`isDenied()` returns false when type is ERROR (fail open)", () => {
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason("Something"),
      results: [],
    });
    expect(decision.isDenied()).toEqual(false);
  });

  test("`isDenied()` returns true when type is DENY", () => {
    const decision = new ArcjetDenyDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    expect(decision.isDenied()).toEqual(true);
  });

  test("`isChallenged()` returns true when type is CHALLENGE", () => {
    const decision = new ArcjetChallengeDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    expect(decision.isChallenged()).toEqual(true);
  });

  test("`isErrored()` returns false when type is ALLOW", () => {
    const decision = new ArcjetAllowDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    expect(decision.isErrored()).toEqual(false);
  });

  test("`isErrored()` returns false when type is ERROR", () => {
    const decision = new ArcjetErrorDecision({
      ttl: 0,
      reason: new ArcjetErrorReason("Something"),
      results: [],
    });
    expect(decision.isErrored()).toEqual(true);
  });

  test("`isErrored()` returns false when type is DENY", () => {
    const decision = new ArcjetDenyDecision({
      ttl: 0,
      reason: new ArcjetTestReason(),
      results: [],
    });
    expect(decision.isErrored()).toEqual(false);
  });

  test("`isRateLimit()` returns true when reason is RATE_LIMIT", () => {
    const reason = new ArcjetRateLimitReason({
      max: 0,
      remaining: 0,
    });
    expect(reason.isRateLimit()).toEqual(true);
  });

  test("`isRateLimit()` returns true when reason is not RATE_LIMIT", () => {
    const reason = new ArcjetTestReason();
    expect(reason.isRateLimit()).toEqual(false);
  });

  test("`isBot()` returns true when reason is BOT", () => {
    const reason = new ArcjetBotReason({
      botType: "AUTOMATED",
    });
    expect(reason.isBot()).toEqual(true);
  });

  test("`isBot()` returns true when reason is not BOT", () => {
    const reason = new ArcjetTestReason();
    expect(reason.isBot()).toEqual(false);
  });
});

describe("Primitive > detectBot", () => {
  test("provides a default rule with no options specified", async () => {
    const [rule] = detectBot();
    expect(rule.type).toEqual("BOT");
    expect(rule).toHaveProperty("mode", "DRY_RUN");
    expect(rule).toHaveProperty("block", ["AUTOMATED"]);
    expect(rule).toHaveProperty("add", []);
    expect(rule).toHaveProperty("remove", []);
  });

  test("sets mode as 'DRY_RUN' if not 'LIVE' or 'DRY_RUN'", async () => {
    const [rule] = detectBot({
      // @ts-expect-error
      mode: "INVALID",
    });
    expect(rule.type).toEqual("BOT");
    expect(rule).toHaveProperty("mode", "DRY_RUN");
  });

  test("allows specifying BotTypes to block", async () => {
    const options = {
      block: [
        ArcjetBotType.LIKELY_AUTOMATED,
        ArcjetBotType.LIKELY_NOT_A_BOT,
        ArcjetBotType.NOT_ANALYZED,
        ArcjetBotType.VERIFIED_BOT,
      ],
    };

    const [rule] = detectBot(options);
    expect(rule.type).toEqual("BOT");
    expect(rule).toHaveProperty("block", [
      "LIKELY_AUTOMATED",
      "LIKELY_NOT_A_BOT",
      "NOT_ANALYZED",
      "VERIFIED_BOT",
    ]);
  });

  test("allows specifying `add` patterns that map to BotTypes", async () => {
    const options = {
      patterns: {
        add: {
          safari: ArcjetBotType.LIKELY_AUTOMATED,
        },
      },
    };

    const [rule] = detectBot(options);
    expect(rule.type).toEqual("BOT");
    expect(rule).toHaveProperty("add", [["safari", "LIKELY_AUTOMATED"]]);
  });

  test("allows specifying `remove` patterns", async () => {
    const options = {
      patterns: {
        remove: ["^curl"],
      },
    };

    const [rule] = detectBot(options);
    expect(rule.type).toEqual("BOT");
    expect(rule).toHaveProperty("remove", ["^curl"]);
  });

  test("validates that headers is defined", () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      log: new Logger(),
    };
    const details = {
      headers: new Headers(),
    };

    const [rule] = detectBot();
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    expect(() => {
      const _ = rule.validate(context, details);
    }).not.toThrow();
  });

  test("throws via `validate()` if headers is undefined", () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      log: new Logger(),
    };
    const details = {
      headers: undefined,
    };

    const [rule] = detectBot();
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    expect(() => {
      const _ = rule.validate(context, details);
    }).toThrow();
  });

  test("does not analyze if no headers are specified", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      extra: {},
    };

    const [rule] = detectBot();
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "ALLOW",
      reason: new ArcjetBotReason({
        botType: "NOT_ANALYZED",
      }),
    });
  });

  test("can be configured for VERIFIED_BOT", async () => {
    const options = {
      mode: ArcjetMode.LIVE,
      block: [
        // TODO: Fix this in the analyze code so it returns the BotType specified via `add`
        ArcjetBotType.AUTOMATED,
        ArcjetBotType.VERIFIED_BOT,
      ],
      patterns: {
        add: {
          safari: ArcjetBotType.VERIFIED_BOT,
        },
      },
    };
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([
        [
          "User-Agent",
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
        ],
      ]),
      "extra-test": "extra-test-value",
    };

    const [rule] = detectBot(options);
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetBotReason({
        // TODO: Fix this in the analyze code so it returns the BotType specified via `add`
        botType: "AUTOMATED",
        botScore: 1,
        userAgentMatch: true,
      }),
    });
  });

  test("can be configured for LIKELY_NOT_A_BOT", async () => {
    const options = {
      mode: ArcjetMode.LIVE,
      block: [
        // TODO: Fix this in the analyze code so it returns the BotType specified via `add`
        ArcjetBotType.AUTOMATED,
        ArcjetBotType.LIKELY_NOT_A_BOT,
      ],
      patterns: {
        add: {
          safari: ArcjetBotType.LIKELY_NOT_A_BOT,
        },
      },
    };
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([
        [
          "User-Agent",
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
        ],
      ]),
      "extra-test": "extra-test-value",
    };

    const [rule] = detectBot(options);
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetBotReason({
        // TODO: Fix this in the analyze code so it returns the BotType specified via `add`
        botType: "AUTOMATED",
        botScore: 1,
        userAgentMatch: true,
      }),
    });
  });

  test("can be configured for NOT_ANALYZED", async () => {
    const options = {
      mode: ArcjetMode.LIVE,
      block: [
        // TODO: Fix this in the analyze code so it returns the BotType specified via `add`
        ArcjetBotType.AUTOMATED,
        ArcjetBotType.NOT_ANALYZED,
      ],
      patterns: {
        add: {
          safari: ArcjetBotType.NOT_ANALYZED,
        },
      },
    };
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([
        [
          "User-Agent",
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
        ],
      ]),
      "extra-test": "extra-test-value",
    };

    const [rule] = detectBot(options);
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetBotReason({
        // TODO: Fix this in the analyze code so it returns the BotType specified via `add`
        botType: "AUTOMATED",
        botScore: 1,
        userAgentMatch: true,
      }),
    });
  });

  test("can be configured for invalid bots", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([
        [
          "User-Agent",
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
        ],
      ]),
      "extra-test": "extra-test-value",
    };

    const [rule] = detectBot({
      mode: ArcjetMode.LIVE,
      block: [
        // TODO: Fix this in the analyze code so it returns the BotType specified via `add`
        ArcjetBotType.AUTOMATED,
        // @ts-expect-error
        "SOMETHING_INVALID",
      ],
      patterns: {
        add: {
          // @ts-expect-error
          safari: "SOMETHING_INVALID",
        },
      },
    });
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetBotReason({
        // TODO: Fix this in the analyze code so it returns the BotType specified via `add`
        botType: "AUTOMATED",
        botScore: 1,
        userAgentMatch: true,
      }),
    });
  });

  test("denies curl", async () => {
    const options = {
      mode: ArcjetMode.LIVE,
      block: [
        ArcjetBotType.AUTOMATED,
        ArcjetBotType.LIKELY_AUTOMATED,
        ArcjetBotType.LIKELY_NOT_A_BOT,
      ],
    };
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };

    const [rule] = detectBot(options);
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetBotReason({
        botType: "AUTOMATED",
        botScore: 1,
        userAgentMatch: true,
      }),
    });
  });

  test("denies safari using an add pattern", async () => {
    const options = {
      mode: ArcjetMode.LIVE,
      block: [
        ArcjetBotType.AUTOMATED,
        ArcjetBotType.LIKELY_AUTOMATED,
        ArcjetBotType.LIKELY_NOT_A_BOT,
      ],
      patterns: {
        add: {
          safari: ArcjetBotType.AUTOMATED,
        },
      },
    };
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([
        [
          "User-Agent",
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
        ],
      ]),
      "extra-test": "extra-test-value",
    };

    const [rule] = detectBot(options);
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetBotReason({
        botType: "AUTOMATED",
        botScore: 1,
        userAgentMatch: true,
      }),
    });
  });

  test("allows curl using a remove pattern", async () => {
    const options = {
      mode: ArcjetMode.LIVE,
      block: [ArcjetBotType.AUTOMATED, ArcjetBotType.LIKELY_AUTOMATED],
      patterns: {
        remove: ["^curl"],
      },
    };
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };

    const [rule] = detectBot(options);
    expect(rule.type).toEqual("BOT");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "ALLOW",
      reason: new ArcjetBotReason({
        botScore: 0,
        botType: "LIKELY_NOT_A_BOT",
      }),
    });
  });
});

describe("Primitive > tokenBucket", () => {
  test("provides no rules if no `options` specified", () => {
    const rules = tokenBucket();
    expect(rules).toHaveLength(0);
  });

  test("sets mode as `DRY_RUN` if not 'LIVE' or 'DRY_RUN'", async () => {
    const [rule] = tokenBucket({
      // @ts-expect-error
      mode: "INVALID",
      match: "/test",
      characteristics: ["ip.src"],
      refillRate: 1,
      interval: 1,
      capacity: 1,
    });
    expect(rule.type).toEqual("RATE_LIMIT");
    expect(rule).toHaveProperty("mode", "DRY_RUN");
  });

  test("sets mode as `LIVE` if specified", async () => {
    const [rule] = tokenBucket({
      mode: "LIVE",
      match: "/test",
      characteristics: ["ip.src"],
      refillRate: 1,
      interval: 1,
      capacity: 1,
    });
    expect(rule.type).toEqual("RATE_LIMIT");
    expect(rule).toHaveProperty("mode", "LIVE");
  });

  test("can specify interval as a string duration", async () => {
    const options = {
      refillRate: 60,
      interval: "60s",
      capacity: 120,
    };

    const rules = tokenBucket(options);
    expect(rules).toHaveLength(1);
    expect(rules[0].type).toEqual("RATE_LIMIT");
    expect(rules[0]).toHaveProperty("refillRate", 60);
    expect(rules[0]).toHaveProperty("interval", 60);
    expect(rules[0]).toHaveProperty("capacity", 120);
  });

  test("can specify interval as an integer duration", async () => {
    const options = {
      refillRate: 60,
      interval: 60,
      capacity: 120,
    };

    const rules = tokenBucket(options);
    expect(rules).toHaveLength(1);
    expect(rules[0].type).toEqual("RATE_LIMIT");
    expect(rules[0]).toHaveProperty("refillRate", 60);
    expect(rules[0]).toHaveProperty("interval", 60);
    expect(rules[0]).toHaveProperty("capacity", 120);
  });

  test("can specify user-defined characteristics which are reflected in required props", async () => {
    const rules = tokenBucket({
      characteristics: ["userId"],
      refillRate: 60,
      interval: 60,
      capacity: 120,
    });
    type Test = Assert<
      RequiredProps<
        typeof rules,
        { requested: number; userId: string | number | boolean }
      >
    >;
  });

  test("well-known characteristics don't affect the required props", async () => {
    const rules = tokenBucket({
      characteristics: [
        "ip.src",
        "http.host",
        "http.method",
        "http.request.uri.path",
        `http.request.headers["abc"]`,
        `http.request.cookie["xyz"]`,
        `http.request.uri.args["foobar"]`,
      ],
      refillRate: 60,
      interval: 60,
      capacity: 120,
    });
    type Test = Assert<RequiredProps<typeof rules, { requested: number }>>;
  });

  test("produces a rules based on single `limit` specified", async () => {
    const options = {
      match: "/test",
      characteristics: ["ip.src"],
      refillRate: 1,
      interval: 1,
      capacity: 1,
    };

    const rules = tokenBucket(options);
    expect(rules).toHaveLength(1);
    expect(rules[0].type).toEqual("RATE_LIMIT");
    expect(rules[0]).toHaveProperty("mode", "DRY_RUN");
    expect(rules[0]).toHaveProperty("match", "/test");
    expect(rules[0]).toHaveProperty("characteristics", ["ip.src"]);
    expect(rules[0]).toHaveProperty("algorithm", "TOKEN_BUCKET");
    expect(rules[0]).toHaveProperty("refillRate", 1);
    expect(rules[0]).toHaveProperty("interval", 1);
    expect(rules[0]).toHaveProperty("capacity", 1);
  });

  test("produces a multiple rules based on multiple `limit` specified", async () => {
    const options = [
      {
        match: "/test",
        characteristics: ["ip.src"],
        refillRate: 1,
        interval: 1,
        capacity: 1,
      },
      {
        match: "/test-double",
        characteristics: ["ip.src"],
        refillRate: 2,
        interval: 2,
        capacity: 2,
      },
    ];

    const rules = tokenBucket(...options);
    expect(rules).toHaveLength(2);
    expect(rules).toEqual([
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: "/test",
        characteristics: ["ip.src"],
        algorithm: "TOKEN_BUCKET",
        refillRate: 1,
        interval: 1,
        capacity: 1,
      }),
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: "/test-double",
        characteristics: ["ip.src"],
        algorithm: "TOKEN_BUCKET",
        refillRate: 2,
        interval: 2,
        capacity: 2,
      }),
    ]);
  });

  test("does not default `match` and `characteristics` if not specified in single `limit`", async () => {
    const options = {
      refillRate: 1,
      interval: 1,
      capacity: 1,
    };

    const [rule] = tokenBucket(options);
    expect(rule.type).toEqual("RATE_LIMIT");
    expect(rule).toHaveProperty("match", undefined);
    expect(rule).toHaveProperty("characteristics", undefined);
  });

  test("does not default `match` or `characteristics` if not specified in array `limit`", async () => {
    const options = [
      {
        refillRate: 1,
        interval: 1,
        capacity: 1,
      },
      {
        refillRate: 2,
        interval: 2,
        capacity: 2,
      },
    ];

    const rules = tokenBucket(...options);
    expect(rules).toEqual([
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: undefined,
        characteristics: undefined,
        algorithm: "TOKEN_BUCKET",
        refillRate: 1,
        interval: 1,
        capacity: 1,
      }),
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: undefined,
        characteristics: undefined,
        refillRate: 2,
        interval: 2,
        capacity: 2,
      }),
    ]);
  });
});

describe("Primitive > fixedWindow", () => {
  test("provides no rules if no `options` specified", () => {
    const rules = fixedWindow();
    expect(rules).toHaveLength(0);
  });

  test("sets mode as `DRY_RUN` if not 'LIVE' or 'DRY_RUN'", async () => {
    const [rule] = fixedWindow({
      // @ts-expect-error
      mode: "INVALID",
      match: "/test",
      characteristics: ["ip.src"],
      window: "1h",
      max: 1,
    });
    expect(rule.type).toEqual("RATE_LIMIT");
    expect(rule).toHaveProperty("mode", "DRY_RUN");
  });

  test("sets mode as `LIVE` if specified", async () => {
    const [rule] = fixedWindow({
      mode: "LIVE",
      match: "/test",
      characteristics: ["ip.src"],
      window: "1h",
      max: 1,
    });
    expect(rule.type).toEqual("RATE_LIMIT");
    expect(rule).toHaveProperty("mode", "LIVE");
  });

  test("can specify window as a string duration", async () => {
    const options = {
      window: "60s",
      max: 1,
    };

    const rules = fixedWindow(options);
    expect(rules).toHaveLength(1);
    expect(rules[0].type).toEqual("RATE_LIMIT");
    expect(rules[0]).toHaveProperty("window", 60);
    expect(rules[0]).toHaveProperty("max", 1);
  });

  test("can specify window as an integer duration", async () => {
    const options = {
      window: 60,
      max: 1,
    };

    const rules = fixedWindow(options);
    expect(rules).toHaveLength(1);
    expect(rules[0].type).toEqual("RATE_LIMIT");
    expect(rules[0]).toHaveProperty("window", 60);
    expect(rules[0]).toHaveProperty("max", 1);
  });

  test("can specify user-defined characteristics which are reflected in required props", async () => {
    const rules = fixedWindow({
      characteristics: ["userId"],
      window: "1h",
      max: 1,
    });
    type Test = Assert<
      RequiredProps<typeof rules, { userId: string | number | boolean }>
    >;
  });

  test("well-known characteristics don't affect the required props", async () => {
    const rules = fixedWindow({
      characteristics: [
        "ip.src",
        "http.host",
        "http.method",
        "http.request.uri.path",
        `http.request.headers["abc"]`,
        `http.request.cookie["xyz"]`,
        `http.request.uri.args["foobar"]`,
      ],
      window: "1h",
      max: 1,
    });
    type Test = Assert<RequiredProps<typeof rules, {}>>;
  });

  test("produces a rules based on single `limit` specified", async () => {
    const options = {
      match: "/test",
      characteristics: ["ip.src"],
      window: "1h",
      max: 1,
    };

    const rules = fixedWindow(options);
    expect(rules).toHaveLength(1);
    expect(rules[0].type).toEqual("RATE_LIMIT");
    expect(rules[0]).toHaveProperty("mode", "DRY_RUN");
    expect(rules[0]).toHaveProperty("match", "/test");
    expect(rules[0]).toHaveProperty("characteristics", ["ip.src"]);
    expect(rules[0]).toHaveProperty("algorithm", "FIXED_WINDOW");
    expect(rules[0]).toHaveProperty("window", 3600);
    expect(rules[0]).toHaveProperty("max", 1);
  });

  test("produces a multiple rules based on multiple `limit` specified", async () => {
    const options = [
      {
        match: "/test",
        characteristics: ["ip.src"],
        window: "1h",
        max: 1,
      },
      {
        match: "/test-double",
        characteristics: ["ip.src"],
        window: "2h",
        max: 2,
      },
    ];

    const rules = fixedWindow(...options);
    expect(rules).toHaveLength(2);
    expect(rules).toEqual([
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: "/test",
        characteristics: ["ip.src"],
        algorithm: "FIXED_WINDOW",
        window: 3600,
        max: 1,
      }),
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: "/test-double",
        characteristics: ["ip.src"],
        algorithm: "FIXED_WINDOW",
        window: 7200,
        max: 2,
      }),
    ]);
  });

  test("does not default `match` and `characteristics` if not specified in single `limit`", async () => {
    const options = {
      window: "1h",
      max: 1,
    };

    const [rule] = fixedWindow(options);
    expect(rule.type).toEqual("RATE_LIMIT");
    expect(rule).toHaveProperty("match", undefined);
    expect(rule).toHaveProperty("characteristics", undefined);
  });

  test("does not default `match` or `characteristics` if not specified in array `limit`", async () => {
    const options = [
      {
        window: "1h",
        max: 1,
      },
      {
        window: "2h",
        max: 2,
      },
    ];

    const rules = fixedWindow(...options);
    expect(rules).toEqual([
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: undefined,
        characteristics: undefined,
        algorithm: "FIXED_WINDOW",
        window: 3600,
        max: 1,
      }),
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: undefined,
        characteristics: undefined,
        algorithm: "FIXED_WINDOW",
        window: 7200,
        max: 2,
      }),
    ]);
  });
});

describe("Primitive > slidingWindow", () => {
  test("provides no rules if no `options` specified", () => {
    const rules = slidingWindow();
    expect(rules).toHaveLength(0);
  });

  test("sets mode as `DRY_RUN` if not 'LIVE' or 'DRY_RUN'", async () => {
    const [rule] = slidingWindow({
      // @ts-expect-error
      mode: "INVALID",
      match: "/test",
      characteristics: ["ip.src"],
      interval: 3600,
      max: 1,
    });
    expect(rule.type).toEqual("RATE_LIMIT");
    expect(rule).toHaveProperty("mode", "DRY_RUN");
  });

  test("sets mode as `LIVE` if specified", async () => {
    const [rule] = slidingWindow({
      mode: "LIVE",
      match: "/test",
      characteristics: ["ip.src"],
      interval: 3600,
      max: 1,
    });
    expect(rule.type).toEqual("RATE_LIMIT");
    expect(rule).toHaveProperty("mode", "LIVE");
  });

  test("can specify interval as a string duration", async () => {
    const options = {
      interval: "60s",
      max: 1,
    };

    const rules = slidingWindow(options);
    expect(rules).toHaveLength(1);
    expect(rules[0].type).toEqual("RATE_LIMIT");
    expect(rules[0]).toHaveProperty("interval", 60);
    expect(rules[0]).toHaveProperty("max", 1);
  });

  test("can specify interval as an integer duration", async () => {
    const options = {
      interval: 60,
      max: 1,
    };

    const rules = slidingWindow(options);
    expect(rules).toHaveLength(1);
    expect(rules[0].type).toEqual("RATE_LIMIT");
    expect(rules[0]).toHaveProperty("interval", 60);
    expect(rules[0]).toHaveProperty("max", 1);
  });

  test("can specify user-defined characteristics which are reflected in required props", async () => {
    const rules = slidingWindow({
      characteristics: ["userId"],
      interval: "1h",
      max: 1,
    });
    type Test = Assert<
      RequiredProps<typeof rules, { userId: string | number | boolean }>
    >;
  });

  test("well-known characteristics don't affect the required props", async () => {
    const rules = slidingWindow({
      characteristics: [
        "ip.src",
        "http.host",
        "http.method",
        "http.request.uri.path",
        `http.request.headers["abc"]`,
        `http.request.cookie["xyz"]`,
        `http.request.uri.args["foobar"]`,
      ],
      interval: "1h",
      max: 1,
    });
    type Test = Assert<RequiredProps<typeof rules, {}>>;
  });

  test("produces a rules based on single `limit` specified", async () => {
    const options = {
      match: "/test",
      characteristics: ["ip.src"],
      interval: 3600,
      max: 1,
    };

    const rules = slidingWindow(options);
    expect(rules).toHaveLength(1);
    expect(rules[0].type).toEqual("RATE_LIMIT");
    expect(rules[0]).toHaveProperty("mode", "DRY_RUN");
    expect(rules[0]).toHaveProperty("match", "/test");
    expect(rules[0]).toHaveProperty("characteristics", ["ip.src"]);
    expect(rules[0]).toHaveProperty("algorithm", "SLIDING_WINDOW");
    expect(rules[0]).toHaveProperty("interval", 3600);
    expect(rules[0]).toHaveProperty("max", 1);
  });

  test("produces a multiple rules based on multiple `limit` specified", async () => {
    const options = [
      {
        match: "/test",
        characteristics: ["ip.src"],
        interval: 3600,
        max: 1,
      },
      {
        match: "/test-double",
        characteristics: ["ip.src"],
        interval: 7200,
        max: 2,
      },
    ];

    const rules = slidingWindow(...options);
    expect(rules).toHaveLength(2);
    expect(rules).toEqual([
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: "/test",
        characteristics: ["ip.src"],
        algorithm: "SLIDING_WINDOW",
        interval: 3600,
        max: 1,
      }),
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: "/test-double",
        characteristics: ["ip.src"],
        algorithm: "SLIDING_WINDOW",
        interval: 7200,
        max: 2,
      }),
    ]);
  });

  test("does not default `match` and `characteristics` if not specified in single `limit`", async () => {
    const options = {
      interval: 3600,
      max: 1,
    };

    const [rule] = slidingWindow(options);
    expect(rule.type).toEqual("RATE_LIMIT");
    expect(rule).toHaveProperty("match", undefined);
    expect(rule).toHaveProperty("characteristics", undefined);
  });

  test("does not default `match` or `characteristics` if not specified in array `limit`", async () => {
    const options = [
      {
        interval: 3600,
        max: 1,
      },
      {
        interval: 7200,
        max: 2,
      },
    ];

    const rules = slidingWindow(...options);
    expect(rules).toEqual([
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: undefined,
        characteristics: undefined,
        algorithm: "SLIDING_WINDOW",
        interval: 3600,
        max: 1,
      }),
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: undefined,
        characteristics: undefined,
        algorithm: "SLIDING_WINDOW",
        interval: 7200,
        max: 2,
      }),
    ]);
  });
});

// The `rateLimit` primitive just proxies to `fixedWindow` and is available for
// backwards compatibility.
// TODO: Remove these tests once `rateLimit` is removed
describe("Primitive > rateLimit", () => {
  test("provides no rules if no `options` specified", () => {
    const rules = rateLimit();
    expect(rules).toHaveLength(0);
  });

  test("sets mode as `DRY_RUN` if not 'LIVE' or 'DRY_RUN'", async () => {
    const [rule] = rateLimit({
      // @ts-expect-error
      mode: "INVALID",
      match: "/test",
      characteristics: ["ip.src"],
      window: "1h",
      max: 1,
    });
    expect(rule.type).toEqual("RATE_LIMIT");
    expect(rule).toHaveProperty("mode", "DRY_RUN");
  });

  test("sets mode as `LIVE` if specified", async () => {
    const [rule] = rateLimit({
      mode: "LIVE",
      match: "/test",
      characteristics: ["ip.src"],
      window: "1h",
      max: 1,
    });
    expect(rule.type).toEqual("RATE_LIMIT");
    expect(rule).toHaveProperty("mode", "LIVE");
  });

  test("produces a rules based on single `limit` specified", async () => {
    const options = {
      match: "/test",
      characteristics: ["ip.src"],
      window: "1h",
      max: 1,
    };

    const rules = rateLimit(options);
    expect(rules).toHaveLength(1);
    expect(rules[0].type).toEqual("RATE_LIMIT");
    expect(rules[0]).toHaveProperty("mode", "DRY_RUN");
    expect(rules[0]).toHaveProperty("match", "/test");
    expect(rules[0]).toHaveProperty("characteristics", ["ip.src"]);
    expect(rules[0]).toHaveProperty("algorithm", "FIXED_WINDOW");
    expect(rules[0]).toHaveProperty("window", 3600);
    expect(rules[0]).toHaveProperty("max", 1);
  });

  test("produces a multiple rules based on multiple `limit` specified", async () => {
    const options = [
      {
        match: "/test",
        characteristics: ["ip.src"],
        window: "1h",
        max: 1,
      },
      {
        match: "/test-double",
        characteristics: ["ip.src"],
        window: "2h",
        max: 2,
      },
    ];

    const rules = rateLimit(...options);
    expect(rules).toHaveLength(2);
    expect(rules).toEqual([
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: "/test",
        characteristics: ["ip.src"],
        algorithm: "FIXED_WINDOW",
        window: 3600,
        max: 1,
      }),
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: "/test-double",
        characteristics: ["ip.src"],
        algorithm: "FIXED_WINDOW",
        window: 7200,
        max: 2,
      }),
    ]);
  });

  test("does not default `match` and `characteristics` if not specified in single `limit`", async () => {
    const options = {
      window: "1h",
      max: 1,
    };

    const [rule] = rateLimit(options);
    expect(rule.type).toEqual("RATE_LIMIT");
    expect(rule).toHaveProperty("match", undefined);
    expect(rule).toHaveProperty("characteristics", undefined);
  });

  test("does not default `match` or `characteristics` if not specified in array `limit`", async () => {
    const options = [
      {
        window: "1h",
        max: 1,
      },
      {
        window: "2h",
        max: 2,
      },
    ];

    const rules = rateLimit(...options);
    expect(rules).toEqual([
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: undefined,
        characteristics: undefined,
        algorithm: "FIXED_WINDOW",
        window: 3600,
        max: 1,
      }),
      expect.objectContaining({
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        match: undefined,
        characteristics: undefined,
        algorithm: "FIXED_WINDOW",
        window: 7200,
        max: 2,
      }),
    ]);
  });
});

describe("Primitive > validateEmail", () => {
  test("provides a default rule with no options specified", async () => {
    const [rule] = validateEmail();
    expect(rule.type).toEqual("EMAIL");
    expect(rule).toHaveProperty("mode", "DRY_RUN");
    expect(rule).toHaveProperty("block", []);
    expect(rule).toHaveProperty("requireTopLevelDomain", true);
    expect(rule).toHaveProperty("allowDomainLiteral", false);
    assertIsLocalRule(rule);
  });

  test("sets mode as 'DRY_RUN' if not 'LIVE' or 'DRY_RUN'", async () => {
    const [rule] = validateEmail({
      // @ts-expect-error
      mode: "INVALID",
    });
    expect(rule.type).toEqual("EMAIL");
    expect(rule).toHaveProperty("mode", "DRY_RUN");
  });

  test("allows specifying EmailTypes to block", async () => {
    const options = {
      block: [
        ArcjetEmailType.DISPOSABLE,
        ArcjetEmailType.FREE,
        ArcjetEmailType.NO_GRAVATAR,
        ArcjetEmailType.NO_MX_RECORDS,
        ArcjetEmailType.INVALID,
      ],
    };

    const [rule] = validateEmail(options);
    expect(rule.type).toEqual("EMAIL");
    expect(rule).toHaveProperty("block", [
      "DISPOSABLE",
      "FREE",
      "NO_GRAVATAR",
      "NO_MX_RECORDS",
      "INVALID",
    ]);
  });

  test("validates that email is defined", () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      log: new Logger(),
    };
    const details = {
      email: "abc@example.com",
    };

    const [rule] = validateEmail();
    expect(rule.type).toEqual("EMAIL");
    assertIsLocalRule(rule);
    expect(() => {
      const _ = rule.validate(context, details);
    }).not.toThrow();
  });

  test("throws via `validate()` if email is undefined", () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      log: new Logger(),
    };
    const details = {
      email: undefined,
    };

    const [rule] = validateEmail();
    expect(rule.type).toEqual("EMAIL");
    assertIsLocalRule(rule);
    expect(() => {
      const _ = rule.validate(context, details);
    }).toThrow();
  });

  test("allows a valid email", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      extra: {},
      email: "foobarbaz@example.com",
    };

    const [rule] = validateEmail();
    expect(rule.type).toEqual("EMAIL");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "ALLOW",
      reason: new ArcjetEmailReason({
        emailTypes: [],
      }),
    });
  });

  test("denies email with no domain segment", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      extra: {},
      email: "foobarbaz",
    };

    const [rule] = validateEmail();
    expect(rule.type).toEqual("EMAIL");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetEmailReason({
        emailTypes: ["INVALID"],
      }),
    });
  });

  test("denies email with no TLD", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      extra: {},
      email: "foobarbaz@localhost",
    };

    const [rule] = validateEmail();
    expect(rule.type).toEqual("EMAIL");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetEmailReason({
        emailTypes: ["INVALID"],
      }),
    });
  });

  test("denies email with no TLD even if some options are specified", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      extra: {},
      email: "foobarbaz@localhost",
    };

    const [rule] = validateEmail({
      block: [],
    });
    expect(rule.type).toEqual("EMAIL");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetEmailReason({
        emailTypes: ["INVALID"],
      }),
    });
  });

  test("denies email with empty name segment", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      extra: {},
      email: "@example.com",
    };

    const [rule] = validateEmail();
    expect(rule.type).toEqual("EMAIL");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetEmailReason({
        emailTypes: ["INVALID"],
      }),
    });
  });

  test("denies email with domain literal", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      extra: {},
      email: "foobarbaz@[127.0.0.1]",
    };

    const [rule] = validateEmail();
    expect(rule.type).toEqual("EMAIL");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "DENY",
      reason: new ArcjetEmailReason({
        emailTypes: ["INVALID"],
      }),
    });
  });

  test("can be configured to allow no TLD", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      extra: {},
      email: "foobarbaz@localhost",
    };

    const [rule] = validateEmail({
      requireTopLevelDomain: false,
    });
    expect(rule.type).toEqual("EMAIL");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "ALLOW",
      reason: new ArcjetEmailReason({
        emailTypes: [],
      }),
    });
  });

  test("can be configured to allow domain literals", async () => {
    const context = {
      key: "test-key",
      fingerprint: "test-fingerprint",
      log: new Logger(),
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers(),
      extra: {},
      email: "foobarbaz@[127.0.0.1]",
    };

    const [rule] = validateEmail({
      allowDomainLiteral: true,
    });
    expect(rule.type).toEqual("EMAIL");
    assertIsLocalRule(rule);
    const result = await rule.protect(context, details);
    expect(result).toMatchObject({
      state: "RUN",
      conclusion: "ALLOW",
      reason: new ArcjetEmailReason({
        emailTypes: [],
      }),
    });
  });
});

describe("Products > protectSignup", () => {
  test("allows configuration of rateLimit, bot, and email", () => {
    const rules = protectSignup({
      rateLimit: {
        mode: ArcjetMode.DRY_RUN,
        match: "/test",
        characteristics: ["ip.src"],
        interval: 60 /* minutes */ * 60 /* seconds */,
        max: 1,
      },
      bots: {
        mode: ArcjetMode.DRY_RUN,
      },
      email: {
        mode: ArcjetMode.LIVE,
      },
    });
    expect(rules.length).toEqual(3);
  });

  test("allows configuration of multiple rate limit rules with an array of options", () => {
    const rules = protectSignup({
      rateLimit: [
        {
          mode: ArcjetMode.DRY_RUN,
          match: "/test",
          characteristics: ["ip.src"],
          interval: 60 /* minutes */ * 60 /* seconds */,
          max: 1,
        },
        {
          match: "/test",
          characteristics: ["ip.src"],
          interval: 2 /* hours */ * 60 /* minutes */ * 60 /* seconds */,
          max: 2,
        },
      ],
    });
    expect(rules.length).toEqual(4);
  });

  test("allows configuration of multiple bot rules with an array of options", () => {
    const rules = protectSignup({
      bots: [
        {
          mode: "DRY_RUN",
        },
        {
          mode: "LIVE",
        },
      ],
    });
    expect(rules.length).toEqual(3);
  });

  test("allows configuration of multiple email rules with an array of options", () => {
    const rules = protectSignup({
      email: [
        {
          mode: "DRY_RUN",
        },
        {
          mode: "LIVE",
        },
      ],
    });
    expect(rules.length).toEqual(3);
  });
});

describe("SDK", () => {
  function testRuleLocalAllowed(): ArcjetLocalRule {
    return {
      mode: ArcjetMode.LIVE,
      type: "TEST_RULE_LOCAL_ALLOWED",
      priority: 1,
      validate: jest.fn(),
      protect: jest.fn(
        async () =>
          new ArcjetRuleResult({
            ttl: 0,
            state: "RUN",
            conclusion: "ALLOW",
            reason: new ArcjetTestReason(),
          }),
      ),
    };
  }
  function testRuleLocalDenied(): ArcjetLocalRule {
    return {
      mode: ArcjetMode.LIVE,
      type: "TEST_RULE_LOCAL_DENIED",
      priority: 1,
      validate: jest.fn(),
      protect: jest.fn(
        async () =>
          new ArcjetRuleResult({
            ttl: 5000,
            state: "RUN",
            conclusion: "DENY",
            reason: new ArcjetTestReason(),
          }),
      ),
    };
  }

  function testRuleRemote(): ArcjetRule {
    return {
      mode: "LIVE",
      type: "TEST_RULE_REMOTE",
      priority: 1,
    };
  }

  function testRuleMultiple(): ArcjetRule[] {
    return [
      { mode: "LIVE", type: "TEST_RULE_MULTIPLE", priority: 1 },
      { mode: "LIVE", type: "TEST_RULE_MULTIPLE", priority: 1 },
      { mode: "LIVE", type: "TEST_RULE_MULTIPLE", priority: 1 },
    ];
  }

  function testRuleInvalidType(): ArcjetRule {
    return {
      mode: ArcjetMode.LIVE,
      type: "TEST_RULE_INVALID_TYPE",
      priority: 1,
    };
  }

  function testRuleLocalThrow(): ArcjetLocalRule {
    return {
      mode: ArcjetMode.LIVE,
      type: "TEST_RULE_LOCAL_THROW",
      priority: 1,
      validate: jest.fn(),
      protect: jest.fn(async () => {
        throw new Error("Local rule protect failed");
      }),
    };
  }

  function testRuleLocalDryRun(): ArcjetLocalRule {
    return {
      mode: ArcjetMode.DRY_RUN,
      type: "TEST_RULE_LOCAL_DRY_RUN",
      priority: 1,
      validate: jest.fn(),
      protect: jest.fn(async () => {
        return new ArcjetRuleResult({
          ttl: 0,
          state: "RUN",
          conclusion: "DENY",
          reason: new ArcjetTestReason(),
        });
      }),
    };
  }

  test("creates a new Arcjet SDK with no rules", () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const aj = arcjet({
      key: "test-key",
      rules: [],
      client,
    });
    expect(aj).toHaveProperty("protect");
    expect(typeof aj.protect).toEqual("function");
  });

  test("provides the runtime", () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const aj = arcjet({
      key: "test-key",
      rules: [],
      client,
    });

    jest.replaceProperty(process, "env", { NEXT_RUNTIME: "edge" });
    expect(aj.runtime).toEqual(Runtime.Edge);
    jest.replaceProperty(process, "env", { VERCEL: "1" });
    expect(aj.runtime).toEqual(Runtime.Node_NoWASM);

    jest.replaceProperty(process, "env", { ARCJET_RUNTIME: "node" });
    expect(aj.runtime).toEqual(Runtime.Node);
    jest.replaceProperty(process, "env", { ARCJET_RUNTIME: "node_nowasm" });
    expect(aj.runtime).toEqual(Runtime.Node_NoWASM);
    jest.replaceProperty(process, "env", { ARCJET_RUNTIME: "edge" });
    expect(aj.runtime).toEqual(Runtime.Edge);
    jest.replaceProperty(process, "env", { ARCJET_RUNTIME: "INVALID" });
    expect(() => {
      const _ = aj.runtime;
    }).toThrow();
  });

  test("creates a new Arcjet SDK with only local rules", () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const aj = arcjet({
      key: "test-key",
      rules: [[testRuleLocalAllowed(), testRuleLocalDenied()]],
      client,
    });
    expect(aj).toHaveProperty("protect");
    expect(typeof aj.protect).toEqual("function");
  });

  test("creates a new Arcjet SDK with only remote rules", () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const aj = arcjet({
      key: "test-key",
      rules: [[testRuleRemote()]],
      client,
    });
    expect(aj).toHaveProperty("protect");
    expect(typeof aj.protect).toEqual("function");
  });

  test("creates a new Arcjet SDK with both local and remote rules", () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const aj = arcjet({
      key: "test-key",
      rules: [
        [testRuleLocalAllowed(), testRuleLocalDenied(), testRuleRemote()],
      ],
      client,
    });
    expect(aj).toHaveProperty("protect");
    expect(typeof aj.protect).toEqual("function");
  });

  // TODO(#207): Remove this once we default the client in the main SDK
  test("throws if no client is specified", () => {
    expect(() => {
      const aj = arcjet({
        key: "test-key",
        rules: [],
      });
    }).toThrow();
  });

  test("calls each local rule until a DENY decision is encountered", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };
    const allowed = testRuleLocalAllowed();
    const denied = testRuleLocalDenied();

    const aj = arcjet({
      key: "test-key",
      rules: [[allowed, denied]],
      client,
    });

    const decision = await aj.protect(details);
    expect(decision.conclusion).toEqual("DENY");

    expect(allowed.validate).toHaveBeenCalledTimes(1);
    expect(allowed.protect).toHaveBeenCalledTimes(1);
    expect(denied.validate).toHaveBeenCalledTimes(1);
    expect(denied.protect).toHaveBeenCalledTimes(1);
  });

  test("works with an empty details object", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const details = {};

    const aj = arcjet({
      key: "test-key",
      rules: [],
      client,
    });

    const decision = await aj.protect(details);
    expect(decision.conclusion).toEqual("ALLOW");
  });

  test("does not crash with no details object", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const aj = arcjet({
      key: "test-key",
      rules: [],
      client,
    });

    // @ts-expect-error
    const decision = await aj.protect();
    expect(decision.conclusion).toEqual("ALLOW");
  });

  test("returns an ERROR decision when more than 10 rules are generated", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const details = {};

    const rules: ArcjetRule[][] = [];
    // We only iterate 4 times because `testRuleMultiple` generates 3 rules
    for (let idx = 0; idx < 4; idx++) {
      rules.push(testRuleMultiple());
    }

    const aj = arcjet({
      key: "test-key",
      rules: rules,
      client,
    });

    const decision = await aj.protect(details);
    expect(decision.conclusion).toEqual("ERROR");
  });

  test("won't run a later local rule if a DENY decision is encountered", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };
    const allowed = testRuleLocalAllowed();
    const denied = testRuleLocalDenied();

    const aj = arcjet({
      key: "test-key",
      rules: [[denied, allowed]],
      client,
    });

    const decision = await aj.protect(details);
    expect(decision.conclusion).toEqual("DENY");

    expect(denied.validate).toHaveBeenCalledTimes(1);
    expect(denied.protect).toHaveBeenCalledTimes(1);
    expect(allowed.validate).toHaveBeenCalledTimes(0);
    expect(allowed.protect).toHaveBeenCalledTimes(0);
  });

  test("does not call `client.report()` if the local decision is ALLOW", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetErrorDecision({
          ttl: 0,
          reason: new ArcjetErrorReason("This decision not under test"),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c",
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };
    const allowed = testRuleLocalAllowed();

    const aj = arcjet({
      key,
      rules: [[allowed]],
      client,
    });

    const _ = await aj.protect(details);
    expect(client.report).toHaveBeenCalledTimes(0);
    expect(client.decide).toHaveBeenCalledTimes(1);
    // TODO: Validate correct `ruleResults` are sent with `decide` when available
  });

  test("calls `client.decide()` if the local decision is ALLOW", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetErrorDecision({
          ttl: 0,
          reason: new ArcjetErrorReason("This decision not under test"),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c",
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };
    const rule = testRuleLocalAllowed();

    const aj = arcjet({
      key,
      rules: [[rule]],
      client,
    });

    const decision = await aj.protect(details);
    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.decide).toHaveBeenCalledWith(
      expect.objectContaining(context),
      expect.objectContaining(details),
      [rule],
    );
  });

  test("calls `client.report()` if the local decision is DENY", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetErrorDecision({
          ttl: 0,
          reason: new ArcjetErrorReason("This decision not under test"),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c",
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };
    const rule = testRuleLocalDenied();

    const aj = arcjet({
      key,
      rules: [[rule]],
      client,
    });

    const _ = await aj.protect(details);
    expect(client.report).toHaveBeenCalledTimes(1);
    expect(client.report).toHaveBeenCalledWith(
      expect.objectContaining(context),
      expect.objectContaining(details),
      expect.objectContaining({
        conclusion: "DENY",
      }),
      [rule],
    );
  });

  test("does not call `client.decide()` if the local decision is DENY", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetErrorDecision({
          ttl: 0,
          reason: new ArcjetErrorReason("This decision not under test"),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const key = "test-key";
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "curl/8.1.2"]]),
      "extra-test": "extra-test-value",
    };
    const denied = testRuleLocalDenied();

    const aj = arcjet({
      key,
      rules: [[denied]],
      client,
    });

    const _ = await aj.protect(details);
    expect(client.decide).toHaveBeenCalledTimes(0);
  });

  test("calls `client.decide()` even with no rules", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c",
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
    };

    const aj = arcjet({
      key,
      rules: [],
      client,
    });

    const _ = await aj.protect(details);

    expect(client.report).toHaveBeenCalledTimes(0);
    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.decide).toHaveBeenCalledWith(
      expect.objectContaining(context),
      expect.objectContaining(details),
      [],
    );
  });

  test("caches a DENY decision locally and reports when a cached decision is used", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetDenyDecision({
          ttl: 5000,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const key = "test-key";
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
    };

    const aj = arcjet({
      key,
      rules: [],
      client,
    });

    const decision = await aj.protect(details);

    expect(decision.isErrored()).toBe(false);

    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.report).toHaveBeenCalledTimes(0);

    expect(decision.conclusion).toEqual("DENY");

    const decision2 = await aj.protect(details);

    expect(decision2.isErrored()).toBe(false);
    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.report).toHaveBeenCalledTimes(1);

    expect(decision2.conclusion).toEqual("DENY");
  });

  test("does not throw if unknown rule type is passed", () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    expect(() => {
      const aj = arcjet({
        key: "test-key",
        rules: [[testRuleInvalidType()]],
        client,
      });
    }).not.toThrow("Unknown Rule type");
  });

  test("does not call `client.report()` if a local rule throws", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c",
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
    };

    const aj = arcjet({
      key,
      rules: [[testRuleLocalThrow()]],
      client,
    });

    const _ = await aj.protect(details);

    expect(client.report).toHaveBeenCalledTimes(0);
    expect(client.decide).toHaveBeenCalledTimes(1);
    // TODO: Validate correct `ruleResults` are sent with `decide` when available
  });

  test("correctly logs an error message if a local rule throws a string", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const key = "test-key";
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
    };

    let errorLogSpy;

    function testRuleLocalThrowString(): ArcjetLocalRule {
      return {
        mode: ArcjetMode.LIVE,
        type: "TEST_RULE_LOCAL_THROW_STRING",
        priority: 1,
        validate: jest.fn(),
        async protect(context, req) {
          errorLogSpy = jest.spyOn(context.log, "error");
          throw "Local rule protect failed";
        },
      };
    }

    const aj = arcjet({
      key,
      rules: [[testRuleLocalThrowString()]],
      client,
    });

    const _ = await aj.protect(details);

    expect(errorLogSpy).toHaveBeenCalledTimes(1);
    expect(errorLogSpy).toHaveBeenCalledWith(
      "Failure running rule: %s due to %s",
      "TEST_RULE_LOCAL_THROW_STRING",
      "Local rule protect failed",
    );
  });

  test("correctly logs an error message if a local rule throws a non-error", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const key = "test-key";
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
    };

    let errorLogSpy;

    function testRuleLocalThrowNull(): ArcjetLocalRule {
      return {
        mode: ArcjetMode.LIVE,
        type: "TEST_RULE_LOCAL_THROW_NULL",
        priority: 1,
        validate: jest.fn(),
        async protect(context, req) {
          errorLogSpy = jest.spyOn(context.log, "error");
          throw null;
        },
      };
    }

    const aj = arcjet({
      key,
      rules: [[testRuleLocalThrowNull()]],
      client,
    });

    const _ = await aj.protect(details);

    expect(errorLogSpy).toHaveBeenCalledTimes(1);
    expect(errorLogSpy).toHaveBeenCalledWith(
      "Failure running rule: %s due to %s",
      "TEST_RULE_LOCAL_THROW_NULL",
      "Unknown problem",
    );
  });

  test("does not return nor cache a deny decision if DENY decision in a dry run local rule", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const key = "test-key";
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
    };

    const aj = arcjet({
      key,
      rules: [[testRuleLocalDryRun()]],
      client,
    });

    const decision = await aj.protect(details);

    expect(decision.isDenied()).toBe(false);

    expect(client.decide).toBeCalledTimes(1);
    expect(client.report).toBeCalledTimes(1);

    const decision2 = await aj.protect(details);

    expect(decision2.isDenied()).toBe(false);

    expect(client.decide).toBeCalledTimes(2);
    expect(client.report).toBeCalledTimes(2);
  });

  test("processes a single rule from a REMOTE ArcjetRule", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c",
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
    };

    const rule = testRuleRemote();

    const aj = arcjet({
      key,
      rules: [[rule]],
      client,
    });

    const decision = await aj.protect(details);

    expect(decision.isErrored()).toBe(false);

    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.decide).toHaveBeenCalledWith(
      expect.objectContaining(context),
      expect.objectContaining(details),
      [rule],
    );
  });

  test("reports and returns an ERROR decision if a `client.decide()` fails", async () => {
    const client = {
      decide: jest.fn(async () => {
        throw new Error("Decide function failed");
      }),
      report: jest.fn(),
    };

    const key = "test-key";
    const context = {
      key,
      fingerprint:
        "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c",
    };
    const details = {
      ip: "172.100.1.1",
      method: "GET",
      protocol: "http",
      host: "example.com",
      path: "/",
      headers: new Headers([["User-Agent", "Mozilla/5.0"]]),
      "extra-test": "extra-test-value",
    };

    const aj = arcjet({
      key,
      rules: [],
      client,
    });

    const decision = await aj.protect(details);

    expect(decision.isErrored()).toBe(true);

    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.report).toHaveBeenCalledTimes(1);
    expect(client.report).toHaveBeenCalledWith(
      expect.objectContaining(context),
      expect.objectContaining(details),
      expect.objectContaining({
        conclusion: "ERROR",
      }),
      [],
    );
  });
});

describe("Arcjet: Env = Serverless Node runtime on Vercel", () => {
  beforeEach(() => {
    process.env["VERCEL"] = "1";
  });

  afterEach(() => {
    delete process.env["VERCEL"];
  });

  test("should create a new instance", () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    const aj = arcjet({ key: "test-key", rules: [], client });
    expect(aj).toHaveProperty("protect");
    expect(typeof aj.protect).toEqual("function");
  });

  test("should make a call to the Decide API", async () => {
    const client = {
      decide: jest.fn(async () => {
        return new ArcjetAllowDecision({
          ttl: 0,
          reason: new ArcjetTestReason(),
          results: [],
        });
      }),
      report: jest.fn(),
    };

    // Set call args
    const key = "test-key";
    const config = {
      mode: ArcjetMode.LIVE,
      match: "/test",
      characteristics: ["ip.src"],
      window: "1h",
      max: 1,
    };
    const fingerprint =
      "fp_1_ac8547705f1f45c5050f1424700dfa3f6f2f681b550ca4f3c19571585aea7a2c";
    const ip = "172.100.1.1";
    const method = "GET";
    const protocol = "http";
    const host = "example.com";
    const path = "/";
    const headers = new Headers();
    headers.append("User-Agent", "Mozilla/5.0");

    const aj = arcjet({
      key,
      rules: [rateLimit(config)],
      client,
    });
    const decision = await aj.protect({
      ip,
      method,
      protocol,
      host,
      path,
      headers,
      "extra-test": "extra-test-value",
    });

    // If this fails, check the console an error related to the args passed to
    // the mocked decide service method above.
    expect(decision).toBeDefined();

    // Make sure the methods were called
    expect(client.decide).toHaveBeenCalledTimes(1);
    expect(client.report).toHaveBeenCalledTimes(0);

    expect(decision.conclusion).toEqual("ALLOW");
  });
});
