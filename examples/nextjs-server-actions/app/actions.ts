"use server"

import arcjet, { ArcjetRuleResult, request, validateEmail } from "@arcjet/next";

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  // Use the `uid` cookie that is set by the middleware to fingerprint requests
  characteristics: ['http.request.cookie["uid"]'],
  rules: [
    validateEmail({ mode: "LIVE", block: ["DISPOSABLE", "NO_MX_RECORDS"] })
  ]
});

function collectErrors(errors: string[], rule: ArcjetRuleResult) {
  if (rule.reason.isError()) {
    return [...errors, rule.reason.message];
  } else {
    return errors;
  }
}

export async function validate(prev: { message: string }, formData: FormData) {
  const email = formData.get("email");

  // TypeScript types allow this to be a `File`, `string`, or `null` so we need
  // to check it is a string type before using it
  if (typeof email !== "string") {
    throw new Error("Invalid form data")
  }

  // Access request data that Arcjet needs when you call `protect()` similarly
  // to `await headers()` and `await cookies()` in `next/headers`
  const req = await request();

  const decision = await aj.protect(req, { email });

  // If Arcjet encounters an error, you could fail "open" or you could respond
  // with a "closed"-style message like below
  const errors = decision.results.reduce(collectErrors, []);
  if (errors.length > 0) {
    console.log("Errors occurred:", errors);
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
