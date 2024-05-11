import { error, type RequestEvent } from '@sveltejs/kit';

export async function load(event: RequestEvent) {

    const aj = event.locals.arcjet;
    const decision = await aj.protect(event.locals.arcjetRequest);

    if (decision.isDenied()) {
        error(403, 'Forbidden')
    }

    return {};

}