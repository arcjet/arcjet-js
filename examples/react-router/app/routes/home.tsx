import arcjetReactRouter, { fixedWindow, sensitiveInfo, shield } from "@arcjet/react-router";
import { type MetaDescriptor, Form } from "react-router";
import type { ReactNode } from "react";
import type { Route } from "../routes/+types/home";

const arcjet = arcjetReactRouter({
  key: process.env.ARCJET_KEY!,
  rules: [
    fixedWindow({ max: 5, mode: "LIVE", window: "10s" }),
    shield({ mode: "LIVE" }),
  ]
})

const arcjetWithSensitiveInfo = arcjet.withRule(sensitiveInfo({ allow: [], mode: "LIVE" }))

export default function Home(properties: Route.ComponentProps): ReactNode {
  const message = properties.actionData?.message;

  return (
    <Form className="main" method="post">
      <h1>
        Arcjet + React Router
      </h1>
      <h2>
        Rate limit
      </h2>
      <p>
        Refresh 5 times in 10 seconds and you will be blocked;
        after that you can refresh again.
      </p>
      <h2>
        Sensitive info
      </h2>
      <p>
        Post with and without sensitive info (IP addresses, emails, and more)
        in the text area below.
        The request body is analyzed entirely on your server:
        no sensitive info is sent to Arcjet.
      </p>
      <textarea
        cols={80}
        defaultValue="Some IP address 192.168.1.1 and an email user@example.com."
        name="text"
        rows={3}
      />
      <div className="footer">
        <button type="submit">
          Check sensitive info
        </button>
        {message ? (<span>{message}</span>) : undefined}
      </div>
    </Form>
  );
}

// This action happens on POST requests, which have a body, which contains form data.
// So this is probably where the Sensitive info rule kicks in.
export async function action(actionArguments: Route.ActionArgs): Promise<{ message: string }> {
  const body = await actionArguments.request.text();
  const decision = await arcjetWithSensitiveInfo.protect(actionArguments, { sensitiveInfoValue: body });

  if (decision.isDenied()) {
    if (decision.reason.isSensitiveInfo()) {
      return { message: "Form contains sensitive info." };
    }

    throw new Response(undefined, { statusText: "Forbidden", status: 403 });
  }

  return { message: "No sensitive info detected." };
}

// This loader happens on GET requests, so this would be used for rate limiting.
export async function loader(loaderArguments: Route.LoaderArgs): Promise<undefined> {
  const decision = await arcjet.protect(loaderArguments);

  if (decision.isDenied()) {
    throw new Response(
      undefined,
      decision.reason.isRateLimit()
      ? { statusText: "Too many requests", status: 429 }
      : { statusText: "Forbidden", status: 403 }
    );
  }
}

export function meta(): Array<MetaDescriptor> {
  return [
    { title: "Arcjet + React Router" },
    { content: "Welcome to Arcjet + React Router", name: "description" },
  ];
}
