import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const config = {
  // matcher tells Next.js which routes to run the middleware on
  matcher: ["/"],
};

export default async function middleware() {
  const cook = await cookies();

  // Give each user a unique identifier that Arcjet can use to create a fingerprint
  cook.set("uid", crypto.randomUUID())

  return NextResponse.next();
}
