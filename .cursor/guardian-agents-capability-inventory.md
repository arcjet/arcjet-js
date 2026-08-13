# Arcjet JS/TS SDK — Guardian Agents capability inventory

**Scope:** This repository only (`https://github.com/arcjet/arcjet-js`, tag/release **1.10.0**, commit `a370d371` / “Release 1.10.0”).  
**Not in this repo:** Arcjet Cloud Decide/Guard APIs, `app.arcjet.com` dashboard, `@arcjet/cli`, the Arcjet MCP server implementation, and example apps (migrated to `arcjet/examples` in 1.10.0). Those are cited only when the SDK code or docs reference them.

**Method:** Source and package READMEs in this monorepo. Features not present in shipping code are marked **Absent**. Marketing copy is not treated as evidence.

**Gartner mapping legend**

- **Native** — this SDK implements the capability as described, in-process, without requiring a separate product the caller must invent.
- **Partial** — related primitives exist, but they do not cover the Gartner meaning (discovery, catalog, posture, tamper-evidence, alignment, etc.).
- **Absent** — no implementation in this repo.

---

## A) What this repo ships

Monorepo version **1.10.0** (2026-08-11). All listed packages share that version unless noted. Node engines: `>=22.21.0 <23 || >=24.5.0`.

### Request / framework SDKs

These wrap the `arcjet` core. API is `protect(request, props)`. They require an HTTP request object.

| Package | Path | One-line |
| --- | --- | --- |
| `@arcjet/next` | `arcjet-next/` | Next.js adapter (`protect`, `request()`, middleware helper). |
| `@arcjet/node` | `arcjet-node/` | Node.js / Express / Hono (Node) adapter. |
| `@arcjet/bun` | `arcjet-bun/` | Bun adapter. |
| `@arcjet/deno` | `arcjet-deno/` | Deno adapter (`npm:@arcjet/deno`). |
| `@arcjet/fastify` | `arcjet-fastify/` | Fastify adapter. |
| `@arcjet/nest` | `arcjet-nest/` | NestJS adapter plus `ArcjetGuard` `CanActivate`. |
| `@arcjet/nuxt` | `arcjet-nuxt/` | Nuxt adapter. |
| `@arcjet/remix` | `arcjet-remix/` | Remix adapter. |
| `@arcjet/sveltekit` | `arcjet-sveltekit/` | SvelteKit adapter. |
| `@arcjet/astro` | `arcjet-astro/` | Astro adapter (also serializes rules into Astro config). |
| `@arcjet/react-router` | `arcjet-react-router/` | React Router adapter. |

Root README also maps **Express** and **Hono** to `@arcjet/node` or `@arcjet/bun` (no dedicated packages). **TanStack Start** is listed as an example app only, not a package here.

### Guard SDK

| Package | Path | One-line |
| --- | --- | --- |
| `@arcjet/guard` | `arcjet-guard/` | Non-HTTP guards: `launchArcjet().guard()`, `capture()`, agent helpers, remote policy inputs. |

Subpath exports (same package):

- `@arcjet/guard` — core client + rules
- `@arcjet/guard/node`, `/bun`, `/fetch` — transport entry points
- `@arcjet/guard/testing` — in-memory test client
- `@arcjet/guard/vercel-ai/v7` — Vercel AI SDK v7 `guardTool` / `aiToolsContext` + agent helpers
- `@arcjet/guard/vercel-eve/v0` — Vercel Eve `guardTool` / `guardApproval` / `guardInbound` / `arcjetHooks`

There is **no** public `@arcjet/guard/agents` export (internal barrel re-exported from vendor namespaces).

### Core + protocol

| Package | Path | One-line |
| --- | --- | --- |
| `arcjet` | `arcjet/` | Core `protect()` engine and rule factories (`shield`, `detectBot`, rate limits, `sensitiveInfo`, `validateEmail`, `filter`, `detectPromptInjection`, `protectSignup`). |
| `@arcjet/protocol` | `protocol/` | Decide v1alpha1 protobuf client, decision/reason types, well-known bot list. |
| `@arcjet/transport` | `transport/` | Connect RPC transport to `https://decide.arcjet.com` (HTTP/2 on Node, fetch elsewhere). |
| `@arcjet/analyze` | `analyze/` | JS wrapper over local WASM analysis. |
| `@arcjet/analyze-wasm` | `analyze-wasm/` | WASM bindings for fingerprint, bots, email syntax, filters, default PII. |

### Sensitive data

| Package | Path | One-line |
| --- | --- | --- |
| `@arcjet/redact` | `redact/` | Local redact/unredact of PII strings (WASM). **Standalone**; not wired into `protect()`/`guard()`. |
| `@arcjet/redact-wasm` | `redact-wasm/` | WASM engine for `@arcjet/redact`. |
| `@arcjet/sensitive-info-rampart` | `sensitive-info-rampart/` | Optional on-device NER backend (~15 MB ONNX) for extra entity types. |

