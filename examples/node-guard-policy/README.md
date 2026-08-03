# Arcjet Guard remote policy with Node.js

This advanced TypeScript demo uses the Vercel AI SDK to model a financial
adviser with two tools. `getClientRecord` is an unguarded read tool that returns
the current actor's structured financial record. `sendEmail` is wrapped with
`guardTool`, so Arcjet evaluates the model-selected recipient and body before
the simulated email side effect can run.

The server—not the browser—maps each trusted actor/client ID to its financial
record and allowed recipients. The browser submits only the selected client and
scenario; it cannot supply an actor, record, or allow-list.

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

The example configures the Rampart sensitive-info backend. This activates the
backend-only `SSN`, `BANK_ACCOUNT`, and `ROUTING_NUMBER` entity types used by
the demo, in addition to the allowed entity types above.

The current architecture evaluates prompt injection server-side, so the
inbound message is intentionally a server input. Actor, client record, and
allowed recipients remain server-owned.

## Run

Build the SDK from the repository root, then install and start the example:

```sh
npm ci
npm run build --workspace @arcjet/guard
cd examples/node-guard-policy
npm ci
cp .env.local.example .env.local
# Set ARCJET_KEY and AI_GATEWAY_API_KEY in .env.local
npm start
```

Open <http://localhost:3000>. The plain browser form intentionally has no custom
CSS or assets. Its trace shows the model fetching the client record, choosing
`sendEmail`, and receiving the aggregate conclusion, every denying rule, and
any detected sensitive-info entity types.

## Demo sequence

Run each scenario for either client:

- **Benign request** sends a PII-free acknowledgement to the client's own
  allowed address.
- **Wrong recipient** is denied only by membership for Client A, while the same
  recipient is allowed for Client B.
- **Sensitive information leak** uses the client's allowed address, isolating
  the sensitive-info control when the model echoes account details.
- **Layered defense** attempts an external recipient and account-data
  exfiltration. Membership and sensitive-info provide deterministic backstops;
  prompt-injection detection may add another denial reason.

Keep all rules in **LIVE** for this matrix. Review each decision in the Console
to show the trusted actor and per-rule evidence, then change and publish the
policy to demonstrate enforcement without an application deployment.
