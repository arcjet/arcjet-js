// oxlint-disable eslint/no-unsafe-type-assertion, eslint/explicit-function-return-type, eslint/require-await -- test infrastructure and mocks
/**
 * `guardHooks({ toolResults })` through the CLI bundled with
 * `@anthropic-ai/claude-agent-sdk`.
 *
 * The CLI talks to a scripted, local Messages API: the first request that
 * offers tools gets one `tool_use`, and the request that carries its
 * `tool_result` is recorded. That record is what the model would read, so these
 * tests check the replacement shapes against the CLI's own validation, which
 * sends the original result, without saying so, when a shape does not match.
 * No network access and no API key are used.
 */
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { createSdkMcpServer, query, tool } from "@anthropic-ai/claude-agent-sdk";

import { guardHooks } from "../../src/claude-agent-sdk/v0/hooks.ts";
import { decisionAllow, decisionDenyPromptInjection, fakeRule } from "../_shared/stub-client.ts";

// Derived rather than imported: the file is at the lint's import limit.
type ArcjetAgentClient = Parameters<typeof guardHooks>[0];
type Decision = ReturnType<typeof decisionAllow>;

interface Recorded {
  toolSent: boolean;
  toolResults: Record<string, unknown>[] | undefined;
}

function sse(events: [string, Record<string, unknown>][]): string {
  return events.map(([name, data]) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`).join("");
}

function message(block: Record<string, unknown>, stopReason: string): string {
  const start =
    block["type"] === "text"
      ? { type: "text", text: "" }
      : { type: "tool_use", id: block["id"], name: block["name"], input: {} };
  const delta =
    block["type"] === "text"
      ? { type: "text_delta", text: block["text"] }
      : { type: "input_json_delta", partial_json: JSON.stringify(block["input"]) };
  return sse([
    [
      "message_start",
      {
        type: "message_start",
        message: {
          id: "msg_scripted",
          type: "message",
          role: "assistant",
          model: "claude-scripted",
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 1, output_tokens: 1 },
        },
      },
    ],
    ["content_block_start", { type: "content_block_start", index: 0, content_block: start }],
    ["content_block_delta", { type: "content_block_delta", index: 0, delta }],
    ["content_block_stop", { type: "content_block_stop", index: 0 }],
    [
      "message_delta",
      {
        type: "message_delta",
        delta: { stop_reason: stopReason, stop_sequence: null },
        usage: { output_tokens: 1 },
      },
    ],
    ["message_stop", { type: "message_stop" }],
  ]);
}

function toolResultsIn(body: Record<string, unknown>): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  for (const entry of (body["messages"] as Record<string, unknown>[] | undefined) ?? []) {
    const content = entry["content"];
    if (!Array.isArray(content)) continue;
    for (const block of content as Record<string, unknown>[]) {
      if (block["type"] === "tool_result") found.push(block);
    }
  }
  return found;
}

async function run(
  toolName: string,
  toolInput: Record<string, unknown>,
  decision: Decision,
): Promise<Recorded> {
  const recorded: Recorded = { toolSent: false, toolResults: undefined };
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => (raw += chunk.toString()));
    req.on("end", () => {
      if (!req.url?.startsWith("/v1/messages") || req.url.includes("count_tokens")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end('{"input_tokens": 1}');
        return;
      }
      const body = JSON.parse(raw === "" ? "{}" : raw) as Record<string, unknown>;
      const offered = ((body["tools"] as { name?: string }[] | undefined) ?? []).map((t) => t.name);
      const results = toolResultsIn(body);
      let payload: string;
      if (results.length > 0) {
        recorded.toolResults = results;
        payload = message({ type: "text", text: "done" }, "end_turn");
      } else if (offered.includes(toolName) && !recorded.toolSent) {
        recorded.toolSent = true;
        payload = message(
          { type: "tool_use", id: "toolu_scripted", name: toolName, input: toolInput },
          "tool_use",
        );
      } else {
        payload = message({ type: "text", text: "ok" }, "end_turn");
      }
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.end(payload);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  // guardHooks also registers the prompt and tool-call gates, which must allow
  // so the tool runs; only the result screen returns `decision`.
  const client: ArcjetAgentClient = {
    guard(opts: unknown): Promise<Decision> {
      const label = (opts as { label?: string }).label;
      return Promise.resolve(label === "tool.result" ? decision : decisionAllow());
    },
    capture(): void {},
  };
  const docs = createSdkMcpServer({
    name: "docs",
    tools: [
      tool("fetch", "Fetch a page", {}, async () => ({
        content: [{ type: "text", text: "page body from docs" }],
      })),
    ],
  });
  try {
    for await (const _message of query({
      prompt: "use the tool",
      options: {
        cwd: workdir,
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        maxTurns: 4,
        settingSources: [],
        mcpServers: { docs },
        hooks: guardHooks(client, { toolResults: { rules: () => [fakeRule] } }),
        env: {
          ...process.env,
          ANTHROPIC_BASE_URL: `http://127.0.0.1:${port}`,
          ANTHROPIC_API_KEY: "sk-ant-scripted",
          CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
          DISABLE_TELEMETRY: "1",
        },
      },
    })) {
      void _message;
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  return recorded;
}

