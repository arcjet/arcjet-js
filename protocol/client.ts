import type { Transport } from "@connectrpc/connect";
import { createClient as createConnectRpcClient } from "@connectrpc/connect";
import {
  ArcjetDecisionFromProtocol,
  ArcjetDecisionToProtocol,
  ArcjetRuleToProtocol,
  ArcjetStackToProtocol,
} from "./convert.js";
import type {
  ArcjetContext,
  ArcjetRequestDetails,
  ArcjetRule,
  ArcjetStack,
} from "./index.js";
import { ArcjetDecision } from "./index.js";
import { DecideService } from "./proto/decide/v1alpha1/decide_connect.js";
import {
  DecideRequest,
  ReportRequest,
  Rule,
} from "./proto/decide/v1alpha1/decide_pb.js";

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
    details: Partial<ArcjetRequestDetails>,
    rules: ArcjetRule[],
  ): Promise<ArcjetDecision>;
  // Call the Arcjet Log Decision API with details of the request and decision
  // made so we can log it.
  report(
    context: ArcjetContext,
    request: Partial<ArcjetRequestDetails>,
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

      let hasValidateEmail = false;
      const protoRules: Rule[] = [];
      for (const rule of rules) {
        if (rule.type === "EMAIL") {
          hasValidateEmail = true;
        }

        protoRules.push(ArcjetRuleToProtocol(rule));
      }

      // Build the request object from the Protobuf generated class.
      const decideRequest = new DecideRequest({
        sdkStack,
        sdkVersion,
        characteristics: context.characteristics,
        details: {
          ip: details.ip,
          method: details.method,
          protocol: details.protocol,
          host: details.host,
          path: details.path,
          headers: Object.fromEntries(details.headers.entries()),
          cookies: details.cookies,
          query: details.query,
          extra: details.extra,
          // Note: `email` is passed to `protect` and dynamic, hence the extra check.
          email: typeof details.email === "string" ? details.email : undefined,
        },
        rules: protoRules,
      });

      log.debug("Decide request to %s", baseUrl);

      const response = await client.decide(decideRequest, {
        headers: { Authorization: `Bearer ${context.key}` },
        // If an email rule is configured, we double the timeout.
        // See https://github.com/arcjet/arcjet-js/issues/1697
        timeoutMs: hasValidateEmail ? timeout * 2 : timeout,
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

      // Build the request object from the Protobuf generated class.
      const reportRequest = new ReportRequest({
        sdkStack,
        sdkVersion,
        characteristics: context.characteristics,
        details: {
          ip: details.ip,
          method: details.method,
          protocol: details.protocol,
          host: details.host,
          path: details.path,
          headers: Object.fromEntries(details.headers.entries()),
          cookies: details.cookies,
          query: details.query,
          extra: details.extra,
          // Note: `email` is passed to `protect` and dynamic, hence the extra check.
          email: typeof details.email === "string" ? details.email : undefined,
        },
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
