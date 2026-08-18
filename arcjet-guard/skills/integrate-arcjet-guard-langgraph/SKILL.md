---
name: integrate-arcjet-guard-langgraph
description: Integrate Arcjet security into a LangGraph Graph API agent using @arcjet/guard — wrap tool() / StructuredTool, wrap ToolNode for unwrapped MCP tools, and read thread_id for correlation. Use when asked to add Arcjet to a LangGraph StateGraph / ToolNode agent, rate limit its tools, screen inbound messages, or block prompt injection / PII.
license: Apache-2.0
compatibility: Requires the target app to use LangGraph (@langchain/langgraph >=1 <2) on Node.js >= 22. This is Graph API (StateGraph + ToolNode), not LangChain createAgent.
metadata:
  author: arcjet
---

# Integrate Arcjet Guard into a LangGraph agent

`@arcjet/guard`'s LangGraph v1 namespace wraps the agent's existing Arcjet
client. It never talks to the Arcjet API itself. Two surfaces, one
decision rule:

- **An authored tool** (`tool()` / `StructuredTool`) → `guardTool()`. DENY
  returns a structured `ArcjetDenialResult`. Do not throw.
- **MCP / runtime-discovered / unwrapped tools** → `guardToolNode()`.
  Guards the tools a `ToolNode` from `@langchain/langgraph/prebuilt`
  executes, in place, so execute still hits Guard. Already-branded tools
  are skipped (no double-call).
- **Correlation** → `langgraphAgentContext()` reads
  `configurable.thread_id`, then the run id, then `checkpoint_ns`. It never
  mints a new id.

This namespace is LangGraph **Graph API** (`StateGraph` + `ToolNode`).
`createReactAgent` is deprecated in LangGraph JS v1 in favor of LangChain
`createAgent` / `wrapToolCall`. Do not build on `createReactAgent`. Do not
use this path for a LangChain `createAgent` app — that is a later adapter.

## Screen inbound before `invoke` (or at the first graph node)

There is no first-class LangGraph channel for inbound screening, so there
is no `guardInbound`. Put prompt-injection (and other inbound rules) in
the application before `graph.invoke`, or in the graph's first node.

## `interrupt()` is not a policy gate

`interrupt()` / `interrupt_before=["tools"]` is human-in-the-loop, not
policy. Same trap as Mastra `requireApproval` and Claude `canUseTool`.
There is no `guardInterrupt` and no `guardApproval`. Do not wrap them as
Guard.

## `ToolNode` is the deny point for tools; hooks / HITL cannot enforce

Unwrapped and MCP tools run inside `ToolNode`. Graph hooks and HITL
pauses cannot stop `tool.invoke`. Use `guardToolNode` (or `guardTool` for
authored tools you invoke yourself).

`guardToolNode` guards the node's tools **in place** and returns the same
node. `ToolNode`'s constructor captures
`func: (input, config) => this.run(input, config)` and `run` reads
`this.tools`, so guarding a copy would leave the original node running
unguarded tools. This also means a caller still holding the pre-wrap node
cannot bypass Guard.

## Questions to ask the human first

Ask only what you cannot infer from the code; suggest defaults.

1. Which tools are **risky** (external side effects, irreversible, spends
   money, sends messages)? Those get `guardTool`. MCP / tools you did not
   author get `guardToolNode`.
2. What **limits**? (e.g. "10 lookups/min per order" → `tokenBucket`.)
3. Who is the **user** for metadata — an opaque user/tenant ID (never PII)?
   Default: none. Pass it via `metadata` on the policy. `thread_id` is the
   correlation id, not the user.
4. Is an Arcjet outage unacceptable? Every helper defaults to
   `onGuardError: "deny"`. Ask explicitly about inbound screening before
   `invoke`: failing closed there means the graph does not run for the
   duration of the outage, so `"allow"` is a routine and legitimate
   choice at that one call site.

## The six things readers get wrong

1. **There is no `guardInbound`.** Screen prompt injection before
   `graph.invoke` or in the first graph node.
2. **`interrupt()` is not a policy gate.** It is HITL. Use `guardTool` or
   `guardToolNode`.
3. **The import path is versioned and there is no alias.**
   `@arcjet/guard/langgraph/v1`. `@arcjet/guard/langgraph` does not resolve.
4. **Correlation is read, never minted.** Do not call `createAgentContext`
   inside a LangGraph callback — that generates a second id and splits the
   Sequence. `langgraphAgentContext` reads `thread_id` / `checkpoint_ns` /
   run id and omits `correlationId` when none of those is a valid id.
5. **Do not double-wrap with `@arcjet/guard/vercel-ai/v7`.** LangGraph
   tools are LangChain `tool()`, but this namespace brands them. `guardTool`
   throws if the tool already carries the Arcjet protection brand.
   `guardToolNode` skips already-branded tools so Guard is not double-called.
6. **A denial from `guardTool` is a structured object, not a throw.**
   `ToolNode` turns it into a real `ToolMessage`. Because the tool did not
   throw, that message's `status` is `success` — the denial is in the
   payload (`arcjetDenied: true`). Do not fabricate a `ToolMessage`
   yourself to force `status: "error"`: an object that only looks like a
   message reaches the graph's message reducer and crashes it. If `onDeny`
   throws, the tool still does not run and the model still receives the
   default denial.

