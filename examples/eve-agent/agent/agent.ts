import { defineAgent } from "eve";

// The gateway catalog lacks context-window metadata for some model slugs.
// Without an explicit modelContextWindowTokens value, eve build fails in CI
// trying to look it up. Set it here to avoid the network dependency.
export default defineAgent({
  model: "anthropic/claude-opus-4-1",
  modelContextWindowTokens: 200000,
});
