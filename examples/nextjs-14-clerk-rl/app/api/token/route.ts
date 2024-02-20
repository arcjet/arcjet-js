/**
 * This retrieves the Clerk JWT token for the current user so you can test the
 * private API route.
 */
import { auth } from "@clerk/nextjs";

export async function GET(req: Request) {
  const { userId, getToken } = auth();

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