import fs from "node:fs/promises";
import {
  defineNuxtModule,
  addServerTemplate,
  addTypeTemplate,
} from "@nuxt/kit";
import type { ArcjetOptions as CoreOptions } from "arcjet";

/**
 * Configuration for {@linkcode createRemoteClient}.
 */
export interface RemoteClientOptions {
  /**
   * Base URI for HTTP requests to Decide API (optional).
   *
   * Defaults to the environment variable `ARCJET_BASE_URL` (if that value
   * is known and allowed) and the standard production API otherwise.
   */
  baseUrl?: string | null | undefined;

  /**
   * Timeout in milliseconds for the Decide API (optional).
   *
   * Defaults to `500` in production and `1000` in development.
   */
  timeout?: number | null | undefined;
}

// TODO: This only supports serializable options, so no custom loggers are
// supported but maybe they could be supported via a module import
/**
 * Configuration for the Nuxt Arcjet Module.
 *
 * @template Characteristics
 *   Characteristics to track a user by.
 */
export interface ArcjetOptions extends Omit<CoreOptions<[], []>, "rules"> {
  /**
   * IP addresses and CIDR ranges of trusted load balancers and proxies
   * (optional, example: `["100.100.100.100", "100.100.100.0/24"]`).
   */
  proxies?: string[];
}

export default defineNuxtModule({
  meta: {
    compatibility: {
      nuxt: ">=4.0.0",
    },
    configKey: "arcjet",
    name: "@arcjet/nuxt",
  },
  schema: {
    key: "",
  },
  setup: function (options: ArcjetOptions, nuxt) {
    const key = options.key;

    if (!key) {
      throw new Error("Arcjet key is required");
    }

    nuxt.options.runtimeConfig.__ARCJET_KEY = key;

    addServerTemplate({
      filename: "#arcjet",
      async getContents() {
        return await fs.readFile(new URL("./internal.js", import.meta.url), {
          encoding: "utf-8",
        });
      },
    });

    addTypeTemplate(
      {
        filename: "arcjet.d.ts",
        async getContents() {
          const internalDts = await fs.readFile(
            new URL("./internal.d.ts", import.meta.url),
            { encoding: "utf-8" },
          );

          return `declare module '#arcjet' {
${internalDts}
}
`;
        },
        write: true,
      },
      { nitro: true },
    );
  },
});
