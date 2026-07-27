/**
 * Tests for deadline-based connection recycling.
 *
 * Uses the in-memory Connect router transport as the inner transport so the
 * wrapper is exercised through real RPC machinery — no network I/O.
 */

import assert from "node:assert/strict";
import { describe, mock, test } from "node:test";

import { create } from "@bufbuild/protobuf";
import { Code, ConnectError, createClient, createRouterTransport } from "@connectrpc/connect";
import type { Client } from "@connectrpc/connect";

import { DecideService, GuardResponseSchema } from "./proto/proto/decide/v2/decide_pb.js";
import type { GuardResponse } from "./proto/proto/decide/v2/decide_pb.js";
import {
  withConnectionRecycling,
  RECYCLE_AFTER_CONSECUTIVE_DEADLINES,
} from "./transport-recycle.ts";
import type { RecyclableSession } from "./transport-recycle.ts";

/** Per-call outcome for the scripted inner transport. */
type Outcome = "ok" | "deadline" | "canceled" | "internal";

/** A `RecyclableSession` that records calls instead of managing a connection. */
function fakeSession(): RecyclableSession & { aborts: number; connects: number } {
  return {
    aborts: 0,
    connects: 0,
    abort() {
      this.aborts += 1;
    },
    connect() {
      this.connects += 1;
      return Promise.resolve("open");
    },
  };
}

/** Build a client whose calls play back `outcomes` in order, then a session spy. */
function scriptedClient(outcomes: Outcome[]): {
  client: Client<typeof DecideService>;
  session: ReturnType<typeof fakeSession>;
} {
  let call = 0;
  const inner = createRouterTransport(({ service }) => {
    service(DecideService, {
      guard() {
        const outcome = outcomes[call] ?? "ok";
        call += 1;
        switch (outcome) {
          case "deadline":
            throw new ConnectError("deadline", Code.DeadlineExceeded);
          case "canceled":
            throw new ConnectError("canceled", Code.Canceled);
          case "internal":
            throw new ConnectError("internal", Code.Internal);
          case "ok":
            return create(GuardResponseSchema, {});
        }
      },
    });
  });
  const session = fakeSession();
  const client = createClient(DecideService, withConnectionRecycling(inner, session));
  return { client, session };
}

/** Call `guard` and swallow the expected rejection. */
async function callIgnoringError(client: Client<typeof DecideService>): Promise<void> {
  await client.guard({}).catch(() => {});
}

