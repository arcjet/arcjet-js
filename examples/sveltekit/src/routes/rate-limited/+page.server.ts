import { slidingWindow } from "arcjet";
import { error, type RequestEvent } from '@sveltejs/kit';

export async function load(event: RequestEvent) {

    const aj = event.locals.arcjet
        .withRule(
            slidingWindow({
                mode: "LIVE",
                interval: "10s",
                max: 5,
            })
        );

    const decision = await aj.protect(event.locals.arcjetDetails);

    if (decision.isDenied()) {
        error(403, 'Forbidden')
    }

    return {};

}