## Step 1: Install and find the guard client

Install `@arcjet/guard` (required), plus `@langchain/langgraph` and
`@langchain/core` (optional peers, needed for
`@arcjet/guard/langgraph/v1`). Always use the versioned path:
`@arcjet/guard/langgraph/v1` resolves; `@arcjet/guard/langgraph` throws
`ERR_PACKAGE_PATH_NOT_EXPORTED`.

```sh
npm install @arcjet/guard @langchain/langgraph @langchain/core
```

If the agent has no guard client yet, launch one **once at module scope**:

```ts
import { launchArcjet } from "@arcjet/guard";

export const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
```

## Step 2: Gate authored tools

```ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { guardTool } from "@arcjet/guard/langgraph/v1";
import { tokenBucket, localDetectSensitiveInfo } from "@arcjet/guard";

import { arcjet } from "./arcjet.js";

const lookupLimit = tokenBucket({
  bucket: "lookups",
  refillRate: 10,
  intervalSeconds: 60,
  maxTokens: 10,
});
// Factory then text — same shape as `detectPromptInjection()(text)`.
// Scan free-text args (a note, reason, body). An opaque `orderId` will
// not trip EMAIL / phone / card / IP, so do not pass it here.
const detectPii = localDetectSensitiveInfo();

export const lookupOrder = guardTool(
  arcjet,
  tool(async ({ orderId, note }) => ({ orderId, note, status: "shipped" }), {
    name: "lookup_order",
    description: "Look up an order by ID",
    schema: z.object({
      orderId: z.string(),
      note: z.string(),
    }),
  }),
  {
    action: "order.looked-up",
    rules: (input) => [lookupLimit({ key: input.orderId, requested: 1 }), detectPii(input.note)],
  },
);
```

- Omit `rules` to submit none. The guard call still happens.
- On DENY the tool's `func` / `invoke` never runs. The model receives
  `{ arcjetDenied: true, reason, message, retryable }` as the tool result
  content. If you invoke a guarded tool outside `ToolNode`, read that
  object and build your own `ToolMessage` rather than pushing it into
  `messages`.
- Default `onGuardError: "deny"` blocks the tool if Arcjet is unreachable.

## Step 3: Screen inbound before invoke

```ts
import { detectPromptInjection } from "@arcjet/guard";
import { langgraphAgentContext } from "@arcjet/guard/langgraph/v1";

import { arcjet } from "./arcjet.js";

const config = { configurable: { thread_id: conversationId } };
const inbound = detectPromptInjection();
const decision = await arcjet.guard({
  label: "message.received",
  rules: [inbound(userText)],
  ...langgraphAgentContext(config),
});

if (decision.conclusion === "DENY") {
  throw new Error("message blocked");
}

await graph.invoke({ messages: [{ role: "user", content: userText }] }, config);
```

Or put the same screen in the graph's first node. There is no
`guardInbound`.

## Step 4: Gate tools you did not wrap

```ts
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { guardToolNode } from "@arcjet/guard/langgraph/v1";
import { tokenBucket } from "@arcjet/guard";

import { arcjet } from "./arcjet.js";

const mcpLimit = tokenBucket({
  bucket: "mcp-access",
  refillRate: 20,
  intervalSeconds: 60,
  maxTokens: 20,
});

export const tools = guardToolNode(arcjet, new ToolNode(mcpTools), {
  action: ({ toolName }) => `${toolName}.invoked`,
  rules: ({ toolName }) => [mcpLimit({ key: toolName, requested: 1 })],
});
```

Pass the wrapped node to `StateGraph.addNode("tools", tools)`. It is the
same node object you passed in, with its tools guarded in place. Use this
for tools you did **not** pass through `guardTool`. `guardToolNode` skips
already-branded tools, so applying both to the same authored tool does not
double-call the guard. Tools discovered after wrapping are guarded on the
next `invoke`.

## Step 5: Correlation

Pass the checkpointer `thread_id` you already have on
`graph.invoke(input, { configurable: { thread_id } })`.
`langgraphAgentContext` reads it; it never calls `createAgentContext`.

```ts
const config = { configurable: { thread_id: conversationId } };
await graph.invoke({ messages }, config);
```

Preference order: `configurable.thread_id`, then the run id, then
`configurable.checkpoint_ns`. The namespace is last because it names one
subgraph (`""` for the parent), so preferring it would split sibling
subgraphs of a single run across correlation ids. If none is a valid 1–256
printable-ASCII string, the call is uncorrelated rather than joined to a
generated id nobody has.

## Verify the integration

1. `npm run typecheck` passes.
2. Exercise inbound PI (before invoke), a tool deny, PII on args, a rate
   limit, an unwrapped ToolNode deny, and fail-closed (an unreachable
   guard).
3. Confirm in the Arcjet dashboard that decisions share the thread id as
   their correlation id.
4. Manual E2E with a real `ARCJET_KEY` is still-to-verify until you run it.

A full working demo will land in
[`arcjet/examples` `langgraph-agent`](https://github.com/arcjet/examples/tree/main/examples/langgraph-agent)
with [arcjet/examples#193](https://github.com/arcjet/examples/pull/193).
Do not add an example under `examples/` in the JS SDK repo.

Note: capture events are fire-and-forget and batched, so events can lag the
decisions they accompany by a few seconds. A dropped event is diagnosed,
never thrown.
