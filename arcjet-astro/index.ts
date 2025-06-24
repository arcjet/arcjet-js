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
import { z, type ZodType, type ZodTypeDef } from "astro/zod";
import fs from "node:fs/promises";

const resolvedVirtualClientId = "\0ARCJET_VIRTUAL_CLIENT";

const validateMode = z.enum(["LIVE", "DRY_RUN"]);
const validateProxies = z.array(z.string());
const validateCharacteristics = z.array(z.string());
const validateClientOptions = z
  .object({
    baseUrl: z.string(),
    timeout: z.number(),
  })
  .strict()
  .optional();

const validateShieldOptions = z
  .object({
    mode: validateMode,
  })
  .strict()
  .optional();

const validateBotOptions = z
  .union([
    z
      .object({
        mode: validateMode,
        allow: z.array(z.string()),
      })
      .strict(),
    z
      .object({
        mode: validateMode,
        deny: z.array(z.string()),
      })
      .strict(),
  ])
  .optional();

const validateEmailOptions = z
  .union([
    z
      .object({
        mode: validateMode,
        allow: z.array(z.string()),
        requireTopLevelDomain: z.boolean(),
        allowDomainLiteral: z.boolean(),
      })
      .strict(),
    z
      .object({
        mode: validateMode,
        deny: z.array(z.string()),
        requireTopLevelDomain: z.boolean(),
        allowDomainLiteral: z.boolean(),
      })
      .strict(),
  ])
  .optional();

const validateSensitiveInfoOptions = z
  .union([
    z
      .object({
        mode: validateMode,
        allow: z.array(z.string()),
        contextWindowSize: z.number(),
      })
      .strict(),
    z
      .object({
        mode: validateMode,
        deny: z.array(z.string()),
        contextWindowSize: z.number(),
      })
      .strict(),
  ])
  .optional();

const validateFixedWindowOptions = z
  .object({
    mode: validateMode,
    characteristics: validateCharacteristics,
    window: z.union([z.string(), z.number()]),
    max: z.number(),
  })
  .strict()
  .optional();

const validateSlidingWindowOptions = z
  .object({
    mode: validateMode,
    characteristics: validateCharacteristics,
    interval: z.union([z.string(), z.number()]),
    max: z.number(),
  })
  .strict()
  .optional();

const validateTokenBucketOptions = z
  .object({
    mode: validateMode,
    characteristics: validateCharacteristics,
    refillRate: z.number(),
    interval: z.union([z.string(), z.number()]),
    capacity: z.number(),
  })
  .strict()
  .optional();

const validateProtectSignupOptions = z
  .object({
    rateLimit: validateSlidingWindowOptions,
    bots: validateBotOptions,
    email: validateEmailOptions,
  })
  .strict()
  .optional();

type IntegrationRule =
  | {
      type: "shield";
      options?: ShieldOptions;
    }
  | {
      type: "bot";
      options?: BotOptions;
    }
  | {
      type: "email";
      options?: EmailOptions;
    }
  | {
      type: "sensitiveInfo";
      // TODO: This only supports serializable options, so no custom detect
      // functions are supported but maybe they could be supported via a module
      // import
      options?: SensitiveInfoOptions;
    }
  | {
      type: "fixedWindow";
      options?: FixedWindowRateLimitOptions;
    }
  | {
      type: "slidingWindow";
      options?: SlidingWindowRateLimitOptions;
    }
  | {
      type: "tokenBucket";
      options?: TokenBucketRateLimitOptions;
    }
  | {
      type: "protectSignup";
      options?: ProtectSignupOptions;
    };

// TODO: This only supports serializable options, so no custom loggers are
// supported but maybe they could be supported via a module import
type ArcjetIntegrationOptions = {
  rules: IntegrationRule[];
  characteristics?: ReadonlyArray<string>;
  client?: RemoteClientOptions;
  proxies?: string[];
};

function validateAndSerialize<
  Output = any,
  Def extends ZodTypeDef = ZodTypeDef,
  Input = Output,
>(schema: ZodType<Output, Def, Input>, value: unknown): string {
  const v = schema.parse(value);
  return v ? JSON.stringify(v) : "";
}

