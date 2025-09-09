import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";

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

  return json({ message: "Hello Arcjet" });
}

export async function action(args: ActionFunctionArgs) {
  const decision = await aj.protect(args);

  if (decision.isDenied()) {
    throw new Response(null, { status: 400, statusText: "Form contains sensitive info" })
  }

  return json({ message: { positive: "No sensitive info detected."} })
}

export default function Index() {
  const data = useActionData<typeof action>();

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-left gap-16 max-w-[700px]">
        <header className="flex flex-col items-left gap-9">
          <div className="flex flex-col items-left gap-5">
            <h2 className="leading text-xl font-bold text-black dark:text-white">
              Arcjet + Remix App
            </h2>
            <h1 className="leading text-3xl font-bold text-black dark:text-white">
              Sensitive info detection example
            </h1>
          </div>
          <div className="flex flex-col items-left gap-5">
            <p className="text-lg">
              This form uses Arcjet's sensitive info detection feature which is configured to detect credit card numbers. It can be configured to detect other types of sensitive information and custom patterns.
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              The request is analyzed entirely on your server so no sensitive information is sent to Arcjet.
            </p>
          </div>
        </header>
        <Form method="post" className="flex flex-col items-left gap-3">
          <textarea
            cols={90}
            className="block p-3 rounded-xl border focus:outline-none border-gray-300 focus:border-gray-500 focus:outline-none dark:border-gray-800 max-w-full box-border transition-colors ease-in-out"
            defaultValue="Some text 192.168.1.1 and an email@example.com."
            name="text"
            rows={3}
          />
          <div className="flex flex-row items-left gap-6 items-center justify-between">
            <button
              className="cursor-pointer rounded-3xl font-bold bg-black text-white hover:bg-gray-700 active:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-400 dark:active:bg-gray-300 py-2 px-4 my-2 transition-colors ease-in-out"
              type="submit"
            >
              Check Sensitive Info
            </button>
            {data?.message.positive && (
              <p>
                No sensitive info detected.
              </p>
            )}
          </div>
        </Form>
      </div>
    </div>
  );
}
