import { type MetaDescriptor, Form } from "react-router";
import type { ReactNode } from "react";
import type { Route } from "../routes/+types/home";
import { arcjetDecisionContext } from "../context";

export default function Home(properties: Route.ComponentProps): ReactNode {
  const message = properties.actionData?.message;

  return (
    <Form className="main" method="post">
      <h1>
        Arcjet + React Router (using middleware)
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
  const decision = actionArguments.context.get(arcjetDecisionContext);

  if (decision?.isDenied()) {
    if (decision.reason.isSensitiveInfo()) {
      return { message: "Form contains sensitive info." };
    }

    throw new Response(undefined, { statusText: "Forbidden", status: 403 });
  }

  return { message: "No sensitive info detected." };
}

// This loader happens on GET requests, so this would be used for rate limiting.
export async function loader(loaderArguments: Route.LoaderArgs): Promise<undefined> {
  const decision = loaderArguments.context.get(arcjetDecisionContext);

  if (decision && decision.isDenied()) {
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
    { title: "Arcjet + React Router (using middleware)" },
    { content: "Welcome to Arcjet + React Router (using middleware)", name: "description" },
  ];
}
