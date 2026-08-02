# Arcjet Guard remote policy with Node.js

This advanced TypeScript demo uses the Vercel AI SDK to show how an injected
message can make a financial adviser email the right information on behalf of
the wrong client. The server—not the browser—maps each trusted actor/client ID
to its account data and allowed recipients. The AI generates the attempted
recipient and email body; Arcjet checks both before the simulated send.

## Policy configuration

Create a Guard policy labelled `email` (or set `GUARD_POLICY_LABEL`) with these
inputs:

- `recipient`: server string
- `allowed_recipients`: server string list
- `body`: local string
- `incoming_message`: server string

Add these rules:

1. **Allowed-list membership** requiring `recipient` to be a member of
   `allowed_recipients`.
2. **Prompt injection** on `incoming_message`.
3. **Sensitive info** on `body`, allowing Email address, Given name, and Surname
   while denying every other detected entity type.

The current architecture evaluates prompt injection server-side, so the incoming
message is intentionally a server input. The browser submits only the selected
client and incoming message. Actor, account data, and allowed recipients remain
server-owned.

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

Open <http://localhost:3000>. The form displays the overall decision and the
type and conclusion of every policy result.

## Demo sequence

1. In the Console, put all three rules in **DRY_RUN**. Select Client A and send to
   `advisor-backup@gmail.com`. The aggregate result is ALLOW (email simulated as
   sent), while per-rule results preserve would-have-blocked evidence.
2. Switch all three rules to **LIVE** and retry Client A. The email is not sent:
   the trusted allowlist excludes the backup address, the incoming message is
   hostile, and the body contains disallowed sensitive information.
3. Review the decision in the Console to show the trusted `client-a` actor and
   the evidence from each rule.
4. To isolate the actor-dependent rule, keep membership **LIVE**, return the two
   content rules to **DRY_RUN**, select Client B, and retry without changing the
   recipient or application. Client B's trusted list includes the address, so
   the simulated email is sent.
5. Tighten either content rule to **LIVE** and retry to demonstrate that policy
   changes take effect without an application deploy.
