import { create } from "@bufbuild/protobuf";

import { isSensitiveInfoEntityType, ruleToProto } from "./convert.ts";
import { policyInputValue, type PolicyInput, type PolicyInputMap } from "./policy-input.ts";
import {
  GetGuardPolicyRequestSchema,
  GuardLocalPolicyResultSchema,
  GuardPolicyInputKind,
  GuardPolicyInputSchema,
  GuardPolicyLocalInputSchema,
  GuardPolicyLookupStatus,
  GuardPolicyServerInputSchema,
  GuardRuleType,
  GuardStringListSchema,
  type GetGuardPolicyResponse,
  type GuardLocalPolicyProjection,
  type GuardLocalPolicyResult,
  type GuardPolicyInput as ProtoPolicyInput,
  type GuardPolicyServerInput,
} from "./proto/proto/decide/v2/decide_pb.js";
import { localDetectSensitiveInfo } from "./rules.ts";
import type { LocalDetectSensitiveInfoConfig } from "./types.ts";

export const policyCapabilities: string[] = ["guard-policy-v1", "local-sensitive-info-v1"];

type FetchPolicy = (
  request: ReturnType<typeof create<typeof GetGuardPolicyRequestSchema>>,
  options: { headers: Record<string, string>; signal?: AbortSignal },
) => Promise<GetGuardPolicyResponse>;

type Snapshot = {
  policy: GuardLocalPolicyProjection;
  refreshAt: number;
};

const policyRefreshIntervalMs = 5 * 60 * 1000;

export type PreparedPolicy = {
  inputs: Record<string, ProtoPolicyInput>;
  revision: string;
  results: GuardLocalPolicyResult[];
};

export class RemotePolicyRuntime {
  readonly #snapshots = new Map<string, Snapshot>();
  readonly #fetches = new Map<string, Promise<Snapshot | undefined>>();
  readonly #key: string;
  readonly #userAgent: string;
  readonly #fetchPolicy: FetchPolicy;

  constructor(key: string, userAgent: string, fetchPolicy: FetchPolicy) {
    this.#key = key;
    this.#userAgent = userAgent;
    this.#fetchPolicy = fetchPolicy;
  }

  async prepare(
    label: string,
    inputMap: PolicyInputMap | undefined,
    signal: AbortSignal | undefined,
    forceRefresh = false,
  ): Promise<PreparedPolicy> {
    const entries = Object.entries(inputMap ?? {});
    const hasLocal = entries.some(([, input]) => input.exposure === "LOCAL");
    const snapshot = hasLocal ? await this.#getSnapshot(label, signal, forceRefresh) : undefined;
    const inputs: Record<string, ProtoPolicyInput> = {};
    const localValues = new Map<string, { value: string; digest: Uint8Array }>();

    for (const [name, input] of entries) {
      if (input.exposure === "LOCAL") {
        const value = policyInputValue(input);
        if (typeof value !== "string")
          throw new TypeError(`Policy input "${name}" must be a string`);
        const digest = await localStringDigest(value);
        localValues.set(name, { value, digest });
        inputs[name] = create(GuardPolicyInputSchema, {
          representation: {
            case: "local",
            value: create(GuardPolicyLocalInputSchema, {
              kind: GuardPolicyInputKind.STRING,
              valueSha256: digest,
            }),
          },
        });
      } else {
        inputs[name] = serverInput(name, input);
      }
    }

    if (snapshot === undefined) return { inputs, revision: "", results: [] };
    const results = await Promise.all(
      snapshot.policy.sensitiveInfoRules.map(async (rule) => {
        const local = localValues.get(rule.inputName);
        if (local === undefined) return null;
        const config = sensitiveInfoConfig(rule.entityFilter);
        const submission = await ruleToProto(localDetectSensitiveInfo(config)(local.value), signal);
        const body = submission.rule?.rule;
        if (body?.case !== "localSensitiveInfo") return null;
        const result = body.value.localResult;
        return create(GuardLocalPolicyResultSchema, {
          policyId: snapshot.policy.policyId,
          policyRevision: snapshot.policy.revision,
          ruleId: rule.ruleId,
          inputName: rule.inputName,
          valueSha256: local.digest,
          type: GuardRuleType.LOCAL_SENSITIVE_INFO,
          ...(body.value.resultDurationMs !== undefined && {
            durationMs: body.value.resultDurationMs,
          }),
          result:
            result.case === "resultComputed"
              ? { case: "localSensitiveInfo", value: result.value }
              : result.case === "resultError"
                ? { case: "error", value: result.value }
                : result.case === "resultNotRun"
                  ? { case: "notRun", value: result.value }
                  : { case: undefined },
        });
      }),
    );
    return {
      inputs,
      revision: snapshot.policy.revision,
      results: results.filter((result): result is GuardLocalPolicyResult => result !== null),
    };
  }

