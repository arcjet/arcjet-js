import assert from "node:assert/strict";
import test from "node:test";
import type { Cache } from "@arcjet/cache";
import { createRouterTransport } from "@connectrpc/connect";
import { DecideService } from "../proto/decide/v1alpha1/decide_connect.js";
import {
  Conclusion,
  DecideResponse,
  ReportResponse,
  Rule,
  SDKStack,
} from "../proto/decide/v1alpha1/decide_pb.js";
import { type ClientOptions, createClient } from "../client.js";
import type {
  ArcjetConclusion,
  ArcjetContext,
  ArcjetLogger,
  ArcjetRequestDetails,
} from "../index.js";
import {
  ArcjetAllowDecision,
  ArcjetChallengeDecision,
  ArcjetDecision,
  ArcjetDenyDecision,
  ArcjetErrorDecision,
  ArcjetErrorReason,
  ArcjetReason,
  ArcjetRuleResult,
} from "../index.js";

class ArcjetInvalidDecision extends ArcjetDecision {
  conclusion: ArcjetConclusion;
  reason: ArcjetReason;

  constructor() {
    super({ results: [], ttl: 0 });
    // @ts-expect-error: TODO(@wooorm-arcjet):
    // if it is intentional that people can extend decisions with such things as `INVALID`
    // decisions,
    // then we need to allow that in the types.
    this.conclusion = "INVALID";
    this.reason = new ArcjetReason();
  }
}

class TestCache implements Cache {
  async get(): Promise<[unknown, number]> {
    return [undefined, 0];
  }
  set() {}
}

/**
 * Arcjet logger that does nothing.
 */
const exampleLogger: ArcjetLogger = {
  debug() {},
  error() {},
  info() {},
  warn() {},
};

/**
 * Empty values for client options.
 */
const exampleClientOptions: ClientOptions = {
  baseUrl: "",
  sdkStack: "NODEJS",
  sdkVersion: "__ARCJET_SDK_VERSION__",
  timeout: 0,
  transport: createRouterTransport(() => {}),
};

/**
 * Empty values for context.
 */
const exampleContext: ArcjetContext = {
  characteristics: [],
  cache: new TestCache(),
  fingerprint: "b",
  getBody() {
    throw new Error("Not implemented");
  },
  key: "a",
  log: exampleLogger,
  runtime: "c",
};

/**
 * Empty values for details.
 */
const exampleDetails: Partial<ArcjetRequestDetails> = {
  extra: {},
  headers: new Headers([["User-Agent", "curl/8.1.2"]]),
  host: "example.com",
  ip: "172.100.1.1",
  method: "GET",
  path: "/",
  protocol: "http",
};

