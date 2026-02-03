import assert from "node:assert/strict";
import test from "node:test";
import { MemoryCache } from "@arcjet/cache";
import type { Client } from "@arcjet/protocol/client.js";
import arcjet, {
  type ArcjetContext,
  type ArcjetRequest,
  ArcjetAllowDecision,
  ArcjetReason,
} from "../index.js";

const exampleKey = "ajkey_yourkey";

test("Fingerprint", async function (t) {
  await t.test("should fingerprint on `ip.src` by default", async function () {
    let fingerprint: unknown;
    const instance = arcjet({
      client: createLocalClient(),
      key: exampleKey,
      log: {
        ...console,
        debug($0, ...rest) {
          if ($0 === "fingerprint (%s): %s") {
            fingerprint = rest[1];
            return;
          }

          if (typeof $0 === "string" && $0.startsWith("LATENCY")) return;

          console.debug($0, ...rest);
        },
      },
      rules: [],
    });

    const _1 = await instance.protect(createContext(), {
      ...createFields(),
      ip: createFields().ip,
    });
    const baseline = fingerprint;
    const _2 = await instance.protect(createContext(), {
      ...createFields(),
      ip: createDifferentFields().ip,
    });
    const different = fingerprint;
    const _3 = await instance.protect(createContext(), {
      ...createDifferentFields(),
      ip: createFields().ip,
    });
    const sameButRestDifferent = fingerprint;

    assert.notEqual(baseline, different);
    assert.equal(baseline, sameButRestDifferent);

    assert.equal(
      baseline,
      "fp::2::10182843b9721ec9901b0b127e10705ae447f41391c1bdb153c9fec8d82bb875",
    );
    assert.equal(
      different,
      "fp::2::19d1bce17349311ec070a75204ff13ea1aa9ab903032d42a14f5ba2867de3a49",
    );
    assert.equal(
      sameButRestDifferent,
      "fp::2::10182843b9721ec9901b0b127e10705ae447f41391c1bdb153c9fec8d82bb875",
    );
  });

  type Tuple = [
    characteristics: Array<string>,
    field: string,
    value: unknown,
    other: unknown,
  ];
  const matrix: ReadonlyArray<Tuple> = [
    [["custom"], "custom", "a", "b"],
    [
      ['http.request.cookie["session-id"]'],
      "cookies",
      "session-id=a",
      "session-id=b",
    ],
    [
      ['http.request.headers["x-custom"]'],
      "headers",
      { "x-custom": "a" },
      { "x-custom": "b" },
    ],
    [["http.host"], "host", "example.com", "example.org"],
    [["http.method"], "method", "GET", "HEAD"],
    [["http.request.uri.path"], "path", "/a", "/b"],
    [['http.request.uri.args["q"]'], "query", "?q=1", "?q=2"],
    [["ip.src"], "ip", "1.1.1.1", "1.1.1.2"],
  ];

  for (const [characteristics, field, value, other] of matrix) {
    await t.test(
      "should fingerprint on `" + JSON.stringify(characteristics) + "`",
      async function () {
        let fingerprint: unknown;
        const instance = arcjet({
          client: createLocalClient(),
          key: exampleKey,
          log: {
            ...console,
            debug($0, ...rest) {
              if ($0 === "fingerprint (%s): %s") {
                fingerprint = rest[1];
                return;
              }

              if (typeof $0 === "string" && $0.startsWith("LATENCY")) return;

              console.debug($0, ...rest);
            },
          },
          rules: [],
        });

        const _1 = await instance.protect(
          { ...createContext(), characteristics },
          { ...createFields(), [field]: value },
        );
        const baseline = fingerprint;
        const _2 = await instance.protect(
          { ...createContext(), characteristics },
          { ...createFields(), [field]: other },
        );
        const different = fingerprint;
        const _3 = await instance.protect(
          { ...createContext(), characteristics },
          { ...createDifferentFields(), [field]: value },
        );
        const sameButRestDifferent = fingerprint;

        assert.notEqual(baseline, different);
        assert.equal(baseline, sameButRestDifferent);
      },
    );
  }
  await t.test(
    "should fingerprint on several characteristics",
    async function () {
      let fingerprint: unknown;
      const instance = arcjet({
        client: createLocalClient(),
        key: exampleKey,
        log: {
          ...console,
          debug($0, ...rest) {
            if ($0 === "fingerprint (%s): %s") {
              fingerprint = rest[1];
              return;
            }

            if (typeof $0 === "string" && $0.startsWith("LATENCY")) return;

            console.debug($0, ...rest);
          },
        },
        rules: [],
      });

      const characteristics = [
        "http.host",
        'http.request.cookie["session-id"]',
        "ip.src",
      ];
      const _1 = await instance.protect(
        { ...createContext(), characteristics },
        createFields(),
      );
      const one = fingerprint;
      const _2 = await instance.protect(
        { ...createContext(), characteristics },
        {
          ...createFields(),
          ip: createDifferentFields().ip,
        },
      );
      const two = fingerprint;
      const _3 = await instance.protect(
        { ...createContext(), characteristics },
        {
          ...createDifferentFields(),
          host: createFields().host,
        },
      );
      const three = fingerprint;
      const _4 = await instance.protect(
        { ...createContext(), characteristics },
        {
          ...createDifferentFields(),
          cookies: "session-id=123",
        },
      );
      const four = fingerprint;

      assert.notEqual(one, two);
      assert.notEqual(two, three);
      assert.notEqual(three, four);
    },
  );

  await t.test(
    "should error if a `cookie` characteristic is not found",
    async function () {
      let errorParameters: unknown;
      const instance = arcjet({
        client: createLocalClient(),
        key: exampleKey,
        log: {
          ...console,
          debug() {},
          error(...parameters) {
            errorParameters = parameters;
          },
        },
        rules: [],
      });

      const decision = await instance.protect(
        {
          ...createContext(),
          characteristics: ['http.request.cookie["missing"]'],
        },
        createFields(),
      );
      assert.equal(decision.conclusion, "ERROR");
      assert.deepEqual(errorParameters, [
        {
          error:
            "unable to generate fingerprint: error generating identifier - requested `cookie.missing` characteristic but the `cookie.missing` value was empty",
        },
        "Failed to build fingerprint. Please verify your Characteristics.",
      ]);
    },
  );

  await t.test(
    "should error if a `header` characteristic is not found",
    async function () {
      let errorParameters: unknown;
      const instance = arcjet({
        client: createLocalClient(),
        key: exampleKey,
        log: {
          ...console,
          debug() {},
          error(...parameters) {
            errorParameters = parameters;
          },
        },
        rules: [],
      });

      const decision = await instance.protect(
        {
          ...createContext(),
          characteristics: ['http.request.headers["missing"]'],
        },
        createFields(),
      );
      assert.equal(decision.conclusion, "ERROR");
      assert.deepEqual(errorParameters, [
        {
          error:
            "unable to generate fingerprint: error generating identifier - requested `header.missing` characteristic but the `header.missing` value was empty",
        },
        "Failed to build fingerprint. Please verify your Characteristics.",
      ]);
    },
  );

  await t.test(
    "should error if an `args` characteristic is not found",
    async function () {
      let errorParameters: unknown;
      const instance = arcjet({
        client: createLocalClient(),
        key: exampleKey,
        log: {
          ...console,
          debug() {},
          error(...parameters) {
            errorParameters = parameters;
          },
        },
        rules: [],
      });

      const decision = await instance.protect(
        { ...createContext(), characteristics: ['http.request.args["t"]'] },
        createFields(),
      );
      assert.equal(decision.conclusion, "ERROR");
      assert.deepEqual(errorParameters, [
        {
          error:
            'unable to generate fingerprint: error generating identifier - requested a user-defined `http.request.args["t"]` characteristic but the `http.request.args["t"]` value was empty',
        },
        "Failed to build fingerprint. Please verify your Characteristics.",
      ]);
    },
  );

  await t.test(
    "should error if a custom characteristic is not found",
    async function () {
      let errorParameters: unknown;
      const instance = arcjet({
        client: createLocalClient(),
        key: exampleKey,
        log: {
          ...console,
          debug() {},
          error(...parameters) {
            errorParameters = parameters;
          },
        },
        rules: [],
      });

      const decision = await instance.protect(
        { ...createContext(), characteristics: ["custom"] },
        createFields(),
      );
      assert.equal(decision.conclusion, "ERROR");
      assert.deepEqual(errorParameters, [
        {
          error:
            "unable to generate fingerprint: error generating identifier - requested a user-defined `custom` characteristic but the `custom` value was empty",
        },
        "Failed to build fingerprint. Please verify your Characteristics.",
      ]);
    },
  );
});

