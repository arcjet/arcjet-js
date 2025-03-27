import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	resolve: {
		alias: {
			"node:env": "$env/dynamic/private"
		}
	},
	ssr: {
		external: ["@arcjet/sveltekit"],
	},
	plugins: [sveltekit()]
});
