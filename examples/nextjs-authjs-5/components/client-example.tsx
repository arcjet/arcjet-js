"use client"

import { useSession } from "next-auth/react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { useState } from "react"
import SessionData from "./session-data"
import CustomLink from "./custom-link"

const UpdateForm = () => {
  const { data: session, update } = useSession()
  const [name, setName] = useState(`New ${session?.user?.name}` ?? "")

  if (!session?.user) return null
  return (
    <>
      <h2 className="text-xl font-bold">Updating the session</h2>
      <form
        onSubmit={async () => {
          if (session) {
            const newSession = await update({
              ...session,
              user: { ...session.user, name },
            })
            console.log({ newSession })
          }
        }}
        className="flex items-center space-x-2 w-full max-w-sm"
      >
        <Input
          type="text"
          placeholder="New name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
          }}
        />
        <Button type="submit">Update</Button>
      </form>
    </>
  )
}

export default function ClientExample() {
  const { data: session, status } = useSession()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Client Side Rendering</h1>
      <p>
        This page fetches session data client side using the{" "}
        <CustomLink href="https://nextjs.authjs.dev/react#usesession">
          <code>useSession</code>
        </CustomLink>{" "}
        React Hook.
      </p>
      <p>
        It needs the{" "}
        <CustomLink href="https://react.devreference/nextjs/react/use-client">
          <code>'use client'</code>
        </CustomLink>{" "}
        directive at the top of the file to enable client side rendering, and
        the{" "}
        <CustomLink href="https://nextjs.authjs.dev/react#sessionprovider">
          <code>SessionProvider</code>
        </CustomLink>{" "}
        component in{" "}
        <strong>
          <code>client-example/page.tsx</code>
        </strong>{" "}
        to provide the session data.
      </p>

      {status === "loading" ? (
        <div>Loading...</div>
      ) : (
        <SessionData session={session} />
      )}
      <UpdateForm />
    </div>
  )
}
