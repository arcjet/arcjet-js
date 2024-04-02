export default function Home() {
  return (
    <>
      <main>
        <div>
          <h1>Arcjet Rate Limit / NextAuth Authentication Example</h1>
          <p>
            This API route is protected with an Arcjet rate limit.
            <a href="/api/arcjet">
              <code>/api/arcjet</code>
            </a>
          </p>
          <ul>
            <li>
              Unauthenticated users receive a low rate limit based on the user
              IP address.
            </li>
            <li>
              Users authenticated with NextAuth have a higher rate limit based on
              the user email.
            </li>
          </ul>

          <h2>Testing the private endpoint</h2>
          <ol>
            <li>
              Visit{" "}
              <a href="/api/auth/signin">
                <code>/api/auth/signin</code>
              </a>{" "}
             to log in.
            </li>
            <li>
              Visit{" "}
              <a href="/api/arcjet">
                <code>/api/arcjet</code>
              </a>{" "}
              in your browser
            </li>
          </ol>
        </div>
      </main>
    </>
  );
}