### Nosecone (HTTP security headers; not Arcjet Decide)

| Package | Path | One-line |
| --- | --- | --- |
| `nosecone` | `nosecone/` | Set CSP and related security headers on a `Response`. |
| `@nosecone/next` | `nosecone-next/` | Next.js Nosecone helper. |
| `@nosecone/sveltekit` | `nosecone-sveltekit/` | SvelteKit Nosecone helper. |

### Utilities

| Package | Path | One-line |
| --- | --- | --- |
| `@arcjet/inspect` | `inspect/` | Helpers: `isSpoofedBot`, `isVerifiedBot`, `isMissingUserAgent`. |
| `@arcjet/decorate` | `decorate/` | Set experimental `RateLimit` / `RateLimit-Policy` response headers. |
| `@arcjet/logger` | `logger/` | Pino-shaped logger (`ARCJET_LOG_LEVEL`). |
| `@arcjet/ip` | `ip/` | Client IP extraction (`findIp`, proxies, platform hints). |
| `@arcjet/headers` | `headers/` | `Headers` extension used by the core. |
| `@arcjet/body` | `body/` | Read request body for `sensitiveInfo`. |
| `@arcjet/cache` | `cache/` | In-memory decision cache. |
| `@arcjet/duration` | `duration/` | Parse `"1h"`-style intervals. |
| `@arcjet/env` | `env/` | Env/platform detection (`ARCJET_KEY`, base URL, log level). |
| `@arcjet/runtime` | `runtime/` | Runtime name detection. |
| `@arcjet/sprintf` | `sprintf/` | `util.format` replacement. |
| `@arcjet/stable-hash` | `stable-hash/` | Deterministic rule-id hashing. |

### Referenced but **not** in this repo

- `@arcjet/cli` (`npx @arcjet/cli auth login`) — docs only.
- Arcjet MCP server at `https://api.arcjet.com/mcp` — developer tooling for sites/keys; **not** an SDK that protects user MCP servers.
- Example apps (`examples/nextjs-ai-agent`, `examples/eve-agent`) — removed in 1.10.0 (`#6217`); README still points at GitHub example repos / those paths.
- Root README still mentions `@arcjet/eslint-config` and `@arcjet/rollup-config`; those directories are **not** in this tree (build is tsdown/turbo).

---

## B) Architecture

### Two products in one SDK

| | Request path (`arcjet` + framework adapters) | Guard path (`@arcjet/guard`) |
| --- | --- | --- |
| Entry | HTTP `Request` / framework request | No HTTP object required |
| Call | `aj.protect(req, props)` | `arcjet.guard({ label, rules, actor?, inputs?, metadata?, correlationId? })` |
| Protocol | Decide **v1alpha1** (`protocol/src/proto/decide/v1alpha1/`) | Decide **v2** Guard + Capture + GetGuardPolicy (`arcjet-guard/src/proto/proto/decide/v2/`) |
| Default API | `https://decide.arcjet.com` | Same host, Guard RPC |
| Rules bound | Once on the client; extra inputs via `protect()` props | Per call: rule config once, inputs per invocation |
| Rate-limit key | Fingerprint from `characteristics` (default `ip.src`) | Explicit `key` string, **SHA-256 hashed** before send |
| Custom local rules | Not supported | `defineCustomRule` |
| Capture / audit events | `report()` after local DENY / errors | `capture()` / `flush()` |
| Bot / Shield / email / filter / IP intel | Yes | No |
| Remote Guard policy | No | Yes (`policyInput` + `GetGuardPolicy`) |

They can be used together in one app. They do not share a client instance.

### In-process vs remote

Every `protect()` / `guard()` that is not short-circuited by a local LIVE DENY still talks to Arcjet Cloud (or reports to it). There is no fully offline Decide mode.

**Local (WASM / JS, in-process)**

- Fingerprint generation (`@arcjet/analyze`).
- Bot *classification* from request signals (UA etc.); verification/spoof is filled remotely (`verify()` local stub returns `"unverifiable"`).
- Email *syntax* + a hard-coded free-provider list; disposable / MX / Gravatar local stubs return `"unknown"`.
- Filter expression matching; `ipLookup()` local stub returns `undefined`, so country/VPN/Tor expressions are typically **undetermined** until the remote Decide response.
- Default sensitive-info detection (email, phone, IP, credit card).
- Optional Rampart NER (`@arcjet/sensitive-info-rampart`) — fully local model.
- `@arcjet/redact` redact/unredact.
- Guard custom `evaluate()` functions.
- Guard remote-policy **LOCAL** sensitive-info evaluation (text stays in SDK; digest sent).
- In-memory DENY cache (`@arcjet/cache`).

**Remote (leaves the process via Connect RPC to `decide.arcjet.com`)**

