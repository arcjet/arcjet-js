// This example is adapted from https://sdk.vercel.ai/docs/guides/frameworks/nextjs-app
import arcjet, { tokenBucket } from "@arcjet/next";
import { OpenAIStream, StreamingTextResponse } from "ai";
import OpenAI from "openai";
import { promptTokensEstimate } from "openai-chat-tokens";

// Arcjet rate limit rule
const aj = arcjet({
  // Get your site key from https://app.arcjet.com
  // and set it as an environment variable rather than hard coding.
  // See: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
  key: process.env.ARCJET_KEY!,
  rules: [
    tokenBucket({
      mode: "LIVE",
      characteristics: ["ip.src"],
      refillRate: 40_000,
      interval: 1 /* day */ * 24 /* hours */ * 60 /* minutes */ * 60 /* seconds */,
      capacity: 40_000,
    }),
  ],
});

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"] ?? "OPENAI_KEY_MISSING",
});

export const runtime = "edge";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const estimate = promptTokensEstimate({
    messages,
  });

  console.log("Token estimate", estimate);

  // Protect the route with Arcjet
  const decision = await aj.protect(req, { requested: estimate });
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