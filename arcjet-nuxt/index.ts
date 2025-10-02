import fs from "node:fs/promises";
import {
  addServerTemplate,
  addTypeTemplate,
  defineNuxtModule,
} from "@nuxt/kit";

/**
 * Configuration for `@arcjet/nuxt` as used in `nuxt.config.ts`.
 */
export interface Options {
  /**
   * API key to identify the site in Arcjet (**required**).
   */
  key: string;
}

export default defineNuxtModule({
  defaults: { key: "" },
  meta: {
    compatibility: { nuxt: ">=4.0.0" },
    configKey: "arcjet",
    name: "@arcjet/nuxt",
    version: "__ARCJET_SDK_VERSION__",
  },
  schema: { key: "" },
  setup(options: Options, nuxt) {
    const key = options.key;

    if (!key) {
      throw new Error("Arcjet key is required");
    }

    nuxt.options.runtimeConfig.__ARCJET_KEY = key;

    addServerTemplate({
      filename: "#arcjet",
      getContents() {
        return fs.readFile(new URL("./internal.js", import.meta.url), "utf8");
      },
    });

    addTypeTemplate(
      {
        filename: "arcjet.d.ts",
        async getContents() {
          const internalDts = await fs.readFile(
            new URL("./internal.d.ts", import.meta.url),
            "utf8",
          );

          return 'declare module "#arcjet" { ' + internalDts + " }\n";
        },
        write: true,
      },
      { nitro: true },
    );
  },
});
