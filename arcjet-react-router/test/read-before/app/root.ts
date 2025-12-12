import arcjetReactRouter, { sensitiveInfo } from "@arcjet/react-router";

const arcjet = arcjetReactRouter({
  key: "ajkey_yourkey",
  rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
});

interface Options {
  request: Request;
}

export async function action(actionArguments: Options): Promise<Response> {
  await actionArguments.request.text();

  const decision = await arcjet.protect(actionArguments);

  return decision.isDenied()
    ? new Response("Forbidden", { status: 403 })
    : new Response("Hello world");
}
