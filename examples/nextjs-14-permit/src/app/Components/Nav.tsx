"use client";
import Link from "next/link";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Nav({ activeMenu: active }: { activeMenu: string }) {
  return (
    <>
      <h1>Arcjet, Clerk, and Permit Demo</h1>
      <nav>
        <ul>
          <li>
            <Link href="/" className={active === "home" ? "active" : ""}>
              Home
            </Link>
          </li>
          <li>
            <Link href="/stats" className={active === "stats" ? "active" : ""}>
              Stats
            </Link>
          </li>
        </ul>
        <SignedOut>
          <SignInButton>
            <ul>
              <li>
                <a>Sign In</a>
              </li>
            </ul>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </nav>
    </>
  );
}
