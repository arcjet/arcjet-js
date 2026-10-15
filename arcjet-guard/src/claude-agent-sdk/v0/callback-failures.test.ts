// oxlint-disable eslint/no-unsafe-type-assertion, eslint/require-await, eslint/explicit-function-return-type -- cases pass deliberately ill-typed callbacks through the policy
import {
  callbackFailureCases,
  captureOnlyCallbackFailureCases,
} from "../../../test/_shared/callback-failures.ts";
import { guardTool } from "./guard-tool.ts";
import { guardHooks } from "./hooks.ts";

callbackFailureCases({
  name: "claude-agent-sdk guardTool",
  action: "order.looked-up",
  metadata: true,
  sessionId: true,
  allowedOutcome: "success",
  degradedOutcome: "degraded",
  async run(client, policy) {
    let ran = false;
    const tool = {
      name: "test-tool",
      description: "test tool",
      inputSchema: {},
      handler: async (_input: unknown, _extra: unknown) => {
        ran = true;
        return { content: [{ type: "text" as const, text: "ok" }] };
      },
    };
    const wrapped = guardTool(client, tool, { action: "order.looked-up", ...policy } as never);
    await wrapped.handler({ note: "hello" }, { session_id: "s" });
    return ran;
  },
});

type Hook = (
  input: unknown,
  toolUseId: string,
  options: { signal: AbortSignal },
) => Promise<unknown>;

function hookFor(matchers: unknown): Hook {
  return (matchers as { hooks: Hook[] }[])[0].hooks[0];
}

callbackFailureCases({
  name: "claude-agent-sdk guardHooks PreToolUse",
  action: "tool.invoked",
  fallbackAction: "tool.invoked",
  metadata: true,
  sessionId: false,
  allowedOutcome: "allowed",
  degradedOutcome: "allowed",
  async run(client, policy) {
    const hooks = guardHooks(client, policy as never);
    const result = await hookFor(hooks.PreToolUse)(
      {
        hook_event_name: "PreToolUse",
        session_id: "session-hooks",
        transcript_path: "/tmp/t.jsonl",
        cwd: "/tmp",
        tool_name: "Bash",
        tool_input: { command: "ls" },
        tool_use_id: "tu-1",
      },
      "tu-1",
      { signal: new AbortController().signal },
    );
    return Object.keys(result as object).length === 0;
  },
});

callbackFailureCases({
  name: "claude-agent-sdk guardHooks UserPromptSubmit",
  action: "message.received",
  fallbackAction: "message.received",
  metadata: true,
  sessionId: false,
  allowedOutcome: "allowed",
  degradedOutcome: "allowed",
  async run(client, policy) {
    const hooks = guardHooks(client, { inbound: policy } as never);
    const result = await hookFor(hooks.UserPromptSubmit)(
      {
        hook_event_name: "UserPromptSubmit",
        session_id: "session-hooks",
        transcript_path: "/tmp/t.jsonl",
        cwd: "/tmp",
        prompt: "hello",
      },
      "tu-1",
      { signal: new AbortController().signal },
    );
    return Object.keys(result as object).length === 0;
  },
});

captureOnlyCallbackFailureCases({
  name: "claude-agent-sdk guardHooks PostToolUse",
  action: "tool.invoked",
  outcome: "success",
  async run(client, policy) {
    const hooks = guardHooks(client, policy as never);
    await hookFor(hooks.PostToolUse)(
      {
        hook_event_name: "PostToolUse",
        session_id: "session-hooks",
        transcript_path: "/tmp/t.jsonl",
        cwd: "/tmp",
        tool_name: "Bash",
        tool_input: { command: "ls" },
        tool_response: { ok: true },
        tool_use_id: "tu-1",
      },
      "tu-1",
      { signal: new AbortController().signal },
    );
  },
});
