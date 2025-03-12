import arcjet, { shield } from '@arcjet/sveltekit';
import { env } from '$env/dynamic/private';

export const aj = arcjet({
	key: env.ARCJET_KEY!,
	rules: [shield({ mode: 'LIVE' })]
});
