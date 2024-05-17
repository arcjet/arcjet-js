import { aj } from "$lib/server/arcjet";
import { error } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";

export async function handle({
  event,
  resolve,
}: {
  event: RequestEvent;
  resolve: (event: RequestEvent) => Response | Promise<Response>;
}): Promise<Response> {
  // Ignore routes that extend the Arcjet rules - they will call `.protect` themselves
  const filteredRoutes = ["/api/rate-limited", "/rate-limited"];
  if (filteredRoutes.includes(event.url.pathname)) {
    // return - route will handle protecttion
    return resolve(event);
  }

  // Ensure every other route is protected with shield
  const decision = await aj.protect(event);
  if (decision.isDenied()) {
    return error(403, "Forbidden");
  }

  // Continue with the route
  return resolve(event);
}
