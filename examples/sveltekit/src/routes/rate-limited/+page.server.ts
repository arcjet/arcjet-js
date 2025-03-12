import { slidingWindow } from 'arcjet';
import { error, type RequestEvent } from '@sveltejs/kit';
import { aj } from '$lib/server/arcjet';

export async function load(event: RequestEvent) {
	const decision = await aj
		.withRule(
			slidingWindow({
				mode: 'LIVE',
				interval: '10s',
				max: 5
			})
		)
		.protect(event);

	if (decision.isDenied()) {
		return error(403, 'Forbidden');
	}

	return {};
}