  // oxlint-disable-next-line eslint/require-await -- Cached branches return values; fetch branches return promises.
  async #getSnapshot(
    label: string,
    signal: AbortSignal | undefined,
    forceRefresh: boolean,
  ): Promise<Snapshot | undefined> {
    const now = performance.now();
    const cached = this.#snapshots.get(label);
    if (!forceRefresh && cached !== undefined && now < cached.refreshAt) return cached;

    const existing = this.#fetches.get(label);
    if (existing !== undefined) return existing;
    const pending = this.#fetch(label, signal, cached).finally(() => this.#fetches.delete(label));
    this.#fetches.set(label, pending);
    return pending;
  }

  async #fetch(
    label: string,
    signal: AbortSignal | undefined,
    cached: Snapshot | undefined,
  ): Promise<Snapshot | undefined> {
    try {
      const request = create(GetGuardPolicyRequestSchema, {
        userAgent: this.#userAgent,
        label,
        policyCapabilities,
      });
      const options: { headers: Record<string, string>; signal?: AbortSignal } = {
        headers: { Authorization: `Bearer ${this.#key}` },
      };
      if (signal !== undefined) options.signal = signal;
      const response = await this.#fetchPolicy(request, options);
      if (response.status === GuardPolicyLookupStatus.NOT_CONFIGURED) {
        this.#snapshots.delete(label);
        return undefined;
      }
      if (response.status !== GuardPolicyLookupStatus.AVAILABLE || response.policy === undefined) {
        return this.#retain(label, cached);
      }
      const receivedAt = performance.now();
      const snapshot = Object.freeze({
        policy: response.policy,
        refreshAt: receivedAt + policyRefreshIntervalMs,
      });
      this.#snapshots.set(label, snapshot);
      return snapshot;
    } catch {
      return this.#retain(label, cached);
    }
  }

  #retain(label: string, cached: Snapshot | undefined): Snapshot | undefined {
    if (cached === undefined) return undefined;
    const snapshot = Object.freeze({
      policy: cached.policy,
      refreshAt: performance.now() + policyRefreshIntervalMs,
    });
    this.#snapshots.set(label, snapshot);
    return snapshot;
  }
}

function sensitiveInfoConfig(
  filter: GuardLocalPolicyProjection["sensitiveInfoRules"][number]["entityFilter"],
): LocalDetectSensitiveInfoConfig {
  // Policy entity names share the SDK's documented entity vocabulary and are
  // validated by the server-side policy compiler before projection.
  const entities = filter.value?.entities.filter(isSensitiveInfoEntityType) ?? [];
  if (filter.case === "entitiesAllow") {
    return { allow: entities };
  }
  if (filter.case === "entitiesDeny") {
    return { deny: entities };
  }
  return {};
}

function serverInput(name: string, input: PolicyInput): ProtoPolicyInput {
  const value = policyInputValue(input);
  let wire: GuardPolicyServerInput["value"];
  switch (input.kind) {
    case "STRING":
      if (typeof value !== "string") throw new TypeError(`Policy input "${name}" must be a string`);
      wire = { case: "stringValue", value };
      break;
    case "BOOLEAN":
      if (typeof value !== "boolean")
        throw new TypeError(`Policy input "${name}" must be a boolean`);
      wire = { case: "booleanValue", value };
      break;
    case "INTEGER": {
      if (typeof value === "number" && !Number.isSafeInteger(value)) {
        throw new TypeError(`Policy input "${name}" must be a safe integer or bigint`);
      }
      if (typeof value !== "number" && typeof value !== "bigint") {
        throw new TypeError(`Policy input "${name}" must be an integer`);
      }
      wire = { case: "integerValue", value: BigInt(value) };
      break;
    }
    case "NUMBER":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new TypeError(`Policy input "${name}" must be a finite number`);
      }
      wire = { case: "numberValue", value };
      break;
    case "STRING_LIST":
      if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
        throw new TypeError(`Policy input "${name}" must be a string array`);
      }
      wire = { case: "stringListValue", value: create(GuardStringListSchema, { values: value }) };
      break;
  }
  return create(GuardPolicyInputSchema, {
    representation: {
      case: "server",
      value: create(GuardPolicyServerInputSchema, { value: wire }),
    },
  });
}

export async function localStringDigest(value: string): Promise<Uint8Array> {
  const prefix = new TextEncoder().encode("arcjet.guard.policy-input.v1\0");
  const encoded = new TextEncoder().encode(value);
  const data = new Uint8Array(prefix.length + 4 + encoded.length);
  data.set(prefix);
  new DataView(data.buffer).setUint32(prefix.length, encoded.length, false);
  data.set(encoded, prefix.length + 4);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", data));
}
