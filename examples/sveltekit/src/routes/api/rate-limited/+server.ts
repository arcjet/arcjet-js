import { slidingWindow } from 'arcjet';
import { error, type RequestEvent } from '@sveltejs/kit';
import { aj } from '$lib/server/arcjet';

export async function GET(event: RequestEvent) {
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

	return new Response(
		JSON.stringify({
			title: `This end-point is rate limited`,
			message: `The rate limiting is configured to allow no more than 5 requests in the last 10 seconds. That's 5 requests from this page or the rate-limited page combined.`,
			link: '/rate-limited',
			nextStep: `Go ahead and hit refresh a few times to see it in action. Then look at /src/routes/api/rate-limited/+server.ts to see how it's done.`
		}),
		{
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		}
	);
}
