import type { RollupOptions, InputPluginOption } from "rollup";

export declare function createConfig(
  root: URL,
  options?: { plugins?: InputPluginOption },
): RollupOptions;
