# Arcjet Guard remote policy with Node.js

This example evaluates the remotely configured `email` policy with two typed
inputs: a server-visible recipient and a body that remains in local SDK memory.

## Run

Build the SDK from the repository root, then install and start the example:

```sh
npm ci
npm run build --workspace @arcjet/guard
cd examples/node-guard-policy
npm ci
cp .env.local.example .env.local
# Set ARCJET_KEY in .env.local
npm start
```

Open <http://localhost:3000>. The form displays the overall decision and the
results of both remote-policy rules.
