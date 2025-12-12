import arcjetSveltekit, { sensitiveInfo } from "@arcjet/sveltekit";
import { type RequestEvent } from "@sveltejs/kit";

const arcjet = arcjetSveltekit({
  key: "ajkey_yourkey",
  rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
});

interface HandleInput {
  event: RequestEvent;
}

export async function handle(input: HandleInput) {
  const decision = await arcjet.protect(input.event);

  await input.event.request.text();

  return decision.isDenied()
    ? new Response("Forbidden", { status: 403 })
    : new Response("Hello world");
}