- Rate limits (token bucket / fixed / sliding) — local rule returns `NOT_RUN` ALLOW; counters live on the server.
- Shield WAF — local rule returns `NOT_RUN` ALLOW; analysis is server-side.
- Prompt injection — local rule returns `NOT_RUN` ALLOW; **raw message is sent** on Decide/Guard.
- Experimental content moderation — raw text sent (Guard only).
- Email disposable/MX/Gravatar and bot verification/IP reputation.
- Filter fields that need IP intelligence (`ip.src.country`, `ip.src.vpn`, …).
- IP geolocation, ASN, VPN/proxy/Tor/hosting, threat intelligence (`decision.ip`).
- Guard remote policy evaluation (SERVER inputs in plaintext; LOCAL inputs as SHA-256).
- Capture events (batched).
- `report()` of local DENY/ERROR decisions (request path).

**What is redacted / hashed vs sent plaintext**

Request `protect()` (`arcjet/src/index.ts`):

- `sensitiveInfoValue` and `filterLocal` → `"<redacted>"` on the Decide *and* Report payloads.
- `detectPromptInjectionMessage` → **sent unredacted on Decide** (server inference); redacted to `"<redacted>"` on Report.
- Request metadata, IP, method, path, headers, cookies, query, email, `correlationId` are sent.

Guard `guard()`:

- Rate-limit `key` → SHA-256 hex (`inputKeyHash`).
- Sensitive-info input text → SHA-256; detection runs locally; entity *types* (not spans) returned.
- Prompt injection / moderate-content `inputText` → **plaintext** to the API.
- `policyInput.server.*` → transmitted; `policyInput.local.string` → digest only.
- If a LIVE local sensitive-info rule denies, the SDK strips plaintext-bearing fields before the Guard RPC (`deniedLocally` / `sanitizeInputs` in `remote-policy.ts`).

Auth: `Authorization: Bearer <ARCJET_KEY>` (`ajkey_…`). Guard never reads env vars; the key is passed to `launchArcjet()`. Request adapters read `ARCJET_KEY` via `@arcjet/env`.

**Fail-open vs fail-closed**

- `protect()` and `guard()`: **fail open** (ERROR/ALLOW; `hasFailedOpen()` on Guard).
- Agent helpers (`guardTool`, `guardAction`, Eve `guardInbound` / `guardApproval`): **fail closed** by default (`onGuardError: "deny"`).

Default Guard RPC timeout: **2000 ms** (prompt injection / moderation need the headroom). Request Decide timeout is doubled if an email rule is present and floored at 1000 ms if a prompt-injection rule is present.

---

## C) Capability inventory

Status: **GA** = exported without `experimental_` prefix in 1.10.0. **Experimental** / **Deprecated** as marked in source.

### C.1 Request rules (`arcjet` + all framework SDKs)

| Name | What it does | Status | Packages | Pointers |
| --- | --- | --- | --- | --- |
| `shield` | Server-side WAF; docs: SQLi/XSS/OWASP Top 10. Local always `NOT_RUN`. Suspicion threshold then blocks subsequent requests from that client (server behavior). | GA | `arcjet`, all request SDKs | `arcjet/src/index.ts` (`shield`), `protocol` `ArcjetShieldReason` |
| `detectBot` | Allow-or-deny bots by name and `CATEGORY:*`. Local WASM classifies; remote verifies. Empty `allow: []` blocks all bots. | GA | same | `arcjet/src/index.ts` (`detectBot`); `protocol/src/well-known-bots.ts`; `@arcjet/inspect` |
| `tokenBucket` | Variable-cost rate limit; `requested` deducted per call. Server-side counters. | GA | same | `arcjet/src/index.ts` |
| `fixedWindow` | Hard cap per window. Server-side. | GA | same | `arcjet/src/index.ts` |
| `slidingWindow` | Rolling window. Server-side. | GA | same | `arcjet/src/index.ts` |
| `validateEmail` | Deny/allow `DISPOSABLE`, `FREE`, `NO_MX_RECORDS`, `NO_GRAVATAR`, `INVALID`. Needs `email` on `protect()`. | GA | same | `arcjet/src/index.ts`; local WASM in `analyze/src/index.ts` |
| `sensitiveInfo` | Local PII detect; **block** (DENY) on denied entity types. Default WASM: `EMAIL`, `PHONE_NUMBER`, `IP_ADDRESS`, `CREDIT_CARD_NUMBER`. Optional `backend` (Rampart) and custom `detect`. Input: `sensitiveInfoValue` or request body. **Does not redact** in this rule. | GA | same + optional `@arcjet/sensitive-info-rampart` | `arcjet/src/index.ts` (`sensitiveInfo`) |
| `detectPromptInjection` | Server-side injection/jailbreak detection. Requires `detectPromptInjectionMessage`. LIVE denies; DRY_RUN logs. `threshold` **deprecated** (not respected by server). | GA (graduated from `experimental_detectPromptInjection`) | same | `arcjet/src/index.ts`; alias `experimental_detectPromptInjection` still exported, deprecated |
| `filter` | Wireshark-like expressions on HTTP fields / IP (`ip.src`, `ip.src.country`, `ip.src.vpn`, path, headers, …). `allow` xor `deny`. | GA | same | `arcjet/src/index.ts` (`filter`) |
| `protectSignup` | Convenience product: slidingWindow + detectBot + validateEmail. | GA | same | `arcjet/src/index.ts` (`protectSignup`) |
| Custom request rules | Application-defined local `protect()` rules | **Absent** on request path | — | Root README: custom rules are Guard-only |
| Characteristics | Fingerprint dimensions (`userId`, `ip.src`, …) declared on client or per rate-limit rule; values passed into `protect()`. | GA | same | `arcjet/src/index.ts` `characteristics` |
| IP analysis | `decision.ip`: geo, ASN, `isVpn/isProxy/isTor/isHosting/isRelay/isAbuser`, optional `threat` (riskLevel, activities, reputation). | GA (threat metadata added 1.10.0) | `protocol` via all request SDKs | `protocol/src/index.ts` `ArcjetIpDetails` |
| Decision API | `isDenied/isAllowed/isErrored/isChallenged`, `reason.isBot/isRateLimit/isSensitiveInfo/isPromptInjection/isEmail/isShield/isFilter`, `results`, `id`, `ttl`. Conclusions: `ALLOW \| DENY \| CHALLENGE \| ERROR`. | GA | `protocol` | `protocol/src/index.ts` |
| `correlationId` / `metadata` on `protect()` | Optional join key and nested JSON metadata (same limits as Guard). | GA (nested JSON in 1.10.0) | `arcjet`, `protocol` | `arcjet/src/index.ts` `knownFields`; `protocol/src/metadata.ts` |
| Modes | `LIVE` (enforce) / `DRY_RUN` (observe, override DENY to continue). Default for PI is DRY_RUN if `mode` omitted. | GA | all rules | each rule factory |

