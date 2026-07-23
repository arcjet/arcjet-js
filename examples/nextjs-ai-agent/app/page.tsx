"use client";

import { useState } from "react";

interface Response {
  runId: string;
  correlationId: string;
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        throw new Error(`Error: ${res.statusText}`);
      }

      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "2rem",
        fontFamily: "system-ui",
      }}
    >
      <h1>Arcjet AI Agent Example</h1>
      <p>
        Ask a question about an order, e.g. "What's the status of order 42?"
      </p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about an order, e.g. what's the status of order 42?"
          style={{
            width: "100%",
            padding: "0.5rem",
            marginBottom: "1rem",
            fontSize: "1rem",
          }}
        />
        <button
          type="submit"
          disabled={loading || !question}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Calling agent..." : "Submit"}
        </button>
      </form>

      {error && (
        <div style={{ color: "red", marginTop: "1rem" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {response && (
        <div style={{ marginTop: "2rem", padding: "1rem", background: "#f0f0f0" }}>
          <h2>Response</h2>
          <p>
            <strong>Run ID:</strong> <code>{response.runId}</code>
          </p>
          <p>
            <strong>Correlation ID:</strong> <code>{response.correlationId}</code>
          </p>
          <div style={{ marginTop: "1rem" }}>
            <p>
              Inspect the workflow run with:
            </p>
            <code>npx workflow inspect runs</code>
            <p>or</p>
            <code>npx workflow web</code>
            <p style={{ marginTop: "1rem" }}>
              View Arcjet decisions in the dashboard filtered by the{" "}
              <code>correlationId</code> above.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
