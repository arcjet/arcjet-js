import { create } from "@bufbuild/protobuf";
import {
  type Transport,
  createClient as createConnectRpcClient,
} from "@connectrpc/connect";
import {
  type Rule,
  DecideService,
  DecideRequestSchema,
  ReportRequestSchema,
} from "./proto/decide/v1alpha1/decide_pb.js";
import {
  ArcjetDecisionFromProtocol,
  ArcjetDecisionToProtocol,
  ArcjetRuleToProtocol,
  ArcjetStackToProtocol,
} from "./convert.js";
import {
  type ArcjetContext,
  type ArcjetRequestDetails,
  type ArcjetRule,
  type ArcjetStack,
  ArcjetDecision,
} from "./index.js";

// TODO: Dedupe with `errorMessage` in core
function errorMessage(err: unknown): string {
  if (err) {
    if (typeof err === "string") {
      return err;
    }

    if (
      typeof err === "object" &&
      "message" in err &&
      typeof err.message === "string"
    ) {
      return err.message;
    }
  }

  return "Unknown problem";
}

export interface Client {
  decide(
    context: ArcjetContext,
    details: ArcjetRequestDetails,
    rules: ArcjetRule[],
  ): Promise<ArcjetDecision>;
  // Call the Arcjet Log Decision API with details of the request and decision
  // made so we can log it.
  report(
    context: ArcjetContext,
    request: ArcjetRequestDetails,
    decision: ArcjetDecision,
    rules: ArcjetRule[],
  ): void;
}

export type ClientOptions = {
  transport: Transport;
  baseUrl: string;
  timeout: number;
  sdkStack: ArcjetStack;
  sdkVersion: string;
};

/**
 * Compute the timeout for a `Decide` request based on the configured rules.
 *
 * @internal Exported for testing only.
 * @param timeout
 *   Base timeout in milliseconds.
 * @param rules
 *   Rules that will be evaluated in this request.
 * @returns
 *   Adjusted timeout in milliseconds.
 */
export function decideTimeout(timeout: number, rules: ArcjetRule[]): number {
  let hasEmail = false;
  let hasPromptInjection = false;

  for (const rule of rules) {
    if (rule.type === "EMAIL") {
      hasEmail = true;
    }
    if (rule.type === "PROMPT_INJECTION_DETECTION") {
      hasPromptInjection = true;
    }
  }

  // If an email rule is configured, we double the timeout.
  // See https://github.com/arcjet/arcjet-js/issues/1697
  let result = hasEmail ? timeout * 2 : timeout;

  if (hasPromptInjection) {
    // We document the latency of this rule independently from other
    // `protect` calls, so we enforce a minimum timeout of 1 second.
    result = Math.max(result, 1_000);
  }

  return result;
}

export function createClient(options: ClientOptions): Client {
  const { transport, sdkVersion, baseUrl, timeout } = options;

  const sdkStack = ArcjetStackToProtocol(options.sdkStack);

  const client = createConnectRpcClient(DecideService, transport);

  return Object.freeze({
    async decide(
      context: ArcjetContext,
      details: ArcjetRequestDetails,
      rules: ArcjetRule[],
    ): Promise<ArcjetDecision> {
      const { log } = context;

      const protoRules: Rule[] = [];
      for (const rule of rules) {
        protoRules.push(ArcjetRuleToProtocol(rule));
      }

      const cleanDetails = {
        ip: details.ip,
        method: details.method,
        protocol: details.protocol,
        host: details.host,
        path: details.path,
        headers: Object.fromEntries(details.headers.entries()),
        cookies: details.cookies,
        query: details.query,
        extra: details.extra,
      };

      // Build the request object from the Protobuf generated class.
      const decideRequest = create(DecideRequestSchema, {
        sdkStack,
        sdkVersion,
        characteristics: context.characteristics,
        // `email` is an optional field but not allowed to be `undefined`.
        details:
          typeof details.email === "string"
            ? { ...cleanDetails, email: details.email }
            : cleanDetails,
        rules: protoRules,
      });

      log.debug("Decide request to %s", baseUrl);

      const response = await client.decide(decideRequest, {
        headers: { Authorization: `Bearer ${context.key}` },
        timeoutMs: decideTimeout(timeout, rules),
      });

      const decision = ArcjetDecisionFromProtocol(response.decision);

      log.debug(
        {
          id: decision.id,
          fingerprint: context.fingerprint,
          path: details.path,
          runtime: context.runtime,
          ttl: decision.ttl,
          conclusion: decision.conclusion,
          reason: decision.reason,
          ruleResults: decision.results,
        },
        "Decide response",
      );

      return decision;
    },

    report(
      context: ArcjetContext,
      details: ArcjetRequestDetails,
      decision: ArcjetDecision,
      rules: ArcjetRule[],
    ): void {
      const { log } = context;

      const cleanDetails = {
        ip: details.ip,
        method: details.method,
        protocol: details.protocol,
        host: details.host,
        path: details.path,
        headers: Object.fromEntries(details.headers.entries()),
        cookies: details.cookies,
        query: details.query,
        extra: details.extra,
      };

      // Build the request object from the Protobuf generated class.
      const reportRequest = create(ReportRequestSchema, {
        sdkStack,
        sdkVersion,
        characteristics: context.characteristics,
        // `email` is an optional field but not allowed to be `undefined`.
        details:
          typeof details.email === "string"
            ? { ...cleanDetails, email: details.email }
            : cleanDetails,
        decision: ArcjetDecisionToProtocol(decision),
        rules: rules.map(ArcjetRuleToProtocol),
      });

      log.debug("Report request to %s", baseUrl);

      // We use the promise API directly to avoid returning a promise from this
      // function so execution can't be paused with `await`
      const reportPromise = client
        .report(reportRequest, {
          headers: { Authorization: `Bearer ${context.key}` },
          // Rules don't execute during `Report` so we don't adjust the timeout
          // if an email rule is configured.
          timeoutMs: 2_000, // 2 seconds
        })
        .then((response) => {
          log.debug(
            {
              id: decision.id,
              fingerprint: context.fingerprint,
              path: details.path,
              runtime: context.runtime,
              ttl: decision.ttl,
            },
            "Report response",
          );
        })
        .catch((err: unknown) => {
          log.info("Encountered problem sending report: %s", errorMessage(err));
        });

      if (typeof context.waitUntil === "function") {
        context.waitUntil(reportPromise);
      }
    },
  });
}