Bot categories documented in root README: `CATEGORY:ACADEMIC`, `ADVERTISING`, `AI`, `AMAZON`, `APPLE`, `ARCHIVE`, `BOTNET`, `FEEDFETCHER`, `GOOGLE`, `META`, `MICROSOFT`, `MONITOR`, `OPTIMIZER`, `PREVIEW`, `PROGRAMMATIC`, `SEARCH_ENGINE`, `SLACK`, `SOCIAL`, `TOOL`, `UNKNOWN`, `VERCEL`, `WEBHOOK`, `YAHOO`, plus named bots in `well-known-bots.ts`.

### C.2 Guard rules and client (`@arcjet/guard`)

| Name | What it does | Status | Pointers |
| --- | --- | --- | --- |
| `launchArcjet({ key, logger?, sensitiveInfoBackend? })` | Create client; HTTP/2 (Node/Bun) or fetch (Deno/Workers). | GA | `arcjet-guard/src/index.ts`, `node.ts`, `fetch.ts`, `bun.ts` |
| `guard({ label, rules?, actor?, inputs?, metadata?, correlationId?, timeoutSeconds? })` | Evaluate SDK rules + remote policy; returns `Decision`. Empty `rules` still RPCs (call site remains policy-reachable). | GA | `arcjet-guard/src/client.ts`, `types.ts` `GuardOptions` |
| `tokenBucket` / `fixedWindow` / `slidingWindow` | Same algorithms; `key` hashed; optional `bucket` name for dashboard counters. | GA | `arcjet-guard/src/rules.ts` |
| `detectPromptInjection` | Sends `inputText` to Cloud; result `PROMPT_INJECTION`; optional `billing` (tokens). | GA | `rules.ts`; convert `inputText` |
| `localDetectSensitiveInfo` | Local detect; hash only on wire. `allow`/`deny` entity types. Optional per-rule `backend`. | GA | `rules.ts`, `convert.ts` |
| `defineCustomRule` | Local `evaluate(config, input, { signal }) → { conclusion, data? }`. | GA | `rules.ts` |
| `experimental_moderateContent` | Sends text to Cloud; may error/fail-open; shape may change. | **Experimental** | `rules.ts` |
| `policyInput.server.{string,boolean,integer,number,stringList}` / `policyInput.local.string` | Typed inputs for remotely configured policies. | GA (1.10.0) | `policy-input.ts`, `remote-policy.ts` |
| `actor` | Opaque identity asserted by **trusted app code** (not discovered). Remote policy can `requiresActor`. | GA | `GuardOptions.actor`; policy proto `requiresActor` |
| Remote policy | Fetch/cache `GetGuardPolicy` per `label` (5 min refresh; 5s retry on unavailable). SDK evaluates LOCAL sensitive-info; server evaluates SERVER constraints. | GA (1.10.0) | `remote-policy.ts`; `proto/guard/policy/v1/policy_pb.d.ts` |
| Remote policy rule kinds | `allowedStringValues`, `deniedStringValues` (`EXACT` / `EMAIL_DOMAIN`), `stringLength`, `promptInjection` (SERVER string), `stringListMembership`, `localSensitiveInfo` (LOCAL string). | GA as protocol; enforcement is Cloud + local SI | policy proto |
| `capture({ action, correlationId?, decisionId?, metadata?, occurredAt?, waitUntil? })` | Best-effort visibility event; not a security decision; bounded queue; no retry. | GA (1.10.0) | `client.ts`, `capture-delivery.ts` |
| `registerArcjet` / free `guard`/`capture`/`flush` | Optional process-global client. | GA | `registry.ts` |
| `@arcjet/guard/testing` | In-memory recorder; `guard()` fail-open ALLOW (so fail-closed helpers **deny**). | GA | `src/testing/` |
| Decision | `conclusion` ALLOW/DENY only (no CHALLENGE). `reason`, `results`, `policyEvaluation`, `policyResults`, `warnings`, `hasFailedOpen()`, `errorResults()`. | GA | `types.ts` |

