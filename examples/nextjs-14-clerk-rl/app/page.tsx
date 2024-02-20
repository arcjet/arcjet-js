export default function Home() {
  return (
    <>
      <main>
        <div>
          <h1>Arcjet Rate Limit / Clerk Authentication Example</h1>
          <p>
            These two API routes are both protected with an Arcjet rate limit:
          </p>
          <ul>
            <li>
              <a href="/api/public">
                <code>/api/public</code>
              </a>{" "}
              does not require authentication and has a low rate limit based on
              the user IP address.
            </li>
            <li>
              <a href="/api/private">
                <code>/api/private</code>
              </a>{" "}
              uses Clerk authentication and has a higher rate limit based on the
              Clerk user ID.
            </li>
          </ul>

          <h2>Testing the private endpoint</h2>
          <ol>
            <li>
              Visit{" "}
              <a href="/api/token">
                <code>/api/token</code>
              </a>{" "}
              and then log in to Clerk.
            </li>
            <li>
              You will be redirected back to the <code>/api/token</code> page
              with a token output on the page.
            </li>
            <li>
              Visit{" "}
              <a href="/api/private">
                <code>/api/private</code>
              </a>{" "}
              in your browser or use the token to send several <code>curl</code>{" "}
              requests to <code>/api/private</code>
            </li>
          </ol>

          <pre>
            curl -v http://localhost:3000/api/private -H "Authorization: Bearer
            TOKENHERE"
          </pre>
        </div>
      </main>
    </>
  );
}