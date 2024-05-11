import { slidingWindow } from "arcjet";
import type { RequestEvent } from '@sveltejs/kit';

export async function GET(event: RequestEvent) {

    const aj = event.locals.arcjet
        .withRule(
            slidingWindow({
                mode: "LIVE",
                interval: "10s",
                max: 5,
            })
        );

    const decision = await aj.protect(event.locals.arcjetRequest);

    if (decision.isDenied()) {
        return new Response("Forbidden", {
            status: 403,
        });
    }

    return new Response(JSON.stringify({
        title: `This end-point is rate limited`,
        message: `The rate limiting is configured to allow no more than 5 requests in the last 10 seconds. That's 5 requests from this page or the rate-limited page combined.`,
        link: '/rate-limited',
        nextStep: `Go ahead and hit refresh a few times to see it in action. Then look at /src/routes/api/rate-limited/+server.ts to see how it's done.`,
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        }
    })
}