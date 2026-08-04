# Arcjet Guard remote policy with Next.js

This advanced Next.js demo uses the Vercel AI SDK to model a financial adviser
with two tools. `getClientRecord` is an unguarded read tool that returns the
current actor's structured financial record. `sendEmail` is wrapped with
`guardTool`, so Arcjet evaluates the model-selected recipient and body before
the simulated email side effect can run.

The server—not the browser—maps each trusted actor/client ID to its financial
record and allowed recipients. The browser submits the selected client,
scenario, and an allow-listed model ID; it cannot supply an actor, record, or
recipient allow-list.

## Policy configuration

Create a Guard policy labelled `email.sent` (or set `GUARD_POLICY_LABEL`) with
these inputs:

- `recipient`: server string
- `allowed_recipients`: server string list
- `body`: local string
- `incoming_message`: server string

Add these rules:

1. **Allowed-list membership** requiring `recipient` to be a member of
   `allowed_recipients`.
2. **Sensitive info** on `body`, allowing `EMAIL`, `GIVEN_NAME`, and `SURNAME`
   while denying every other detected entity type.
3. **Prompt injection** on `incoming_message`.

The example configures the Rampart sensitive-info backend. The structured demo
record uses public sandbox bank values that Rampart identifies as
`BANK_ACCOUNT` and `ROUTING_NUMBER`; the `SSN` recognizer provides an additional
deterministic backstop. The values come from the
[Worldpay](https://docs.worldpay.com/apis/payrix/dev-int-guide/initial-setup/testing/test-cards-and-accounts)
and [BILL](https://developer.bill.com/docs/sandbox-bank-account-setup) sandbox
documentation.

The current architecture evaluates prompt injection server-side, so the
inbound message is intentionally a server input. Actor, client record, and
allowed recipients remain server-owned.

## Run

Build the SDK from the repository root, then install and start the example:

```sh
npm ci
npm run build --workspace @arcjet/guard
cd examples/nextjs-guard-policy
npm ci
cp .env.local.example .env.local
# Set ARCJET_KEY and AI_GATEWAY_API_KEY in .env.local
npm run dev
```

Open <http://localhost:3000>. The trace shows the model fetching the client
record, choosing `sendEmail`, and receiving the aggregate conclusion, every
denying rule, and any detected sensitive-info entity types.

## Demo sequence

Run each scenario for either client:

- **Benign request** sends a PII-free acknowledgement to the client's own
  allowed address.
- **Wrong recipient** is denied only by membership for Client A, while the same
  recipient is allowed for Client B.
- **Sensitive information leak** uses the client's allowed address, isolating
  the sensitive-info control when the model echoes account details.
- **Layered defense** contains an injected request for an external recipient
  and account-data exfiltration. When a model follows it, membership and
  sensitive-info provide deterministic backstops; prompt-injection detection
  may add another denial reason.

The layered-defense scenario also exposes a model selector. Start with
**GPT-4o mini**, which reliably demonstrates the injected external send reaching
the guarded tool. Then compare **GPT-5 mini** and the latest **GPT-5.6 Sol**:
newer models may ignore the injected destination or sanitize the body before
calling the tool. Model behavior is nondeterministic, which is the point of the
comparison; Arcjet remains the deterministic enforcement boundary whenever a
model attempts an unsafe action. Other scenarios use GPT-4o.

Keep all rules in **LIVE** for this matrix. Review each decision in the Console
to show the trusted actor and per-rule evidence, then change and publish the
policy to demonstrate enforcement without an application deployment.