Guard reasons: `RATE_LIMIT`, `PROMPT_INJECTION`, `MODERATE_CONTENT`, `SENSITIVE_INFO`, `INPUT_CONSTRAINT`, `CUSTOM`, `ERROR`, `NOT_RUN`, `UNKNOWN`.

### C.3 Agent / vendor integrations

| Name | What it does | Status | Pointers |
| --- | --- | --- | --- |
| `createAgentContext` | `{ correlationId, metadata }` — ULID if omitted. Explicit threading; no AsyncLocalStorage. | GA; exported only via vendor namespaces | `arcjet-guard/src/agents/context.ts` |
| `securityMetadata` | Vocabulary: `user`, `agent`, `workflow`, `dataClass`→`data-class`, `destination`, `reversibility`, `resource`. Caller-supplied strings. | GA | `agents/vocabulary.ts` |
| `guardAction` | Wrap an app-invoked function; throws `ArcjetDeniedError` / `ArcjetGuardUnavailableError`. | GA | `agents/guard-action.ts` |
| `captureAction` | Observational capture with context. | GA | `agents/guard-action.ts` |
| `guardTool` (AI SDK v7) | Wrap a Vercel AI `tool`; injects context schema; on DENY returns `ArcjetDenialResult` to the model. | GA (1.10.0) | `vercel-ai/v7/guard-tool.ts` |
| `aiToolsContext` | Build `toolsContext` map so correlation reaches tool calls. | GA | `vercel-ai/v7/tools-context.ts` |
| Eve `guardTool` | Wrap Eve `ToolDefinition.execute`. | GA (1.10.0) | `vercel-eve/v0/guard-tool.ts` |
| Eve `guardApproval` | Eve `Approval` for tools, **OpenAPI connections**, and **MCP client connections**. | GA | `vercel-eve/v0/guard-approval.ts`, `gate.ts` |
| Eve `guardInbound` | Screen inbound channel text **before** a session exists; `rules` required. | GA | `vercel-eve/v0/guard-inbound.ts` |
| Eve `arcjetHooks` | Observe-only capture of session/turn/tool/subagent lifecycle. | GA | `vercel-eve/v0/hooks.ts` |
| Eve `eveAgentContext` | Derive context from Eve session (session id, auth principal). | GA | `vercel-eve/v0/context.ts` |
| LangChain / LangGraph adapters | — | **Absent** | no matches in repo |
| MCP *server* SDK / handler wrapper | Docs say “use Guard in MCP tool handlers”; no MCP server framework wrapper ships. | **Absent** as a dedicated API | README + Eve MCP *client connection* approval only |
| Packaged skills | `skills/integrate-arcjet-guard-agents`, `skills/integrate-arcjet-guard-eve` | shipped with the npm tarball | `arcjet-guard/skills/` |

### C.4 Redaction, headers, inspect

| Name | What it does | Status | Pointers |
| --- | --- | --- | --- |
| `redact()` / `unredact()` | Replace entities with placeholders; reverse later. Entities: `email`, `phone-number`, `ip-address`, `credit-card-number`, plus custom `detect`. | GA; **not** used by `protect`/`guard` | `redact/` |
| Rampart entities | `GIVEN_NAME`, `SURNAME`, `EMAIL`, `PHONE_NUMBER`, `URL`, `TAX_ID`, `BANK_ACCOUNT`, `ROUTING_NUMBER`, `GOVERNMENT_ID`, `PASSPORT`, `DRIVERS_LICENSE`, address parts, `ZIP_CODE`; deterministic `EMAIL`, `URL`, `IP_ADDRESS`, `SSN`, `CREDIT_CARD_NUMBER`. Node/Bun/Deno only (not edge). | GA (1.9.0) | `sensitive-info-rampart/README.md` |
| Nosecone | CSP and related browser security headers. Orthogonal to Decide. | GA | `nosecone/` |
| `setRateLimitHeaders` | IETF-draft RateLimit headers from a decision. | Documented as experimental headers | `decorate/` |
| `@arcjet/inspect` | Bot spoof/verified/missing-UA helpers. | GA | `inspect/src/index.ts` |

