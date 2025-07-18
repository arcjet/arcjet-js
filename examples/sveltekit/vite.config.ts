import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// @ts-expect-error: there is some weird deep type error that says it doesn’t match.
	plugins: [sveltekit()]
});
