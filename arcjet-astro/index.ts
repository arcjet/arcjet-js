import type {
  BotOptions,
  EmailOptions,
  FilterOptions,
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
    baseUrl: z.string().optional(),
    timeout: z.number().optional(),
  })
  .strict()
  .optional();

// TODO: once `arcjet` core has `exactOptionalProperties` we can use
// `satisfies z.ZodType<ShieldOptions>` and such here.
const validateShieldOptions = z
  .object({
    mode: validateMode.optional(),
  })
  .strict();

const validateBotOptions = z.union([
  z
    .object({
      mode: validateMode.optional(),
      allow: z.array(z.string()),
    })
    .strict(),
  z
    .object({
      mode: validateMode.optional(),
      deny: z.array(z.string()),
    })
    .strict(),
]);

const validateEmailOptions = z.union([
  z
    .object({
      mode: validateMode.optional(),
      allow: z.array(z.string()),
      requireTopLevelDomain: z.boolean().optional(),
      allowDomainLiteral: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      mode: validateMode.optional(),
      deny: z.array(z.string()),
      requireTopLevelDomain: z.boolean().optional(),
      allowDomainLiteral: z.boolean().optional(),
    })
    .strict(),
]);

const validateFilterOptions = z.union([
  z
    .object({
      mode: validateMode.optional(),
      allow: z.array(z.string()),
    })
    .strict(),
  z
    .object({
      mode: validateMode.optional(),
      deny: z.array(z.string()),
    })
    .strict(),
]);

const validateSensitiveInfoOptions = z.union([
  z
    .object({
      mode: validateMode.optional(),
      allow: z.array(z.string()),
      contextWindowSize: z.number().optional(),
    })
    .strict(),
  z
    .object({
      mode: validateMode.optional(),
      deny: z.array(z.string()),
      contextWindowSize: z.number().optional(),
    })
    .strict(),
]);

const validateFixedWindowOptions = z
  .object({
    mode: validateMode.optional(),
    characteristics: validateCharacteristics.optional(),
    window: z.union([z.string(), z.number()]),
    max: z.number(),
  })
  .strict();

const validateSlidingWindowOptions = z
  .object({
    mode: validateMode.optional(),
    characteristics: validateCharacteristics.optional(),
    interval: z.union([z.string(), z.number()]),
    max: z.number(),
  })
  .strict();

const validateTokenBucketOptions = z
  .object({
    mode: validateMode.optional(),
    characteristics: validateCharacteristics.optional(),
    refillRate: z.number(),
    interval: z.union([z.string(), z.number()]),
    capacity: z.number(),
  })
  .strict();