### C.5 Logging, traces, catalog, dashboard client

| Name | What it does | Status | Pointers |
| --- | --- | --- | --- |
| `@arcjet/logger` | debug/info/warn/error; `ARCJET_LOG_LEVEL`. | GA | `logger/` |
| Guard diagnostics | `AJxxxx` codes; optional `logger` on `launchArcjet`. | GA | `arcjet-guard/src/diagnostics.ts` |
| OpenTelemetry / distributed tracing | Capture comment: future `"otlp"` source string. No OTEL exporter. | **Absent** | `client.ts` `CAPTURE_SOURCE_SDK` |
| Dashboard / Console client | Decision `id` “look up in the Arcjet dashboard”. No dashboard HTTP client in this repo. | **Absent** (cloud product) | comments in `protocol` / Guard README |
| Agent catalog / inventory / discovery / shadow-agent APIs | — | **Absent** | no catalog/posture types |
| Feature-flag system | None. Modes (`LIVE`/`DRY_RUN`), env log level, optional backends, `onGuardError`. | N/A | — |

---

## D) Mapping to Gartner Market Guide for Guardian Agents (G00836388)

Gartner in-market bar: **native coverage of all three mandatory categories**. This SDK is a **runtime enforcement library** you call at instrumented sites. It does not implement an agent control-plane catalog or posture manager.

### Mandatory 1 — AI visibility and traceability

| Sub-capability | Verdict | Evidence |
| --- | --- | --- |
| Agent catalog (including shadow / rogue) | **Absent** | No inventory, registration, or discovery of agents. Labels (`tools.weather`, `email.sent`) are caller-chosen slugs, not a catalog. Nothing finds undeclared/shadow agents. |
| Maps of tools / data / other agents | **Absent** | No graph of tools, data stores, or agent-to-agent calls. Eve hooks record *lifecycle events you opted into*, not a topology map. |
| Ownership + lineage | **Partial** | Caller may set `actor`, `correlationId`, `securityMetadata.{user,agent,workflow,resource}`, and Eve session/parent join. Lineage is “events we were told about for this ID”, not discovered ownership. Capture is best-effort and droppable. |
| Tamper-evident audit trails | **Absent** | Cloud stores decisions/captures (out of repo). SDK: no hash chain, no WORM log, no signed audit. Capture “never retries”; queue-full drops newest events. `occurredAt` is explicitly untrusted. |

**Category 1 overall: Absent / Partial (telemetry of instrumented calls only). Not a native visibility/catalog product.**

### Mandatory 2 — Continuous assurances (AI agent posture management)

| Sub-capability | Verdict | Evidence |
| --- | --- | --- |
| Agent posture management | **Absent** | No scoring of agent configs, tool allowlists as a managed estate, drift detection, or continuous assessment of agents you did not wrap. Remote Guard policy is a **per-label rule bundle** fetched by the SDK (`GetGuardPolicy`), not posture over an agent fleet. `DRY_RUN` is rule observation, not posture. |

**Category 2 overall: Absent.**

### Mandatory 3 — Runtime inspection and enforcement

| Sub-capability | Verdict | Evidence |
| --- | --- | --- |
| Agent alignment | **Partial** | Prompt-injection detection (Cloud model; block vs allow). Experimental content moderation (Guard). Remote input constraints (allow/deny lists, length, list membership). Custom local `evaluate`. These are **content/input gates**, not a general alignment/goal-adherence engine. No representation of intended agent goals vs observed behavior beyond rules you write. |
| Anomaly detection | **Partial** (HTTP) / **Absent** (agent behavior) | Request path: bots, Shield WAF, IP threat intel, rate limits. Guard path: rate limits + rules; no behavioral UEBA over tool sequences. |
| Runtime adaptation | **Absent** | No auto-tuning of policies, no dynamic isolation/sandboxing of agents, no adaptive trust. `LIVE`/`DRY_RUN` and `onGuardError` are static. Shield’s server-side “after suspicion, block later requests” is HTTP WAF behavior, not agent runtime adaptation. |

**Category 3 overall: Partial.** Strong **pre-action allow/deny** at call sites you wrap; not Gartner’s full alignment + anomaly + adaptation set.

### Common features

