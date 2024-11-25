/**
 * This retrieves the Clerk JWT token for the current user so you can test the
 * private API route.
 */
import { auth } from "@clerk/nextjs/server";

export async function GET(req: Request) {
  const { userId, getToken, redirectToSignIn } = await auth();

  if (!userId) return redirectToSignIn()

  try {
    const token = await getToken();

    return Response.json({ token });
  } catch (error) {
    return Response.json(error);
  }
}