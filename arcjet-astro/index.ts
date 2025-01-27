import type {
  BotOptions,
  EmailOptions,
  FixedWindowRateLimitOptions,
  ProtectSignupOptions,
  SensitiveInfoOptions,
  ShieldOptions,
  SlidingWindowRateLimitOptions,
  TokenBucketRateLimitOptions,
} from "arcjet";
import type { AstroIntegration } from "astro";
import fs from "node:fs/promises";

const resolvedVirtualClientId = "\0ARCJET_VIRTUAL_CLIENT";

type IntegrationRule<Characteristics extends readonly string[]> =
  | {
      type: "shield";
      options: ShieldOptions;
    }
  | {
      type: "bot";
      options: BotOptions;
    }
  | {
      type: "email";
      options: EmailOptions;
    }
  | {
      type: "sensitiveInfo";
      options: SensitiveInfoOptions<never>;
    }
  | {
      type: "fixedWindow";
      options: FixedWindowRateLimitOptions<Characteristics>;
    }
  | {
      type: "slidingWindow";
      options: SlidingWindowRateLimitOptions<Characteristics>;
    }
  | {
      type: "tokenBucket";
      options: TokenBucketRateLimitOptions<Characteristics>;
    }
  | {
      type: "protectSignup";
      options: ProtectSignupOptions<Characteristics>;
    };

type ArcjetIntegrationOptions<Characteristics extends readonly string[]> = {
  rules: IntegrationRule<Characteristics>[];
};

function integrationRuleToClientRule<
  Characteristics extends readonly string[],
>({ type, options }: IntegrationRule<Characteristics>) {
  // TODO: validate rules options
  switch (type) {
    case "shield": {
      return {
        importName: `shield`,
        code: `shield(${JSON.stringify(options)})`,
      } as const;
    }
    case "bot": {
      return {
        importName: `detectBot`,
        code: `detectBot(${JSON.stringify(options)})`,
      } as const;
    }
    case "email": {
      return {
        importName: `validateEmail`,
        code: `validateEmail(${JSON.stringify(options)})`,
      } as const;
    }
    case "sensitiveInfo": {
      return {
        importName: `sensitiveInfo`,
        code: `sensitiveInfo(${JSON.stringify(options)})`,
      } as const;
    }
    case "fixedWindow": {
      return {
        importName: `fixedWindow`,
        code: `fixedWindow(${JSON.stringify(options)})`,
      } as const;
    }
    case "slidingWindow": {
      return {
        importName: `slidingWindow`,
        code: `slidingWindow(${JSON.stringify(options)})`,
      } as const;
    }
    case "tokenBucket": {
      return {
        importName: `tokenBucket`,
        code: `tokenBucket(${JSON.stringify(options)})`,
      } as const;
    }
    case "protectSignup": {
      return {
        importName: `tokenBucket`,
        code: `tokenBucket(${JSON.stringify(options)})`,
      } as const;
    }
    default: {
      const _exhaustive: never = type;
      // TODO: Warn instead?
      throw new Error("Cannot convert rule via integration");
    }
  }
}

// Mirror the rule functions in the SDK but produce serializable rules
export function shield(options: ShieldOptions) {
  return { type: "shield", options } as const;
}

export function detectBot(options: BotOptions) {
  return { type: "bot", options } as const;
}

export function validateEmail(options: EmailOptions) {
  return { type: "email", options } as const;
}

export function sensitiveInfo(options: SensitiveInfoOptions<never>) {
  return { type: "sensitiveInfo", options } as const;
}

export function fixedWindow<Characteristics extends readonly string[]>(
  options: FixedWindowRateLimitOptions<Characteristics>,
) {
  return { type: "fixedWindow", options } as const;
}

export function slidingWindow<Characteristics extends readonly string[]>(
  options: SlidingWindowRateLimitOptions<Characteristics>,
) {
  return { type: "slidingWindow", options } as const;
}

export function tokenBucket<Characteristics extends readonly string[]>(
  options: TokenBucketRateLimitOptions<Characteristics>,
) {
  return { type: "tokenBucket", options } as const;
}

export function protectSignup<Characteristics extends readonly string[]>(
  options: ProtectSignupOptions<Characteristics>,
) {
  return { type: "protectSignup", options } as const;
}

export default function arcjet<Characteristics extends readonly string[]>({
  rules,
}: ArcjetIntegrationOptions<Characteristics>): AstroIntegration {
  // TODO: this only supports serializable options, so no custom detect functions are supported
  // but maybe they could be supported via a module import?
  const arcjetImports = new Set();
  const arcjetRules: string[] = [];
  for (const rule of rules) {
    const { importName, code } = integrationRuleToClientRule(rule);
    arcjetImports.add(importName);
    arcjetRules.push(code);
  }

  return {
    name: "@arcjet/astro",
    hooks: {
      "astro:config:setup"({ updateConfig, addMiddleware }) {
        updateConfig({
          env: {
            schema: {
              ARCJET_KEY: {
                type: "string",
                context: "server",
                access: "secret",
                startsWith: "ajkey_",
              },
              ARCJET_ENV: {
                type: "enum",
                context: "server",
                access: "public",
                values: ["production", "development"],
                optional: true,
              },
              ARCJET_BASE_URL: {
                type: "string",
                context: "server",
                access: "public",
                startsWith: "https://",
                optional: true,
              },
              ARCJET_LOG_LEVEL: {
                type: "enum",
                context: "server",
                access: "public",
                values: ["debug", "info", "warn", "error"],
                optional: true,
              },
              FLY_APP_NAME: {
                type: "string",
                context: "server",
                access: "public",
                optional: true,
              },
              VERCEL: {
                type: "string",
                context: "server",
                access: "public",
                optional: true,
              },
            },
          },
          vite: {
            plugins: [
              {
                name: "@arcjet/astro",
                resolveId(id) {
                  if (id === "arcjet:client") {
                    return resolvedVirtualClientId;
                  }

                  return;
                },
                async load(id) {
                  if (id === resolvedVirtualClientId) {
                    const implSource = await fs.readFile(
                      new URL("./internal.js", import.meta.url),
                      { encoding: "utf-8" },
                    );

                    return {
                      code: `
                        ${implSource}

                        import {
                          ${Array.from(arcjetImports).join(",\n")}
                        } from "arcjet"

                        // Construct an Arcjet client for the virtual module
                        const aj = createArcjetClient({
                          key: ARCJET_KEY,
                          rules: [
                            ${arcjetRules.join(",\n")}
                          ],
                        })

                        export default aj;
                      `,
                    };
                  }
                },
              },
            ],
          },
        });
        addMiddleware({
          entrypoint: new URL("./middleware.js", import.meta.url),
          order: "pre",
        });
      },
      "astro:config:done": async ({ injectTypes }) => {
        const implTypes = await fs.readFile(
          new URL("./internal.d.ts", import.meta.url),
          { encoding: "utf-8" },
        );

        injectTypes({
          content: `
          declare module "arcjet:client" {
            ${implTypes}

            import {
              ${Array.from(arcjetImports).join(",\n")}
            } from "arcjet"

            const client = createArcjetClient({
              rules: [
                ${arcjetRules.join(",\n")}
              ]
            })
            export default client
          }`,
          filename: "client.d.ts",
        });
      },
    },
  };
}