| Feature | Verdict | Evidence |
| --- | --- | --- |
| Identity discovery | **Absent** | Identity is **asserted** (`actor`, `characteristics`, `securityMetadata.user`). Docs: never take actor from model/user input. No IdP/agent identity discovery. |
| Data mapping / lineage | **Partial** | PII **detection** (and standalone **redaction**). Not a data map, not field-level lineage across systems. `dataClass` is a metadata string. |
| Security testing | **Absent** | `@arcjet/guard/testing` records calls; it does not attack or validate agent security. No DAST/red-team of agents. |
| Risk / control validation | **Absent** | No control-effectiveness or risk register APIs. |
| Compliance reporting | **Absent** | No report generators. Dashboard (out of repo) is referenced for lookup by `decision.id`. |
| Automatic blocking | **Native** (at instrumented sites) | `LIVE` DENY; helpers fail closed by default; Eve inbound/approval gates. Uninstrumented tools/agents are not blocked. |
| Autoremediation | **Absent** | Block/allow/observe only. No auto-revoke of tools, no auto-patch of prompts, no quarantine of agents. |
| Continuous compliance | **Absent** | No continuous mapping to regulatory controls. |

---

## E) Agent / MCP / tool-call surface (detail)

### E.1 What “tool authorization” actually is

There is **no** function named `authorizeTool` and no first-class tool RBAC graph.

Authorization is: **before the side effect, call Guard (and/or remote policy) and stop on DENY.**

What can be authorized:

1. **SDK rules on that call** — rate limit (hashed key), prompt injection (plaintext to Cloud), local PII, custom `evaluate`.
2. **Remote policy for `label`** — compiled bundle: optional required `actor`; SERVER string allow/deny (`EXACT` or `EMAIL_DOMAIN`), length, list membership; SERVER prompt injection; LOCAL sensitive-info.
3. **Wrapping helpers** — `guardTool` / `guardAction` / Eve `guardApproval` / `guardInbound`.

Policy model (remote), from `arcjet-guard/src/proto/proto/guard/policy/v1/policy_pb.d.ts`:

- One policy per **exact label**.
- `requiresActor: boolean`.
- Named typed inputs (`STRING`, `BOOLEAN`, `INTEGER`, `NUMBER`, `STRING_LIST`) with `SERVER` vs `LOCAL` exposure.
- Rules listed above. Not a general CEL/Rego language in this SDK.

Caller must pass `inputs` with `policyInput.*`. Plain JS values are rejected.

### E.2 Guard API (no HTTP request)

```ts
const arcjet = launchArcjet({ key });
const decision = await arcjet.guard({
  label: "tools.weather",           // required slug
  actor: session.userId,            // optional, trusted
  correlationId: requestId,         // optional
  metadata: { ... },
  inputs: {
    recipient: policyInput.server.string(to),
    body: policyInput.local.string(body),
  },
  rules: [
    limitRule({ key: userId, requested: n }),
    detectPromptInjection()(userMessage),
    localDetectSensitiveInfo({ deny: ["CREDIT_CARD_NUMBER"] })(userMessage),
  ],
});
```

Checked **without** an HTTP request: all Guard rules, remote policy, capture. Not available on Guard: bots, Shield, email validation, filters, IP intel.

MCP **server handlers**: call `guard()` inside the handler. No `@modelcontextprotocol/sdk` wrapper ships here.

### E.3 Vercel AI SDK v7 (`@arcjet/guard/vercel-ai/v7`)

- `createAgentContext({ correlationId?, metadata? })`
- `guardTool(client, tool, { action, rules?, actor?, inputs?, metadata?, onGuardError?, onDeny? })`
- `aiToolsContext(ctx, tools)` **must** be passed to `generateText` or calls are uncorrelated (warns).
- `guardAction(client, ctx, policy, fn)`
- `captureAction(client, ctx, { action, metadata? })`

On DENY, the **model** sees `ArcjetDenialResult` (`arcjetDenied`, `reason`, `message`, `retryable`, `retryAfterSeconds`). On unavailable with default `onGuardError: "deny"`: `{ reason: "ERROR", retryable: true, retryAfterSeconds: 5 }`; capture `outcome: "unavailable"`.

Peers: `ai@^7`, `@ai-sdk/provider-utils@^5` (optional).

Root README also shows **request-path** protection of a Vercel AI `POST /api/chat` with `@arcjet/next` (`detectBot`, `tokenBucket`, `sensitiveInfo`, `detectPromptInjection`, `shield`) — HTTP front door, not tool wrapping.

### E.4 Vercel Eve v0 (`@arcjet/guard/vercel-eve/v0`)

Requires Eve `>=0.25.1 <1` and **Node ≥ 24**.

| Surface | Role |
| --- | --- |
| `guardTool` | Wrap tool `execute` |
| `guardApproval` | Assignable to `ToolDefinition.approval`, `OpenAPIConnectionDefinition.approval`, **`McpClientConnectionDefinition.approval`** |
| `guardInbound` | Channel text screening; default action `"message.received"` |
| `arcjetHooks` | Capture session/turn/tool/subagent events |
| `eveAgentContext` | Session id + principal |

This is the only **MCP** integration in source: gating **Eve’s MCP client connections** (outbound tools), not hosting an MCP server.

### E.5 Prompt injection (how detected, block vs allow)

