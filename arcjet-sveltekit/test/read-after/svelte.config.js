/**
 * @import {Config} from '@sveltejs/kit'
 */

import adapterNode from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {Config} */
const config = {
  kit: { adapter: adapterNode() },
  preprocess: vitePreprocess(),
};

export default config;
