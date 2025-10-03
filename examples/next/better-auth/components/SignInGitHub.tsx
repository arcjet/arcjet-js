'use client'

import { authClient } from "@/auth-client"

export default function SignInButton() {
    const handleSignIn = async () => {
        await authClient.signIn.social({
            provider: "github",
            callbackURL: "/",
        })
    }

    return (
        <button onClick={handleSignIn}>Sign in with GitHub</button>
    )
}