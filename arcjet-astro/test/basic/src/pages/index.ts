import type { APIContext } from "astro";
import arcjet from "arcjet:client";

export async function POST(context: APIContext) {
  const decision = await arcjet.protect(context.request);

  return decision.isDenied()
    ? new Response("Forbidden", { status: 403 })
    : new Response("Hello world");
}
