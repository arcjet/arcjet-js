/**
 * How a denied tool result is kept from the model on `PostToolUse`.
 *
 * The CLI accepts `updatedToolOutput` for an MCP tool in any shape. For a
 * built-in tool it validates the replacement against that tool's output
 * schema, and a mismatch sends the **original** result to the model without
 * telling the SDK. The schemas are not published, so only tools whose shape
 * an integration test drives through the bundled CLI are listed here; every
 * other tool is stopped instead (`continue: false`).
 */

/** Built-in tools whose denied result is replaced. Every `mcp__` tool is replaced too. */
export const REPLACEABLE_BUILTIN_TOOLS: ReadonlySet<string> = new Set(["Bash", "Read"]);

const MCP_PREFIX = "mcp__";

/** Whether a denied result from `toolName` is replaced rather than stopping the run. */
export function canReplaceResult(toolName: string): boolean {
  return toolName.startsWith(MCP_PREFIX) || REPLACEABLE_BUILTIN_TOOLS.has(toolName);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function serialized(value: unknown): string {
  try {
    const text = JSON.stringify(value);
    return typeof text === "string" ? text : String(value);
  } catch {
    return String(value);
  }
}

function mcpText(response: unknown): string | undefined {
  if (!Array.isArray(response)) {
    return undefined;
  }
  const texts: string[] = [];
  for (const block of response) {
    if (isRecord(block) && block["type"] === "text" && typeof block["text"] === "string") {
      texts.push(block["text"]);
    }
  }
  return texts.join("\n");
}

function bashText(response: unknown): string | undefined {
  if (!isRecord(response)) {
    return undefined;
  }
  const parts: string[] = [];
  for (const field of ["stdout", "stderr"]) {
    const value = response[field];
    if (typeof value === "string" && value.length > 0) {
      parts.push(value);
    }
  }
  return parts.join("\n");
}

function readText(response: unknown): string | undefined {
  if (!isRecord(response) || response["type"] !== "text") {
    return undefined;
  }
  const file = response["file"];
  if (!isRecord(file) || typeof file["content"] !== "string") {
    return undefined;
  }
  return file["content"];
}

/**
 * Every text block in an authored tool's `CallToolResult`, joined in order.
 * Never shortened; non-text blocks are skipped.
 */
export function callToolResultText(result: unknown): string {
  return (isRecord(result) ? mcpText(result["content"]) : undefined) ?? "";
}

/**
 * The text a screen reads from a tool's result. Never shortened.
 *
 * MCP text blocks in order, Bash's `stdout` and `stderr`, Read's file
 * content, and for anything else the whole result serialized as JSON.
 */
export function toolResultText(toolName: string, response: unknown): string {
  let text: string | undefined;
  if (toolName.startsWith(MCP_PREFIX)) {
    text = mcpText(response);
  } else if (toolName === "Bash") {
    text = bashText(response);
  } else if (toolName === "Read") {
    text = readText(response);
  }
  return text ?? serialized(response);
}

/**
 * An `updatedToolOutput` carrying `text`, or `undefined` when the CLI would
 * not accept one for `toolName`.
 */
export function replacementOutput(toolName: string, response: unknown, text: string): unknown {
  if (toolName.startsWith(MCP_PREFIX)) {
    return [{ type: "text", text }];
  }
  if (toolName === "Bash") {
    return { stdout: text, stderr: "", interrupted: false };
  }
  if (toolName === "Read") {
    const file = isRecord(response) ? response["file"] : undefined;
    const path = isRecord(file) ? file["filePath"] : undefined;
    return {
      type: "text",
      file: {
        filePath: typeof path === "string" ? path : "",
        content: text,
        numLines: 1,
        startLine: 1,
        totalLines: 1,
      },
    };
  }
  return undefined;
}
