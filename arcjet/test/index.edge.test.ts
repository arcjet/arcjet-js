/**
 * @jest-environment @edge-runtime/jest-environment
 */
import {
  describe,
  expect,
  test,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";

import arcjet, {
  fixedWindow,
  tokenBucket,
  protectSignup,
  type Primitive,
  ArcjetReason,
  ArcjetAllowDecision,
} from "../index";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllTimers();
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

class ArcjetTestReason extends ArcjetReason {}

const log = {
  time: jest.fn(),
  timeEnd: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe("Arcjet: Env = Edge runtime", () => {
  test("should create a new instance", async () => {
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

    function foobarbaz(): Primitive<{ abc: number }> {
      return [];
    }

    const aj = arcjet({
      key: "1234",
      rules: [
        // Test rules
        // foobarbaz(),
        tokenBucket(
          {
            characteristics: [
              "ip.src",
              "http.host",
              "http.method",
              "http.request.uri.path",
              `http.request.headers["abc"]`,
              `http.request.cookie["xyz"]`,
              `http.request.uri.args["foobar"]`,
            ],
            refillRate: 1,
            interval: 1,
            capacity: 1,
          },
          {
            characteristics: ["userId"],
            refillRate: 1,
            interval: 1,
            capacity: 1,
          },
        ),
        fixedWindow({
          max: 1,
          window: "60s",
        }),
        protectSignup(),
      ],
      client,
      log,
    });

    const aj2 = aj.withRule(foobarbaz());

    const decision = await aj2.protect(
      {},
      {
        abc: 123,
        requested: 1,
        email: "",
        ip: "",
        method: "",
        protocol: "",
        host: "",
        path: "",
        headers: new Headers(),
        extra: {},
        userId: "user123",
        foobar: 123,
      },
    );

    expect(decision.isErrored()).toBe(false);
  });

  // This is the extent of the tests that can be run in the Edge runtime without
  // more research. It currently fails with the following error:
  //
  // `Cannot find module '../analyze/arcjet_analyze_js_req_bg.wasm' from 'index.ts'`
  //
  // This looks like something to do with the exports in the @arcjet/analyze module,
  // but it works in production. I tried moving the WASM file to the root of the
  // package and also into this package, but that results in another error:
  //
  // `Cannot find module 'wbg' from '../analyze/edge/arcjet_analyze_js_req_bg.wasm'`
  //
  // More work is needed here.
});
