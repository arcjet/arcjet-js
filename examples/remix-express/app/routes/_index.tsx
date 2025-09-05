import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Form, redirect, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";

import { aj } from "../arcjet";

export const meta: MetaFunction = () => {
  return [
    { title: "Arcjet + Remix App" },
    { name: "description", content: "Welcome to the Arcjet + Remix example app!" },
  ];
};

export async function loader(args: LoaderFunctionArgs) {
  const decision = await aj.protect(args);

  if (decision.isDenied()) {
    throw new Response(null, { status: 429, statusText: "Too Many Requests" })
  }

  return json({ message: "Hello Arcjet" })
}

export async function action(args: ActionFunctionArgs) {
  const decision = await aj.protect(args);

  if (decision.isDenied()) {
    throw new Response(null, { status: 400, statusText: "Form contains sensitive info" })
  }

  return redirect("/");
}

export default function Index() {
  const data = useLoaderData<typeof loader>()
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-16">
        <header className="flex flex-col items-center gap-9">
          <h1 className="leading text-2xl font-bold text-gray-800 dark:text-gray-100">
            {data.message}
          </h1>
        </header>
        <Form method="post">
          <textarea
            cols={90}
            className="block p-2.5 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
            defaultValue="Some text 192.168.1.1 and an email@example.com."
            name="text"
            rows={3}
          />
          <div>
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 my-2 rounded"
              type="submit"
            >Check Sensitive Info</button>
          </div>
        </Form>
      </div>
    </div>
  );
}
