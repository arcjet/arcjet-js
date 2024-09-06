/*
 If you are building an AI application you may be more interested in the number
 of AI tokens rather than the number of HTTP requests. The token bucket
 algorithm is a good fit for this use case because you can vary the number of
 tokens withdrawn from the bucket with every request.

 This example is adapted from
 https://sdk.vercel.ai/docs/guides/frameworks/nextjs-app and calculates as
 estimate of the number of tokens required to process the request. It then uses
 a token bucket rate limit algorithm to limit the number of tokens consumed,
 keeping costs under control.

 A custom user identifier is used to track tokens used by a user regardless of
 which device or IP they are using. This can be used to apply a quota for each
 user. Custom characteristics are defined with a string key when configuring the
 rate limit rule. The value is then passed as a string, number or boolean when
 calling the protect method. You can use any string value for the key.
*/
import arcjet, { shield, tokenBucket } from "@arcjet/next";
import { OpenAIStream, StreamingTextResponse } from "ai";
import OpenAI from "openai";
import { promptTokensEstimate } from "openai-chat-tokens";

const aj = arcjet({
  // Get your site key from https://app.arcjet.com
  // and set it as an environment variable rather than hard coding.
  // See: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
  key: process.env.ARCJET_KEY,
  characteristics: ["userId"], // track requests by user ID
  rules: [
    shield({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
    }),
    tokenBucket({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only      
      refillRate: 2_000, // fill the bucket up by 2,000 tokens
      interval: "1h", // every hour
      capacity: 5_000, // up to 5,000 tokens
    }),
  ],
});

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "OPENAI_KEY_MISSING",
});

// Edge runtime allows for streaming responses
export const runtime = "edge";

export async function POST(req: Request) {
  // This userId is hard coded for the example, but this is where you would do a
  // session lookup and get the user ID.
  const userId = "totoro"

  const { messages } = await req.json();

   // Estimate the number of tokens required to process the request
  const estimate = promptTokensEstimate({
    messages,
  });

  console.log("Token estimate", estimate);

  // Withdraw tokens from the token bucket
  const decision = await aj.protect(req, { requested: estimate, userId });
  console.log("Arcjet decision", decision.conclusion);

  if (decision.reason.isRateLimit()) {
    console.log("Requests remaining", decision.reason.remaining);
  }

  // If the request is denied, return a 429
  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return new Response("Too Many Requests", {
        status: 429,
      });
    } else {
      return new Response("Forbidden", {
        status: 403,
      });
    }
  }

  // If the request is allowed, continue to use OpenAI
  // Ask OpenAI for a streaming chat completion given the prompt
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    stream: true,
    messages,
  });

  // Convert the response into a friendly text-stream
  const stream = OpenAIStream(response);
  // Respond with the stream
  return new StreamingTextResponse(stream);
}