test("createClient", async (t) => {
  await t.test("should work", () => {
    const client = createClient(exampleClientOptions);

    assert.equal(typeof client.decide, "function");
    assert.equal(typeof client.report, "function");
  });

  await t.test("should allow overriding `timeout`", async () => {
    let calls = 0;

    const client = createClient({
      ...exampleClientOptions,
      timeout: 9876,
      transport: createRouterTransport(function ({ service }) {
        service(DecideService, {
          decide(_, handlerContext) {
            assert.equal(calls, 0);
            calls++;

            const ms = handlerContext.timeoutMs();
            // The code above takes about 1 or 2 ms off the timeout we pass.
            // Allow a very large number to prevent flakey tests.
            assert.ok(typeof ms === "number");
            assert.ok(ms > 9000);
            assert.ok(ms < 10000);
            return new DecideResponse();
          },
        });
      }),
    });

    await client.decide(exampleContext, exampleDetails, []);

    assert.equal(calls, 1);
  });

  await t.test(
    "should double the given `timeout` if there is an email rule",
    async () => {
      let calls = 0;

      const client = createClient({
        ...exampleClientOptions,
        timeout: 9876,
        transport: createRouterTransport(function ({ service }) {
          service(DecideService, {
            decide(_, handlerContext) {
              assert.equal(calls, 0);
              calls++;

              const ms = handlerContext.timeoutMs();
              // The code above takes about 1 or 2 ms off the timeout we pass.
              // Allow a very large number to prevent flakey tests.
              assert.ok(typeof ms === "number");
              assert.ok(ms > 18000);
              assert.ok(ms < 20000);
              return new DecideResponse();
            },
          });
        }),
      });

      await client.decide(exampleContext, exampleDetails, [
        {
          mode: "LIVE",
          priority: 1,
          protect() {
            assert.fail();
          },
          type: "EMAIL",
          validate() {},
          version: 0,
        },
      ]);

      assert.equal(calls, 1);
    },
  );

  await t.test("should allow overriding `sdkStack` (valid)", async () => {
    let calls = 0;

    const client = createClient({
      ...exampleClientOptions,
      transport: createRouterTransport(({ service }) => {
        service(DecideService, {
          decide(decideRequest) {
            assert.equal(calls, 0);
            calls++;

            assert.equal(decideRequest.sdkStack, SDKStack.SDK_STACK_NEXTJS);

            return new DecideResponse({
              decision: { conclusion: Conclusion.ALLOW },
            });
          },
        });
      }),
      sdkStack: "NEXTJS",
    });

    await client.decide(exampleContext, exampleDetails, []);

    assert.equal(calls, 1);
  });

  await t.test(
    "should allow overriding `sdkStack` (invalid, UNSPECIFIED)",
    async () => {
      let calls = 0;

      const client = createClient({
        ...exampleClientOptions,
        transport: createRouterTransport(({ service }) => {
          service(DecideService, {
            decide(decideRequest) {
              assert.equal(calls, 0);
              calls++;

              assert.equal(
                decideRequest.sdkStack,
                SDKStack.SDK_STACK_UNSPECIFIED,
              );

              return new DecideResponse({
                decision: { conclusion: Conclusion.ALLOW },
              });
            },
          });
        }),
        // @ts-expect-error
        sdkStack: "SOMETHING_INVALID",
      });

      await client.decide(exampleContext, exampleDetails, []);

      assert.equal(calls, 1);
    },
  );

  await t.test("should support rules", async () => {
    let calls = 0;

    const client = createClient({
      ...exampleClientOptions,
      transport: createRouterTransport(({ service }) => {
        service(DecideService, {
          decide(decideRequest) {
            assert.equal(calls, 0);
            calls++;

            assert.deepEqual(decideRequest.rules, [new Rule()]);

            return new DecideResponse({
              decision: { conclusion: Conclusion.ALLOW },
            });
          },
        });
      }),
    });

    await client.decide(exampleContext, exampleDetails, [
      {
        mode: "DRY_RUN",
        priority: 1,
        protect() {
          assert.fail();
        },
        type: "TEST_RULE",
        validate() {
          assert.fail();
        },
        version: 0,
      },
    ]);

    assert.equal(calls, 1);
  });

  await t.test("should support an `ALLOW` decision", async () => {
    const client = createClient({
      ...exampleClientOptions,
      transport: createRouterTransport(({ service }) => {
        service(DecideService, {
          decide() {
            return new DecideResponse({
              decision: { conclusion: Conclusion.ALLOW },
            });
          },
        });
      }),
    });

    const decision = await client.decide(exampleContext, exampleDetails, []);

    assert.equal(decision.isAllowed(), true);
  });

  await t.test("should support a `DENY` decision", async () => {
    const client = createClient({
      ...exampleClientOptions,
      transport: createRouterTransport(({ service }) => {
        service(DecideService, {
          decide() {
            return new DecideResponse({
              decision: { conclusion: Conclusion.DENY },
            });
          },
        });
      }),
    });

    const decision = await client.decide(exampleContext, exampleDetails, []);

    assert.equal(decision.isDenied(), true);
  });

  await t.test("should support a `CHALLENGE` decision", async () => {
    const client = createClient({
      ...exampleClientOptions,
      transport: createRouterTransport(({ service }) => {
        service(DecideService, {
          decide() {
            return new DecideResponse({
              decision: { conclusion: Conclusion.CHALLENGE },
            });
          },
        });
      }),
    });

    const decision = await client.decide(exampleContext, exampleDetails, []);

    assert.equal(decision.isChallenged(), true);
  });

  await t.test("should support an `ERROR` decision", async () => {
    const client = createClient({
      ...exampleClientOptions,
      transport: createRouterTransport(({ service }) => {
        service(DecideService, {
          decide() {
            return new DecideResponse({
              decision: { conclusion: Conclusion.ERROR },
            });
          },
        });
      }),
    });

    const decision = await client.decide(exampleContext, exampleDetails, []);

    assert.equal(decision.isErrored(), true);
    // @ts-expect-error: TODO(#4452): union, or allow `String(reason)`.
    assert.equal(decision.reason.message, "Unknown error occurred");
  });

  await t.test("should support an `ERROR` decision w/ message", async () => {
    const client = createClient({
      ...exampleClientOptions,
      transport: createRouterTransport(({ service }) => {
        service(DecideService, {
          decide() {
            return new DecideResponse({
              decision: {
                conclusion: Conclusion.ERROR,
                reason: {
                  reason: { case: "error", value: { message: "Boom!" } },
                },
              },
            });
          },
        });
      }),
    });

    const decision = await client.decide(exampleContext, exampleDetails, []);

    assert.equal(decision.isErrored(), true);
    // @ts-expect-error: TODO(#4452): union, or allow `String(reason)`.
    assert.equal(decision.reason.message, "Boom!");
  });

  await t.test("should support an `UNSPECIFIED` decision", async () => {
    const client = createClient({
      ...exampleClientOptions,
      transport: createRouterTransport(({ service }) => {
        service(DecideService, {
          decide() {
            return new DecideResponse({
              decision: { conclusion: Conclusion.UNSPECIFIED },
            });
          },
        });
      }),
    });

    const decision = await client.decide(exampleContext, exampleDetails, []);

    assert.equal(decision.isErrored(), true);
    assert.equal(decision.isAllowed(), true);
  });

  await t.test("should support `waitUntil` in a report context", async () => {
    return new Promise((resolve) => {
      let calls = 0;

      const client = createClient({
        ...exampleClientOptions,
        transport: createRouterTransport(({ service }) => {
          service(DecideService, {
            report() {
              return new ReportResponse();
            },
          });
        }),
      });

      client.report(
        {
          ...exampleContext,
          waitUntil(promise) {
            assert.equal(calls, 0);
            calls++;

            promise.then(() => {
              assert.equal(calls, 1);
              calls++;

              resolve(undefined);
            });
          },
        },
        exampleDetails,
        new ArcjetAllowDecision({
          reason: new ArcjetReason(),
          results: [],
          ttl: 0,
        }),
        [],
      );

      assert.equal(calls, 1);
    });
  });

  await t.test("should support a report w/ an allow decision", async () => {
    return new Promise((resolve, reject) => {
      let calls = 0;

      const client = createClient({
        ...exampleClientOptions,
        transport: createRouterTransport(({ service }) => {
          service(DecideService, {
            report(reportRequest) {
              try {
                assert.equal(calls, 0);
                calls++;

                assert.ok(typeof reportRequest.decision === "object");
                assert.equal(
                  reportRequest.decision.conclusion,
                  Conclusion.ALLOW,
                );
                setTimeout(resolve);
              } catch (error) {
                reject(error);
              }

              return new ReportResponse();
            },
          });
        }),
      });

      client.report(
        exampleContext,
        exampleDetails,
        new ArcjetAllowDecision({
          reason: new ArcjetReason(),
          results: [],
          ttl: 0,
        }),
        [],
      );

      assert.equal(calls, 0);
    });
  });

  await t.test("should support a report w/ a deny decision", async () => {
    return new Promise((resolve, reject) => {
      let calls = 0;

      const client = createClient({
        ...exampleClientOptions,
        transport: createRouterTransport(({ service }) => {
          service(DecideService, {
            report(reportRequest) {
              try {
                assert.equal(calls, 0);
                calls++;

                assert.ok(typeof reportRequest.decision === "object");
                assert.equal(
                  reportRequest.decision.conclusion,
                  Conclusion.DENY,
                );

                setTimeout(resolve);
              } catch (error) {
                reject(error);
              }

              return new ReportResponse();
            },
          });
        }),
      });

      client.report(
        exampleContext,
        exampleDetails,
        new ArcjetDenyDecision({
          reason: new ArcjetReason(),
          results: [],
          ttl: 0,
        }),
        [],
      );

      assert.equal(calls, 0);
    });
  });

  await t.test("should support a report w/ an error decision", async () => {
    return new Promise((resolve, reject) => {
      let calls = 0;

      const client = createClient({
        ...exampleClientOptions,
        transport: createRouterTransport(({ service }) => {
          service(DecideService, {
            report(reportRequest) {
              try {
                assert.equal(calls, 0);
                calls++;

                assert.ok(typeof reportRequest.decision === "object");
                assert.equal(
                  reportRequest.decision.conclusion,
                  Conclusion.ERROR,
                );

                setTimeout(resolve);
              } catch (error) {
                reject(error);
              }

              return new ReportResponse();
            },
          });
        }),
      });

      client.report(
        exampleContext,
        exampleDetails,
        new ArcjetErrorDecision({
          reason: new ArcjetErrorReason("Failure"),
          results: [],
          ttl: 0,
        }),
        [],
      );

      assert.equal(calls, 0);
    });
  });

  await t.test("should support a report w/ an error decision", async () => {
    return new Promise((resolve, reject) => {
      let calls = 0;

      const client = createClient({
        ...exampleClientOptions,
        transport: createRouterTransport(({ service }) => {
          service(DecideService, {
            report(reportRequest) {
              try {
                assert.equal(calls, 0);
                calls++;

                assert.ok(typeof reportRequest.decision === "object");
                assert.equal(
                  reportRequest.decision.conclusion,
                  Conclusion.CHALLENGE,
                );

                setTimeout(resolve);
              } catch (error) {
                reject(error);
              }

              return new ReportResponse();
            },
          });
        }),
      });

      client.report(
        exampleContext,
        exampleDetails,
        new ArcjetChallengeDecision({
          reason: new ArcjetReason(),
          results: [],
          ttl: 0,
        }),
        [],
      );

      assert.equal(calls, 0);
    });
  });

  await t.test(
    "should support a report w/ an unspecified decision",
    async () => {
      return new Promise((resolve, reject) => {
        let calls = 0;

        const client = createClient({
          ...exampleClientOptions,
          transport: createRouterTransport(({ service }) => {
            service(DecideService, {
              report(reportRequest) {
                try {
                  assert.equal(calls, 0);
                  calls++;

                  assert.ok(typeof reportRequest.decision === "object");
                  assert.equal(
                    reportRequest.decision.conclusion,
                    Conclusion.UNSPECIFIED,
                  );

                  setTimeout(resolve);
                } catch (error) {
                  reject(error);
                }

                return new ReportResponse();
              },
            });
          }),
        });

        client.report(
          exampleContext,
          exampleDetails,
          new ArcjetInvalidDecision(),
          [],
        );

        assert.equal(calls, 0);
      });
    },
  );

  await t.test("should support a report w/ a rule", async () => {
    return new Promise((resolve, reject) => {
      let calls = 0;

      const client = createClient({
        ...exampleClientOptions,
        transport: createRouterTransport(({ service }) => {
          service(DecideService, {
            report(reportRequest) {
              try {
                assert.equal(calls, 0);
                calls++;

                assert.deepEqual(reportRequest.rules, [new Rule()]);
                assert.ok(typeof reportRequest.decision === "object");
                assert.equal(
                  reportRequest.decision.conclusion,
                  Conclusion.DENY,
                );

                setTimeout(resolve);
              } catch (error) {
                reject(error);
              }

              return new ReportResponse();
            },
          });
        }),
      });

      client.report(
        exampleContext,
        exampleDetails,
        new ArcjetDenyDecision({
          reason: new ArcjetReason(),
          results: [],
          ttl: 0,
        }),
        [
          {
            mode: "LIVE",
            priority: 1,
            protect() {
              assert.fail();
            },
            type: "rule",
            validate() {
              assert.fail();
            },
            version: 0,
          },
        ],
      );

      assert.equal(calls, 0);
    });
  });

  await t.test(
    "should call `info`, not `error`, `warn` on allow reports",
    async () => {
      return new Promise((resolve) => {
        let calls = 0;

        const client = createClient(exampleClientOptions);

        client.report(
          {
            ...exampleContext,
            log: {
              ...exampleLogger,
              error() {
                assert.fail();
              },
              info() {
                assert.equal(calls, 0);
                calls++;

                resolve(undefined);
              },
              warn() {
                assert.fail();
              },
            },
          },
          exampleDetails,
          new ArcjetAllowDecision({
            reason: new ArcjetReason(),
            results: [],
            ttl: 0,
          }),
          [],
        );

        assert.equal(calls, 0);
      });
    },
  );

  await t.test("should decide with top-level `characteristics`", async () => {
    let calls = 0;

    const client = createClient({
      ...exampleClientOptions,
      transport: createRouterTransport(({ service }) => {
        service(DecideService, {
          decide(decideRequest) {
            assert.equal(calls, 0);
            calls++;

            assert.deepEqual(decideRequest.characteristics, ["src.ip"]);

            return new DecideResponse({
              decision: { conclusion: Conclusion.ALLOW },
            });
          },
        });
      }),
    });

    await client.decide(
      { ...exampleContext, characteristics: ["src.ip"] },
      exampleDetails,
      [],
    );

    assert.equal(calls, 1);
  });

  await t.test("should report with top-level `characteristics`", async () => {
    return new Promise((resolve, reject) => {
      let calls = 0;

      const client = createClient({
        ...exampleClientOptions,
        transport: createRouterTransport(({ service }) => {
          service(DecideService, {
            report(reportRequest) {
              try {
                assert.equal(calls, 0);
                calls++;

                assert.ok(reportRequest.characteristics);
                assert.deepEqual(reportRequest.characteristics, ["src.ip"]);

                setTimeout(resolve);
              } catch (error) {
                reject(error);
              }

              return new ReportResponse();
            },
          });
        }),
      });

      client.report(
        { ...exampleContext, characteristics: ["src.ip"] },
        exampleDetails,
        new ArcjetDenyDecision({
          reason: new ArcjetReason(),
          results: [
            new ArcjetRuleResult({
              conclusion: "DENY",
              fingerprint: "fingerprint",
              reason: new ArcjetReason(),
              ruleId: "rule",
              state: "RUN",
              ttl: 0,
            }),
          ],
          ttl: 0,
        }),
        [],
      );

      assert.equal(calls, 0);
    });
  });
});