const workdir = mkdtempSync(join(tmpdir(), "arcjet-cli-"));
writeFileSync(join(workdir, "notes.txt"), "line one\nfetched text\n");

function contentText(result: Record<string, unknown>): string {
  const content = result["content"];
  if (typeof content === "string") return content;
  return (content as { text?: string }[]).map((block) => block.text ?? "").join("");
}

function denied(result: Record<string, unknown>): Record<string, unknown> {
  const text = contentText(result);
  // Read numbers each line ("1\t…") before the model sees it.
  const body = /^\d+\t/.test(text) ? text.slice(text.indexOf("\t") + 1) : text;
  return JSON.parse(body) as Record<string, unknown>;
}

test("CLI: a Bash result is replaced", { timeout: 60_000 }, async () => {
  const recorded = await run(
    "Bash",
    { command: "echo fetched-text" },
    decisionDenyPromptInjection(),
  );
  const [result] = recorded.toolResults ?? [];
  assert.ok(result !== undefined);
  assert.doesNotMatch(contentText(result), /fetched-text/);
  assert.equal(denied(result)["arcjetDenied"], true);
});

test("CLI: a Read result is replaced", { timeout: 60_000 }, async () => {
  const recorded = await run(
    "Read",
    { file_path: join(workdir, "notes.txt") },
    decisionDenyPromptInjection(),
  );
  const [result] = recorded.toolResults ?? [];
  assert.ok(result !== undefined);
  assert.doesNotMatch(contentText(result), /fetched text/);
  assert.equal(denied(result)["arcjetDenied"], true);
});

test("CLI: an MCP result is replaced", { timeout: 60_000 }, async () => {
  const recorded = await run("mcp__docs__fetch", {}, decisionDenyPromptInjection());
  const [result] = recorded.toolResults ?? [];
  assert.ok(result !== undefined);
  assert.doesNotMatch(contentText(result), /page body/);
  assert.equal(denied(result)["arcjetDenied"], true);
});

test("CLI: a tool outside the table stops the run", { timeout: 60_000 }, async () => {
  const recorded = await run(
    "Write",
    { file_path: join(workdir, "new.txt"), content: "x" },
    decisionDenyPromptInjection(),
  );
  assert.equal(recorded.toolSent, true);
  assert.equal(recorded.toolResults, undefined);
});

test("CLI: an ALLOW sends the original result", { timeout: 60_000 }, async () => {
  const recorded = await run("Bash", { command: "echo fetched-text" }, decisionAllow());
  const [result] = recorded.toolResults ?? [];
  assert.ok(result !== undefined);
  assert.match(contentText(result), /fetched-text/);
});
