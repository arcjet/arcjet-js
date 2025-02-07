'use client'

import { authClient } from "@/auth-client"
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
    const router = useRouter()

    return (
        <button onClick={async () => {
            await authClient.signOut({
                fetchOptions: {
                    onSuccess: () => {
                        router.push("/");
                    },
                },
            })
        }}>Sign out</button>
    )
}