describe("withConnectionRecycling", () => {
  test("recycles after consecutive deadline failures, not before", async () => {
    const { client, session } = scriptedClient(["deadline", "deadline", "deadline"]);

    for (let index = 0; index < RECYCLE_AFTER_CONSECUTIVE_DEADLINES - 1; index++) {
      await callIgnoringError(client);
      assert.equal(session.aborts, 0);
    }

    await callIgnoringError(client);
    assert.equal(session.aborts, 1);
    assert.equal(session.connects, 1);
  });

  test("a success resets the run", async () => {
    const { client, session } = scriptedClient([
      "deadline",
      "deadline",
      "ok",
      "deadline",
      "deadline",
    ]);

    for (let index = 0; index < 5; index++) {
      await callIgnoringError(client);
    }

    assert.equal(session.aborts, 0);
  });

  test("non-deadline errors neither count nor reset the run", async () => {
    const { client, session } = scriptedClient(["deadline", "deadline", "internal", "deadline"]);

    for (let index = 0; index < 3; index++) {
      await callIgnoringError(client);
    }
    assert.equal(session.aborts, 0, "an internal error must not count as a deadline");

    await callIgnoringError(client);
    assert.equal(session.aborts, 1, "an internal error must not reset the run");
  });

  test("caller cancellation does not count toward the threshold", async () => {
    const outcomes: Outcome[] = [];
    for (let index = 0; index < RECYCLE_AFTER_CONSECUTIVE_DEADLINES; index++) {
      outcomes.push("canceled");
    }
    const { client, session } = scriptedClient(outcomes);

    for (let index = 0; index < outcomes.length; index++) {
      await callIgnoringError(client);
    }

    assert.equal(session.aborts, 0);
  });

  test("the run restarts after a recycle", async () => {
    const outcomes: Outcome[] = [];
    for (let index = 0; index < RECYCLE_AFTER_CONSECUTIVE_DEADLINES * 2; index++) {
      outcomes.push("deadline");
    }
    const { client, session } = scriptedClient(outcomes);

    for (let index = 0; index < outcomes.length; index++) {
      await callIgnoringError(client);
    }

    assert.equal(session.aborts, 2);
  });

  test("a burst of concurrent timeouts triggers at most one recycle", async () => {
    // Hold every call on a shared gate so they all start against the same
    // session generation, then fail them together: the first three failures
    // recycle, the stragglers from the old generation must not recycle again.
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const inner = createRouterTransport(({ service }) => {
      service(DecideService, {
        async guard(): Promise<never> {
          await gate;
          throw new ConnectError("deadline", Code.DeadlineExceeded);
        },
      });
    });
    const session = fakeSession();
    const client = createClient(DecideService, withConnectionRecycling(inner, session));

    const calls: Promise<void>[] = [];
    for (let index = 0; index < RECYCLE_AFTER_CONSECUTIVE_DEADLINES * 2; index++) {
      calls.push(callIgnoringError(client));
    }
    release?.();
    await Promise.all(calls);

    assert.equal(session.aborts, 1);
  });

  test("a success from a call started before a recycle still resets the run", async () => {
    // The first call is held until after a recycle and a partial deadline
    // run against the replacement connection. Its success must reset that
    // run: a mistaken reset only delays a needed recycle, while a discarded
    // success risks tearing down a healthy connection.
    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let call = 0;
    const inner = createRouterTransport(({ service }) => {
      service(DecideService, {
        async guard(): Promise<GuardResponse> {
          if (call++ === 0) {
            await firstGate;
            return create(GuardResponseSchema, {});
          }
          throw new ConnectError("deadline", Code.DeadlineExceeded);
        },
      });
    });
    const session = fakeSession();
    const client = createClient(DecideService, withConnectionRecycling(inner, session));

    const held = client.guard({});
    for (let index = 0; index < RECYCLE_AFTER_CONSECUTIVE_DEADLINES; index++) {
      await callIgnoringError(client);
    }
    assert.equal(session.aborts, 1);

    for (let index = 0; index < RECYCLE_AFTER_CONSECUTIVE_DEADLINES - 1; index++) {
      await callIgnoringError(client);
    }
    releaseFirst?.();
    await held;

    for (let index = 0; index < RECYCLE_AFTER_CONSECUTIVE_DEADLINES - 1; index++) {
      await callIgnoringError(client);
    }
    assert.equal(session.aborts, 1, "the success must have reset the run");

    await callIgnoringError(client);
    assert.equal(session.aborts, 2, "counting must continue after the reset");
  });

  test("responses and errors pass through unchanged", async () => {
    const { client } = scriptedClient(["ok", "deadline"]);

    await client.guard({});

    await assert.rejects(
      () => client.guard({}),
      (error: unknown) => ConnectError.from(error).code === Code.DeadlineExceeded,
    );
  });

  test("recycling logs only when ARCJET_LOG_LEVEL requests it", async (t) => {
    const outcomes: Outcome[] = [];
    for (let index = 0; index < RECYCLE_AFTER_CONSECUTIVE_DEADLINES; index++) {
      outcomes.push("deadline");
    }
    const warn = mock.method(console, "warn", () => {});
    t.after(() => {
      warn.mock.restore();
    });

    const previousLevel = process.env.ARCJET_LOG_LEVEL;
    try {
      delete process.env.ARCJET_LOG_LEVEL;
      const quiet = scriptedClient(outcomes);
      for (let index = 0; index < outcomes.length; index++) {
        await callIgnoringError(quiet.client);
      }
      assert.equal(warn.mock.callCount(), 0, "silent when the level is unset");

      process.env.ARCJET_LOG_LEVEL = "warn";
      const loud = scriptedClient(outcomes);
      for (let index = 0; index < outcomes.length; index++) {
        await callIgnoringError(loud.client);
      }
      assert.equal(warn.mock.callCount(), 1, "logs when the level includes warn");
    } finally {
      if (previousLevel === undefined) {
        delete process.env.ARCJET_LOG_LEVEL;
      } else {
        process.env.ARCJET_LOG_LEVEL = previousLevel;
      }
    }
  });
});
