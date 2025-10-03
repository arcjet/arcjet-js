import { auth } from "@/auth"
import { headers } from "next/headers"
import SignInButton from '@/components/SignInGitHub'
import SignOutButton from "@/components/SignOut"
import SignUp from "@/components/SignUp"

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  if (!session) {
    return (
      <>
        <div>Not authenticated. <SignInButton /> or sign up below.</div>
        <div><SignUp /></div>
      </>
    )
  }

  return (
    <div>
      <h1>Welcome {session.user.name}. <SignOutButton /></h1>
    </div>
  )
}