- **Where:** Cloud Decide/Guard, not WASM. Local rule is a stub (`NOT_RUN` ALLOW) so the server runs inference.
- **Input:** request: `detectPromptInjectionMessage`; Guard: `detectPromptInjection()(text)` → `inputText`.
- **Output:** request: `reason.isPromptInjection()`, `injectionDetected`; `score` **deprecated**. Guard: `conclusion` + `reason === "PROMPT_INJECTION"`; no score on Guard result type.
- **Block vs allow:** `mode: "LIVE"` denies; `"DRY_RUN"` evaluates but does not deny. Application must check `isDenied()` / `conclusion === "DENY"` (request SDK does not throw).
- **Models:** not named in this repo (server-side). Guard result may include `billing: { unit, count }` (tokens).
- **Signals:** no local feature list; message text is the signal.

### E.6 Identity of caller / agent / tool

| Channel | Mechanism |
| --- | --- |
| HTTP client | Fingerprint from `characteristics` (default IP); optional `userId` etc. |
| Guard actor | App-asserted string; remote `requiresActor` |
| Tool name / action | `label` / `action` slug (`resource.verb`) |
| Agent type | `securityMetadata.agent` (optional string) |
| User | `securityMetadata.user` (opaque ID, docs: not PII) |
| Correlation | `correlationId` (max 256 printable ASCII) |
| Eve | Session id, continuation token, `eve.phase`, `eve.tool`, `eve.call` metadata |

No cryptographic agent identity, no SPIFFE, no tool-signing.

### E.7 Examples in this repo

| Example | Location |
| --- | --- |
| Vercel AI chat route (request SDK) | Root `README.md` |
| Guard quick start, custom rules, capture, AI SDK, Eve | `arcjet-guard/README.md` |
| Coding-agent skills | `arcjet-guard/skills/integrate-arcjet-guard-agents/SKILL.md`, `…-eve/SKILL.md` |
| LangChain | **Absent** |
| Runnable `examples/` tree | **Removed** (1.10.0); external: `github.com/arcjet/example-*` |

---

## F) Gaps vs Gartner in-market bar

Gartner counts a vendor in-market only if they **natively** cover **all three** mandatory categories. **This JS/TS SDK, on the evidence in this repository, does not.**

| Mandatory category | SDK coverage | Gap |
| --- | --- | --- |
| 1. Visibility & traceability | Partial telemetry (`decision.id`, `capture`, `correlationId`, Eve hooks) for **code you wrap** | No agent catalog; no shadow/rogue discovery; no tool/data/agent maps; no ownership model; no tamper-evident audit |
| 2. Continuous assurances | Absent | No AI agent posture management, drift, or continuous assessment of the agent estate |
| 3. Runtime inspection & enforcement | Partial allow/deny at call sites | Prompt injection + input constraints ≠ agent alignment; no agent anomaly detection; no runtime adaptation |

**What this SDK *does* natively (narrower than Gartner):** in-process + Cloud **pre-action enforcement** for HTTP requests and for explicit Guard call sites (tools, jobs, MCP *handlers you write*, Eve tools/connections/channels): rate limits, bot/WAF (HTTP only), PII block (local), prompt-injection block (Cloud), optional remote label policies, best-effort event capture.

**Implications for a PM mapping**

- Do not treat README “authorize agent tool calls” as a Gartner tool-authorization / catalog feature. It is **wrap `execute` and `guard()`**.
- Do not treat `https://api.arcjet.com/mcp` as Guardian-Agent MCP runtime protection; it is **developer MCP for Arcjet sites/keys**.
- Cloud dashboard / policy compiler / Decide models are **out of this repo**. Even if those products add catalog or posture later, **this SDK does not implement them**.
- Uninstrumented agents, shadow MCP servers, and tools not passed through `guardTool`/`guard()`/`protect()` are invisible and unenforced.

---

## Appendix: Beta / GA / flags (1.10.0)

| Item | Status |
| --- | --- |
| `detectPromptInjection` | GA; `experimental_detectPromptInjection` deprecated alias |
| `threshold` / `score` on PI | Deprecated; server no longer respects them |
| `experimental_moderateContent` | Experimental (Guard only) |
| `@arcjet/sensitive-info-rampart` | GA since 1.9.0 |
| Guard `capture`, remote policy, AI SDK v7 helpers, Eve v0 | New in 1.10.0 (GA exports, not `experimental_` prefix) |
| `setRateLimitHeaders` | Experimental HTTP header draft |
| `ArcjetEdgeRuleReason` | Deprecated, unused |
| Guard `hasError()` | Deprecated; use `hasFailedOpen()` / `errorResults()` / `warnings` |
| Feature flags | None |

Modes that change behavior: `LIVE` vs `DRY_RUN`; Guard `onGuardError: "allow" \| "deny"`; optional Rampart `backend`; `ARCJET_LOG_LEVEL`.