function integrationRuleToClientRule(rule: IntegrationRule) {
  switch (rule.type) {
    case "shield": {
      const serializedOpts = validateAndSerialize(
        validateShieldOptions,
        rule.options,
      );
      return {
        importName: `shield`,
        code: `shield(${serializedOpts})`,
      } as const;
    }
    case "bot": {
      const serializedOpts = validateAndSerialize(
        validateBotOptions,
        rule.options,
      );
      return {
        importName: `detectBot`,
        code: `detectBot(${serializedOpts})`,
      } as const;
    }
    case "email": {
      const serializedOpts = validateAndSerialize(
        validateEmailOptions,
        rule.options,
      );
      return {
        importName: `validateEmail`,
        code: `validateEmail(${serializedOpts})`,
      } as const;
    }
    case "sensitiveInfo": {
      const serializedOpts = validateAndSerialize(
        validateSensitiveInfoOptions,
        rule.options,
      );
      return {
        importName: `sensitiveInfo`,
        code: `sensitiveInfo(${serializedOpts})`,
      } as const;
    }
    case "fixedWindow": {
      const serializedOpts = validateAndSerialize(
        validateFixedWindowOptions,
        rule.options,
      );
      return {
        importName: `fixedWindow`,
        code: `fixedWindow(${serializedOpts})`,
      } as const;
    }
    case "slidingWindow": {
      const serializedOpts = validateAndSerialize(
        validateSlidingWindowOptions,
        rule.options,
      );
      return {
        importName: `slidingWindow`,
        code: `slidingWindow(${serializedOpts})`,
      } as const;
    }
    case "tokenBucket": {
      const serializedOpts = validateAndSerialize(
        validateTokenBucketOptions,
        rule.options,
      );
      return {
        importName: `tokenBucket`,
        code: `tokenBucket(${serializedOpts})`,
      } as const;
    }
    case "protectSignup": {
      const serializedOpts = validateAndSerialize(
        validateProtectSignupOptions,
        rule.options,
      );
      return {
        importName: `protectSignup`,
        code: `protectSignup(${serializedOpts})`,
      } as const;
    }
    default: {
      const _exhaustive: never = rule;
      throw new Error("Cannot convert rule via integration");
    }
  }
}

// Mirror the rule functions in the SDK but produce serializable rules
export function shield(options?: ShieldOptions) {
  return { type: "shield", options } as const;
}

export function detectBot(options?: BotOptions) {
  return { type: "bot", options } as const;
}

export function validateEmail(options?: EmailOptions) {
  return { type: "email", options } as const;
}

export function sensitiveInfo(options?: SensitiveInfoOptions) {
  return { type: "sensitiveInfo", options } as const;
}

export function fixedWindow(options?: FixedWindowRateLimitOptions) {
  return { type: "fixedWindow", options } as const;
}

export function slidingWindow(options?: SlidingWindowRateLimitOptions) {
  return { type: "slidingWindow", options } as const;
}

export function tokenBucket(options?: TokenBucketRateLimitOptions) {
  return { type: "tokenBucket", options } as const;
}

export function protectSignup(options?: ProtectSignupOptions) {
  return { type: "protectSignup", options } as const;
}

export type RemoteClientOptions = {
  baseUrl?: string;
  timeout?: number;
};

export function createRemoteClient({ baseUrl, timeout }: RemoteClientOptions) {
  return { baseUrl, timeout } as const;
}

export default function arcjet(
  { rules, characteristics, client, proxies }: ArcjetIntegrationOptions = {
    rules: [],
  },
): AstroIntegration {
  const arcjetImports = new Set();
  const arcjetRules: string[] = [];
  for (const rule of rules) {
    const { importName, code } = integrationRuleToClientRule(rule);
    arcjetImports.add(importName);
    arcjetRules.push(code);
  }

  const characteristicsInjection = characteristics
    ? `characteristics: ${validateAndSerialize(validateCharacteristics, characteristics)},`
    : "";

  const proxiesInjection = proxies
    ? `proxies: ${validateAndSerialize(validateProxies, proxies)},`
    : "";

  const clientInjection = client
    ? `client: createRemoteClient(${validateAndSerialize(validateClientOptions, client)}),`
    : "";

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
                          ${characteristicsInjection}
                          ${proxiesInjection}
                          ${clientInjection}
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
      "astro:config:done": async ({ buildOutput, injectTypes, logger }) => {
        if (buildOutput === "static") {
          logger.warn(
            "✦ Arcjet can only protect Dynamic routes.\n\n" +
              "  Configure at least 1 Dynamic route to use the Arcjet integration, see Astro's\n" +
              "  Dynamic routes documentation for configuration details:\n" +
              "  https://docs.astro.build/en/guides/routing/#dynamic-routes\n",
          );
        }

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
              ],
              ${characteristicsInjection}
              ${proxiesInjection}
              ${clientInjection}
            })
            export default client
          }`,
          filename: "client.d.ts",
        });
      },
    },
  };
}
