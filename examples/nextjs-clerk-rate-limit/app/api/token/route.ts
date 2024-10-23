/**
 * This retrieves the Clerk JWT token for the current user so you can test the
 * private API route.
 */
import { auth } from "@clerk/nextjs/server";

export async function GET(req: Request) {
  const { userId, getToken } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const token = await getToken();

    return Response.json({ token });
  } catch (error) {
    return Response.json(error);
  }
}