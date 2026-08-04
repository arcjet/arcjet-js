"use client";

import { useEffect, useState, type FormEvent } from "react";

interface DemoContext {
  clients: Record<
    string,
    {
      label: string;
      actor: string;
      record: Record<string, string>;
      allowedRecipients: readonly string[];
    }
  >;
  models: Record<string, { label: string }>;
  defaultInjectionModel: string;
  scenarios: Record<string, { label: string; message: string }>;
}

interface TraceEvent {
  type: "tool-call" | "tool-result";
  tool: string;
  input?: unknown;
  output?: unknown;
}

interface Evaluation {
  message?: string;
  sentEmail?: { recipient: string; body: string };
  guardResult?: { summary?: string } & Record<string, unknown>;
  model?: string;
  correlationId?: string;
  trace?: TraceEvent[];
}

export default function Home() {
  const [context, setContext] = useState<DemoContext>();
  const [client, setClient] = useState("client-a");
  const [scenario, setScenario] = useState("benign");
  const [model, setModel] = useState("");
  const [result, setResult] = useState<Evaluation>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    async function loadContext() {
      try {
        const response = await fetch("/api/context");
        if (!response.ok) throw new Error("Could not load the demo context");
        const value = (await response.json()) as DemoContext;
        setContext(value);
        setModel(value.defaultInjectionModel);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not load the demo context");
      }
    }

    void loadContext();
  }, []);

  const selectedClient = context?.clients[client];
  const selectedScenario = context?.scenarios[scenario];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);
    setResult(undefined);
    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ client, scenario, model }),
      });
      const data = (await response.json()) as Evaluation;
      if (!response.ok) throw new Error(data.message ?? "Evaluation failed");
      setResult(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Evaluation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>On behalf of the wrong client</h1>
      <p>
        A Vercel AI SDK financial adviser reads a support thread and chooses which tools to call.
        Arcjet guards the email tool at the boundary before its side effect can run.
      </p>
      <form onSubmit={handleSubmit}>
        <p>
          <label>
            Client<br />
            <select value={client} onChange={(event) => setClient(event.target.value)} required>
              {context === undefined ? (
                <option value="client-a">Loading…</option>
              ) : (
                Object.entries(context.clients).map(([id, value]) => (
                  <option key={id} value={id}>
                    {value.label}
                  </option>
                ))
              )}
            </select>
          </label>
        </p>
        <p>
          <label>
            Scenario<br />
            <select value={scenario} onChange={(event) => setScenario(event.target.value)} required>
              {context === undefined ? (
                <option value="benign">Loading…</option>
              ) : (
                Object.entries(context.scenarios).map(([id, value]) => (
                  <option key={id} value={id}>
                    {value.label}
                  </option>
                ))
              )}
            </select>
          </label>
        </p>
        {scenario === "injection" && context !== undefined && (
          <p>
            <label>
              Model<br />
              <select value={model} onChange={(event) => setModel(event.target.value)}>
                {Object.entries(context.models)
                  .filter(([id]) => id !== "gpt-4o")
                  .map(([id, value]) => (
                    <option key={id} value={id}>
                      {value.label}
                    </option>
                  ))}
              </select>
            </label>
          </p>
        )}
        <section aria-live="polite">
          <h2>Run context</h2>
          <h3>Inbound customer message (untrusted)</h3>
          <pre>{selectedScenario?.message ?? "Loading…"}</pre>
          <h3>
            <code>getClientRecord</code> returns
          </h3>
          <pre>
            {selectedClient === undefined
              ? "Loading…"
              : JSON.stringify(
                  { clientId: selectedClient.actor, record: selectedClient.record },
                  null,
                  2,
                )}
          </pre>
          <h3>Allowed recipients for this client</h3>
          <pre>
            {selectedClient === undefined
              ? "Loading…"
              : JSON.stringify(selectedClient.allowedRecipients, null, 2)}
          </pre>
        </section>
        <button disabled={loading || context === undefined}>
          {loading ? "Generating and evaluating…" : "Handle latest support request"}
        </button>
      </form>

      {error !== undefined && (
        <section aria-live="polite">
          <h2>No email sent</h2>
          <p className="error">{error}</p>
        </section>
      )}

      {result !== undefined && (
        <section aria-live="polite">
          <h2>{result.sentEmail === undefined ? "No email sent" : "Email sent (simulated)"}</h2>
          {result.model !== undefined && (
            <p>Model: {context?.models[result.model]?.label ?? result.model}</p>
          )}
          <p>{result.message || "The agent did not return a response."}</p>
          {result.correlationId !== undefined && (
            <p>
              Correlation ID: <code>{result.correlationId}</code>
            </p>
          )}
          {result.guardResult !== undefined && (
            <>
              <h3>Guard result</h3>
              <p>{result.guardResult.summary}</p>
              <pre>{JSON.stringify(result.guardResult, null, 2)}</pre>
            </>
          )}
          {result.sentEmail !== undefined && (
            <>
              <h3>Sent email</h3>
              <pre>{JSON.stringify(result.sentEmail, null, 2)}</pre>
            </>
          )}
          <h3>Tool trace</h3>
          <ul className="trace-list">
            {(result.trace ?? []).map((event, index) => (
              <li key={`${event.type}-${event.tool}-${index}`}>
                <strong>
                  {event.type}: {event.tool}
                </strong>
                <pre>{JSON.stringify(event.type === "tool-call" ? event.input : event.output, null, 2)}</pre>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
