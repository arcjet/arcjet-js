import { launchArcjet, policyInput } from "@arcjet/guard";
import { rampart } from "@arcjet/sensitive-info-rampart";
import { createServer } from "node:http";

const key = process.env.ARCJET_KEY;
if (!key) throw new Error("ARCJET_KEY is required");

const arcjet = launchArcjet({
  key,
  baseUrl: process.env.ARCJET_BASE_URL,
  sensitiveInfoBackend: rampart(),
});

const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Arcjet Guard policy example</title>
</head>
<body>
  <main>
    <h1>Send an email</h1>
    <p>The <code>email</code> policy allows only configured recipients. The body is evaluated locally and its raw value is never sent to Arcjet.</p>
    <form id="form">
      <p><label>Recipient<br>
        <small>Try <code>arcjet.com</code> for an allowed value.</small>
        <br><input name="to" value="arcjet.com" required>
      </label></p>
      <p><label>Body<br>
        <small>Try adding a credit card number to exercise local sensitive-info detection.</small>
        <br><textarea name="body" rows="6" cols="60" required>Hello from the JavaScript SDK.</textarea>
      </label></p>
      <button>Evaluate policy</button>
    </form>
    <section id="result" aria-live="polite" hidden></section>
  </main>
  <script>
    const form = document.querySelector('#form');
    const result = document.querySelector('#result');
    function showResult(conclusion, message) {
      const heading = document.createElement('h2');
      const description = document.createElement('p');
      heading.textContent = conclusion;
      description.textContent = message;
      result.replaceChildren(heading, description);
      result.hidden = false;
    }
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = form.querySelector('button');
      button.disabled = true;
      button.textContent = 'Evaluating…';
      try {
        const fields = new FormData(form);
        const response = await fetch('/evaluate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ to: fields.get('to'), body: fields.get('body') }),
        });
        const data = await response.json();
        showResult(
          data.conclusion || 'Error',
          data.message || data.reason || 'The policy could not be evaluated.',
        );
      } catch (error) {
        showResult('Error', error instanceof Error ? error.message : 'Unknown error');
      } finally {
        button.disabled = false;
        button.textContent = 'Evaluate policy';
      }
    });
  </script>
</body>
</html>`;

/** @param {import("node:http").IncomingMessage} request */
async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(page);
    return;
  }

  if (request.method === "POST" && request.url === "/evaluate") {
    try {
      const { to, body } = await readJson(request);
      if (typeof to !== "string" || typeof body !== "string") {
        throw new TypeError("Recipient and body must be strings");
      }
      const decision = await arcjet.guard({
        label: "email",
        inputs: {
          to: policyInput.server.string(to),
          body: policyInput.local.string(body),
        },
      });
      const message =
        decision.conclusion === "ALLOW"
          ? "The email is allowed by the active policy."
          : "The email was blocked by the active policy.";
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          conclusion: decision.conclusion,
          reason: decision.reason,
          message,
          policyStatus: decision.policyEvaluation?.status,
          results: decision.policyResults?.map(({ execution, result }) => ({
            execution,
            type: result.type,
            conclusion: result.conclusion,
          })),
        }),
      );
    } catch (error) {
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ message: error instanceof Error ? error.message : "Unknown error" }));
    }
    return;
  }

  response.writeHead(404).end();
});

server.listen(Number(process.env.PORT ?? 3000), "0.0.0.0");
