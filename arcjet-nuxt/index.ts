import fs from "node:fs/promises";
import {
  addServerTemplate,
  addTypeTemplate,
  defineNuxtModule,
} from "@nuxt/kit";
import type { ArcjetOptions as CoreOptions } from "arcjet";

/**
 * Configuration for the Nuxt Arcjet Module.
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
    // TODO: support all other options.
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

          // TODO: figure out about the error for
          // `declare const emptyObjectSymbol` in this.
          // Seems to work, but maybe we can remove that erroring code.
          return 'declare module "#arcjet" { ' + internalDts + " }\n";
        },
        write: true,
      },
      { nitro: true },
    );
  },
});
