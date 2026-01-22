import arcjetReactRouter, { fixedWindow, shield } from "@arcjet/react-router";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from "react-router";
import type { ReactNode } from "react";
import type { Route } from "./+types/root";
import { arcjetDecisionContext } from "./context";
import "./app.css";

const arcjet = arcjetReactRouter({
  key: process.env.ARCJET_KEY!,
  rules: [
    fixedWindow({ max: 5, mode: "LIVE", window: "10s" }),
    // This example does not use `sensitiveInfo` because middleware should not read the body.
    // See `examples/react-router` for a non-middleware example that uses `sensitiveInfo`.
    shield({ mode: "LIVE" }),
  ]
})

export default function App(): ReactNode {
  return <Outlet />;
}

export function ErrorBoundary(properties: Route.ErrorBoundaryProps): ReactNode {
  const error = properties.error;
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="main">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre>
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}

interface LayoutProperties {
  children: ReactNode;
}

export function Layout(properties: LayoutProperties): ReactNode {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <Meta />
        <Links />
      </head>
      <body>
        {properties.children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export const middleware: Array<Route.MiddlewareFunction> = [
  async function arcjetDecisionMiddleware(details, next) {
    details.context.set(arcjetDecisionContext, await arcjet.protect(details));

    return next();
  }
];
