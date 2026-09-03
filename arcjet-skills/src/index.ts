import { VERSION } from "./version.js";

export { VERSION } from "./version.js";

/**
 * npm package name that TanStack Intent discovers as a skill source.
 */
export const PACKAGE_NAME = "@arcjet/skills" as const;

/**
 * Leaf skill names shipped in this package. Each matches
 * `skills/<name>/SKILL.md`.
 */
export type SkillName = "choose-protections" | "cli" | "guard" | "mcp" | "protect";

/**
 * Static manifest for one shipped skill. Intent reads the `SKILL.md` files
 * themselves; this export is for TypeScript consumers who want identities
 * without scanning `node_modules`.
 */
export interface SkillManifest {
  readonly name: SkillName;
  /**
   * When to load this skill. Kept in sync with the `SKILL.md` description.
   */
  readonly description: string;
  /**
   * Path to `SKILL.md` relative to the published package root.
   */
  readonly file: string;
  /**
   * Documentation this skill was derived from, relative to the package root.
   * Conservative stale checks flag these files when they change.
   */
  readonly sources: readonly string[];
}

const protectDescription: string =
  "Add Arcjet request protection to JavaScript and TypeScript HTTP handlers. Use when protecting Next.js, Express, Fastify, SvelteKit, Remix, Astro, Nuxt, Bun, Deno, NestJS, or Node.js routes with rate limiting, bot detection, Shield, email validation, or sensitive info detection.";

const chooseProtectionsDescription: string =
  "Choose which Arcjet rules address a security problem. Use when deciding between detectBot, shield, rate limits, detectPromptInjection, sensitiveInfo, validateEmail, filter, or Guard-only content moderation.";

const cliDescription: string =
  "Connect a project to Arcjet with the CLI: sign in, pick a team and site, and write ARCJET_KEY. Use when bootstrapping Arcjet, listing requests or guards, or managing remote rules from a terminal.";

const mcpDescription: string =
  "Connect an AI coding client to the Arcjet MCP server at https://api.arcjet.com/mcp. Use when the client has built-in MCP support or the CLI is not available.";

const guardDescription: string =
  "Add Arcjet Guard to non-HTTP JavaScript: agent tool calls, MCP handlers, queue workers, and background jobs. Use when there is no HTTP request object, or when the user asks to guard tools, rate-limit agent actions, or block prompt injection on tool arguments.";

/**
 * Skills shipped in this package version. Load only the entry that matches
 * the current task (`@arcjet/skills#<name>`).
 */
export const skills: readonly SkillManifest[] = [
  {
    name: "protect",
    description: protectDescription,
    file: "skills/protect/SKILL.md",
    sources: ["docs/protect.md"],
  },
  {
    name: "choose-protections",
    description: chooseProtectionsDescription,
    file: "skills/choose-protections/SKILL.md",
    sources: ["docs/choose-protections.md"],
  },
  {
    name: "cli",
    description: cliDescription,
    file: "skills/cli/SKILL.md",
    sources: ["docs/cli.md"],
  },
  {
    name: "mcp",
    description: mcpDescription,
    file: "skills/mcp/SKILL.md",
    sources: ["docs/mcp.md"],
  },
  {
    name: "guard",
    description: guardDescription,
    file: "skills/guard/SKILL.md",
    sources: ["docs/guard.md"],
  },
];

/**
 * Format a TanStack Intent load identity (`@arcjet/skills#protect`).
 */
export function skillIdentity(name: SkillName): string {
  return `${PACKAGE_NAME}#${name}`;
}

/**
 * Look up one shipped skill by leaf name.
 */
export function getSkill(name: SkillName): SkillManifest | undefined {
  return skills.find((skill) => skill.name === name);
}

/**
 * Package version these skills were published with.
 */
export function skillLibraryVersion(): string {
  return VERSION;
}
