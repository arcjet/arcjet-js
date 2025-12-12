import arcjetRemix, { sensitiveInfo } from "@arcjet/remix";
import type { ActionFunctionArgs } from "@remix-run/node";

const arcjet = arcjetRemix({
  key: "ajkey_yourkey",
  rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
});

export async function action(args: ActionFunctionArgs) {
  await args.request.text();

  const decision = await arcjet.protect(args);

  return decision.isDenied()
    ? new Response("Forbidden", { status: 403 })
    : new Response("Hello world");
}
