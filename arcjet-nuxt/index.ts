import {
  defineNuxtModule,
  addServerTemplate,
  addServerImports,
  addPlugin,
  createResolver,
  useNuxt,
} from "@nuxt/kit";
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
import fs from "node:fs/promises";

type IntegrationRule =
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
      options: FixedWindowRateLimitOptions<ReadonlyArray<string>>;
    }
  | {
      type: "slidingWindow";
      options: SlidingWindowRateLimitOptions<ReadonlyArray<string>>;
    }
  | {
      type: "tokenBucket";
      options: TokenBucketRateLimitOptions<ReadonlyArray<string>>;
    }
  | {
      type: "protectSignup";
      options: ProtectSignupOptions<ReadonlyArray<string>>;
    };

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

// TODO: This only supports serializable options, so no custom loggers are
// supported but maybe they could be supported via a module import
/**
 * Configuration for the Nuxt Arcjet Module.
 *
 * @template Characteristics
 *   Characteristics to track a user by.
 */
export type ArcjetOptions = {
  key: string;
  /**
   * Integration rules to apply when protecting a request (required).
   *
   * These rules are *different* from those exposed from `arcjet` core.
   * You have to import them from this integration (`@arcjet/astro`) instead.
   */
  rules: IntegrationRule[];
  /**
   * Characteristics to track a user by (default: `["src.ip"]`).
   *
   * Can also be passed to rules.
   */
  characteristics?: string[];
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

// const arcjetSymbol = Symbol.for("arcjet");

const virtualClientId = "#arcjet";

export default defineNuxtModule({
  meta: {
    name: "@arcjet/nuxt",
    configKey: "arcjet",
    compatibility: {
      nuxt: ">=4.0.0",
    },
  },
  schema: {
    key: "",
    rules: [],
  },
  setup: function (options: ArcjetOptions, nuxt) {
    // TODO: Can we use a symbol?
    nuxt.options.runtimeConfig.__ARCJET_NUXT_OPTIONS = options;

    addServerTemplate({
      filename: virtualClientId,
      getContents: async () => {
        const implSource = await fs.readFile(
          new URL("./internal.js", import.meta.url),
          { encoding: "utf-8" },
        );

        const arcjetImports: string[] = [];
        const arcjetRules: string[] = [];
        const characteristicsInjection = "";
        const proxiesInjection = "";
        const clientInjection = "";

        return `
            ${implSource}

            import {
            ${Array.from(arcjetImports).join(",\n")}
            } from "arcjet"


            export function useArcjet() {
                const nuxtApp = useNuxtApp()
                return nuxtApp.$arcjet
            }
        `;
      },
    });

    // return createArcjetClient({
    //     key: "",
    //     rules: [
    //         ${arcjetRules.join(",\n")}
    //     ],
    //     ${characteristicsInjection}
    //     ${proxiesInjection}
    //     ${clientInjection}
    //     })

    addServerImports({
      name: "useArcjet",
      as: "useArcjet",
      from: virtualClientId,
    });
  },
});