/**
 * Create empty values for context.
 *
 * @returns
 *   Context.
 */
function createContext(): ArcjetContext {
  return {
    cache: new MemoryCache(),
    characteristics: [],
    fingerprint: "a",
    getBody() {
      throw new Error("Not implemented");
    },
    key: "b",
    log: console,
    runtime: "c",
  };
}

/**
 * Create an empty client to not hit the internet but always decide as allow
 * and never report.
 *
 * @returns
 *   Client.
 */
function createLocalClient(): Client {
  return {
    async decide() {
      return new ArcjetAllowDecision({
        reason: new ArcjetReason(),
        results: [],
        ttl: 0,
      });
    },
    report() {},
  };
}

/**
 * Create request details, completely different from
 * {@linkcode createDifferentFields}.
 *
 * @returns
 *   Details.
 */
function createFields(): ArcjetRequest<{}> {
  return {
    cookies: "session-id=a",
    headers: { "user-agent": "b" },
    host: "example.com",
    ip: "1.1.1.1",
    method: "GET",
    path: "/c",
    protocol: "http:",
    query: "?q=d",
  };
}

/**
 * Create request details, completely different from
 * {@linkcode createFields}.
 *
 * @returns
 *   Details.
 */
function createDifferentFields(): ArcjetRequest<{}> {
  return {
    cookies: "session-id=1",
    headers: { "user-agent": "a" },
    host: "example.org",
    ip: "1.1.1.2",
    method: "HEAD",
    path: "/b",
    protocol: "https:",
    query: "?q=c",
  };
}
