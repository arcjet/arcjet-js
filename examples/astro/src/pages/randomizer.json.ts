import type { APIRoute } from "astro";
import arcjetClient, { fixedWindow } from "arcjet:client";

const arcjetClientWithRateLimit = arcjetClient.withRule(
  fixedWindow({
    mode: "LIVE",
    max: 1,
    window: "5s",
  }),
);

function random() {
  const v = Math.floor(Math.random() * 100);
  return `${v < 10 ? "0" : ""}${v}`;
}

export const GET: APIRoute = async ({ request }) => {
  const decision = await arcjetClientWithRateLimit.protect(request);
  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return new Response(null, {
        status: 429,
        statusText: "Too many requests",
      });
    } else {
      return new Response(null, { status: 403, statusText: "Forbidden" });
    }
  }

  return Response.json([random(), random(), random(), random(), random()]);
};
