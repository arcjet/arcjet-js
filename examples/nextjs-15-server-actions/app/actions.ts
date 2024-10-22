"use server"

import arcjet, { request, validateEmail } from "@arcjet/next";

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  characteristics: ['http.request.cookie["uid"]'],
  rules: [
    validateEmail({ mode: "LIVE", block: ["DISPOSABLE", "NO_MX_RECORDS"] })
  ]
});

export async function validate(prev: { message: string }, formData: FormData) {
  const email = formData.get("email");
  if (typeof email !== "string") {
    throw new Error("Invalid form data")
  }

  // Access request data that Arcjet needs when you call `protect()` similarly
  // to `await headers()` and `await cookies()` in `next/headers`
  const req = await request();

  const decision = await aj.protect(req, { email });

  // If Arcjet encounters an error, you could fail "open" or you could respond
  // with a "closed"-style message like below
  if (decision.isErrored()) {
    console.log("Error occurred:", decision.reason.message);
    return {
      message: "Encountered an error"
    }
  }

  if (decision.isDenied()) {
    return {
      message: "Email is INVALID"
    };
  }

  return {
    message: "Email is VALID"
  }
}
