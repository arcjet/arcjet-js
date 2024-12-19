import { auth } from "auth"

export default async function Index() {
  const session = await auth()
  if (!session) return <div>Not authenticated</div>

  return (
    <div>
      <h1>Hello world</h1>
    </div>
  )
}