const validateProtectSignupOptions = z
  .object({
    rateLimit: validateSlidingWindowOptions,
    bots: validateBotOptions,
    email: validateEmailOptions,
  })
  .strict();

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
      type: "filter";
      options: FilterOptions;
    }
  | {
      type: "sensitiveInfo";
      // TODO: This only supports serializable options, so no custom detect
      // functions are supported but maybe they could be supported via a module
      // import
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

// TODO: This only supports serializable options, so no custom loggers are
// supported but maybe they could be supported via a module import
/**
 * Configuration for the Astro integration of Arcjet.
 *
 * @template Characteristics
 *   Characteristics to track a user by.
 */
type ArcjetIntegrationOptions<Characteristics extends readonly string[]> = {
  /**
   * Integration rules to apply when protecting a request (required).
   *
   * These rules are *different* from those exposed from `arcjet` core.
   * You have to import them from this integration (`@arcjet/astro`) instead.
   */
  rules: IntegrationRule<Characteristics>[];
  /**
   * Characteristics to track a user by (default: `["src.ip"]`).
   *
   * Can also be passed to rules.
   */
  characteristics?: Characteristics;
  /**
   * Configuration for the default client (optional).
   */
  client?: RemoteClientOptions;
  /**
   * IP addresses and CIDR ranges of trusted load balancers and proxies
   * (optional, example: `["100.100.100.100", "100.100.100.0/24"]`).
   */
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

function integrationRuleToClientRule<Characteristics extends readonly string[]>(
  rule: IntegrationRule<Characteristics>,
) {
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
    case "filter": {
      const serializedOpts = validateAndSerialize(
        validateFilterOptions,
        rule.options,
      );
      return {
        importName: `filter`,
        code: `filter(${serializedOpts})`,
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

// Note: please keep JSDocs in sync with `arcjet` core.
/**
 * Arcjet Shield WAF rule.
 *
 * Applying this rule protects your application against common attacks,
 * including the OWASP Top 10.
 *
 * The Arcjet Shield WAF analyzes every request to your application to detect
 * suspicious activity.
 * Once a certain suspicion threshold is reached,
 * subsequent requests from that client are blocked for a period of time.
 *
 * @param options
 *   Configuration for the Shield rule.
 * @returns
 *   Astro integration Shield rule to provide to the SDK in the `rules` field.
 */
export function shield(options: ShieldOptions) {
  return { type: "shield", options } as const satisfies IntegrationRule<
    Array<string>
  >;
}

// Note: please keep JSDocs in sync with `arcjet` core.
/**
 * Arcjet bot detection rule.
 *
 * Applying this rule allows you to manage traffic by automated clients and
 * bots.
 *
 * Bots can be good (such as search engine crawlers or monitoring agents) or bad
 * (such as scrapers or automated scripts).
 * Arcjet allows you to configure which bots you want to allow or deny by
 * specific bot names such as curl, as well as by category such as search
 * engine bots.
 *
 * Bots are detected based on various signals such as the user agent, IP
 * address, DNS records, and more.
 *
 * @param options
 *   Configuration for the bot rule (required).
 * @returns
 *   Astro integration Bot rule to provide to the SDK in the `rules` field.
 */
export function detectBot(options: BotOptions) {
  return { type: "bot", options } as const satisfies IntegrationRule<
    Array<string>
  >;
}

// Note: please keep JSDocs in sync with `arcjet` core.
/**
 * Arcjet email validation rule.
 *
 * Applying this rule allows you to validate and verify an email address.
 *
 * The first step of the analysis is to validate the email address syntax.
 * This runs locally within the SDK and validates the email address is in the
 * correct format.
 * If the email syntax is valid, the SDK will pass the email address to the
 * Arcjet cloud API to verify the email address.
 * This performs several checks, depending on the rule configuration.
 *
 * @param options
 *   Configuration for the email validation rule (required).
 * @returns
 *   Astro integration Email rule to provide to the SDK in the `rules` field.
 */
export function validateEmail(options: EmailOptions) {
  return { type: "email", options } as const satisfies IntegrationRule<
    Array<string>
  >;
}

// Note: please keep JSDocs in sync with `arcjet` core.
/**
 * Arcjet filter rule.
 *
 * Applying this rule lets you block requests using Wireshark-like display
 * filter expressions over HTTP headers, IP addresses, and other request
 * fields.
 * You can quickly enforce rules like allow/deny by country, network, or
 * `user-agent` pattern.
 *
 * See the [reference guide](https://docs.arcjet.com/filters/reference) for
 * more info on the expression language fields, functions, and values.
 *
 * @param options
 *   Configuration (required).
 * @returns
 *   Astro integration Filter rule to provide to the SDK in the `rules` field.
 *
 * @example
 *   In this example, the expression matches non-VPN GET requests from the US.
 *   Requests matching the expression are allowed, all others are denied.
 *
 *   ```ts
 *   filter({
 *     allow: [
 *       'http.request.method eq "GET" and ip.src.country eq "US" and not ip.src.vpn',
 *     ],
 *     mode: "LIVE",
 *   })
 *   ```
 *
 * @link https://docs.arcjet.com/filters/reference
 */
export function filter(options: FilterOptions) {
  return { type: "filter", options } as const satisfies IntegrationRule<
    Array<string>
  >;
}

// Note: please keep JSDocs in sync with `arcjet` core.
/**
 * Arcjet sensitive information detection rule.
 *
 * Applying this rule protects against clients sending you sensitive information
 * such as personally identifiable information (PII) that you do not wish to
 * handle.
 * The rule runs entirely locally so no data ever leaves your environment.
 *
 * This rule includes built-in detections for email addresses, credit/debit card
 * numbers, IP addresses, and phone numbers.
 * You can also provide a custom detection function to identify additional
 * sensitive information.
 *
 * @param options
 *   Configuration for the sensitive information detection rule (required).
 * @returns
 *   Astro integration Sensitive information rule to provide to the SDK in the `rules` field.
 */
export function sensitiveInfo(options: SensitiveInfoOptions<never>) {
  return { type: "sensitiveInfo", options } as const satisfies IntegrationRule<
    Array<string>
  >;
}

// Note: please keep JSDocs in sync with `arcjet` core.
/**
 * Arcjet fixed window rate limiting rule.
 *
 * Applying this rule sets a fixed window rate limit which tracks the number of
 * requests made by a client over a fixed time window.
 *
 * This is the simplest algorithm.
 * It tracks the number of requests made by a client over a fixed time window
 * such as 60 seconds.
 * If the client exceeds the limit, they are blocked until the window expires.
 *
 * This algorithm is useful when you want to apply a simple fixed limit in a
 * fixed time window.
 * For example, a simple limit on the total number of requests a client can make.
 * However, it can be susceptible to the stampede problem where a client makes
 * a burst of requests at the start of a window and then is blocked for the rest
 * of the window.
 * The sliding window algorithm can be used to avoid this.
 *
 * @template Characteristics
 *   Characteristics to track a user by.
 * @param options
 *   Configuration for the fixed window rate limiting rule (required).
 * @returns
 *   Astro integration Fixed window rule to provide to the SDK in the `rules` field.
 */
export function fixedWindow<Characteristics extends readonly string[]>(
  options: FixedWindowRateLimitOptions<Characteristics>,
) {
  return {
    type: "fixedWindow",
    options,
  } as const satisfies IntegrationRule<Characteristics>;
}

// Note: please keep JSDocs in sync with `arcjet` core.
/**
 * Arcjet sliding window rate limiting rule.
 *
 * Applying this rule sets a sliding window rate limit which tracks the number
 * of requests made by a client over a sliding window so that the window moves
 * with time.
 *
 * This algorithm is useful to avoid the stampede problem of the fixed window.
 * It provides smoother rate limiting over time and can prevent a client from
 * making a burst of requests at the start of a window and then being blocked
 * for the rest of the window.
 *
 * @template Characteristics
 *   Characteristics to track a user by.
 * @param options
 *   Configuration for the sliding window rate limiting rule (required).
 * @returns
 *   Astro integration Sliding window rule to provide to the SDK in the `rules` field.
 */
export function slidingWindow<Characteristics extends readonly string[]>(
  options: SlidingWindowRateLimitOptions<Characteristics>,
) {
  return {
    type: "slidingWindow",
    options,
  } as const satisfies IntegrationRule<Characteristics>;
}

// Note: please keep JSDocs in sync with `arcjet` core.
/**
 * Arcjet token bucket rate limiting rule.
 *
 * Applying this rule sets a token bucket rate limit.
 *
 * This algorithm is based on a bucket filled with a specific number of tokens.
 * Each request withdraws some amount of tokens from the bucket and the bucket
 * is refilled at a fixed rate.
 * Once the bucket is empty, the client is blocked until the bucket refills.
 *
 * This algorithm is useful when you want to allow clients to make a burst of
 * requests and then still be able to make requests at a slower rate.
 *
 * @template Characteristics
 *   Characteristics to track a user by.
 * @param options
 *   Configuration for the token bucket rate limiting rule (required).
 * @returns
 *   Astro integration Token bucket rule to provide to the SDK in the `rules` field.
 */
export function tokenBucket<Characteristics extends readonly string[]>(
  options: TokenBucketRateLimitOptions<Characteristics>,
) {
  return {
    type: "tokenBucket",
    options,
  } as const satisfies IntegrationRule<Characteristics>;
}

// Note: please keep JSDocs in sync with `arcjet` core.
/**
 * Arcjet signup form protection rule.
 *
 * Applying this rule combines rate limiting, bot protection, and email
 * validation to protect your signup forms from abuse.
 * Using this rule will configure the following:
 *
 * - Rate limiting - signup forms are a common target for bots. Arcjet’s rate
 *   limiting helps to prevent bots and other automated or malicious clients
 *   from submitting your signup form too many times in a short period of time.
 * - Bot protection - signup forms are usually exclusively used by humans, which
 *   means that any automated submissions to the form are likely to be
 *   fraudulent.
 * - Email validation - email addresses should be validated to ensure the signup
 *   is coming from a legitimate user with a real email address that can
 *   actually receive messages.
 *
 * @template Characteristics
 *   Characteristics to track a user by.
 * @param options
 *   Configuration for the signup form protection rule.
 * @returns
 *   Astro integration Signup form protection rule to provide to the SDK in the `rules` field.
 */
export function protectSignup<Characteristics extends readonly string[]>(
  options: ProtectSignupOptions<Characteristics>,
) {
  return {
    type: "protectSignup",
    options,
  } as const satisfies IntegrationRule<Characteristics>;
}

/**
 * Configuration for {@linkcode createRemoteClient}.
 */
export type RemoteClientOptions = {
  /**
   * Base URI for HTTP requests to Decide API (optional).
   *
   * Defaults to the environment variable `ARCJET_BASE_URL` (if that value
   * is known and allowed) and the standard production API otherwise.
   */
  baseUrl?: string | undefined;

  /**
   * Timeout in milliseconds for the Decide API (optional).
   *
   * Defaults to `500` in production and `1000` in development.
   */
  timeout?: number | undefined;
};

/**
 * Create a remote client.
 *
 * @param options
 *   Configuration (optional).
 * @returns
 *   Client.
 */
export function createRemoteClient(options?: RemoteClientOptions | undefined) {
  const settings = options ?? {};
  return { baseUrl: settings.baseUrl, timeout: settings.timeout } as const;
}

/**
 * Create a new Astro integration of Arcjet.
 *
 * @template Characteristics
 *   Characteristics to track a user by.
 * @param options
 *   Configuration.
 * @returns
 *   Astro integration of Arcjet.
 */
export default function arcjet<Characteristics extends readonly string[]>(
  options: ArcjetIntegrationOptions<Characteristics> = { rules: [] },
): AstroIntegration {
  const { rules, characteristics, client, proxies } = options;
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
              FIREBASE_CONFIG: {
                access: "public",
                context: "server",
                optional: true,
                type: "string",
              },
              // No `MODE`, that is a vite value on `import.meta.env.MODE`,
              // it is inferred in `internal.ts` directly.
              // No `NODE_ENV`.
              RENDER: {
                access: "public",
                context: "server",
                optional: true,
                type: "string",
              },
              VERCEL_GIT_COMMIT_SHA: {
                access: "public",
                context: "server",
                optional: true,
                type: "string",
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

            /**
             * Instance of the Astro integration of Arcjet.
             *
             * Primarily has a \`protect()\` method to make a decision about how a request
             * should be handled.
             *
             * > 👉 **Note**: this is generated by \`@arcjet/astro\` based on how you configure
             * > Arcjet in your \`astro.config.mjs\` file.
             * > In that configuration file, you can pass the (serializable) options that apply
             * > to all requests.
             * > You can call \`aj.withRule\` *on* this default client to extend its behavior.
             *
             * @template Props
             *   Configuration.
             */
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
