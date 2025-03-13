import { aj } from '$lib/server/arcjet';
import { error } from '@sveltejs/kit';
import { createHook } from '@nosecone/sveltekit';
import { sequence } from '@sveltejs/kit/hooks';

export const handle = sequence(createHook(), async ({ event, resolve }) => {
	// Ignore routes that extend the Arcjet rules - they will call `.protect` themselves
	const filteredRoutes = ['/api/rate-limited', '/rate-limited'];
	if (filteredRoutes.includes(event.url.pathname)) {
		// return - route will handle protection
		return resolve(event);
	}

	// Ensure every other route is protected with shield
	const decision = await aj.protect(event);
	if (decision.isDenied()) {
		return error(403, 'Forbidden');
	}

	// Continue with the route
	return await resolve(event);
});
