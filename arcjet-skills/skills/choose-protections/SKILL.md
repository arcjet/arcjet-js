---
name: choose-protections
description: Choose which Arcjet rules address a security problem. Use when deciding between detectBot, shield, rate limits, detectPromptInjection, sensitiveInfo, validateEmail, filter, or Guard-only content moderation.
license: Apache-2.0
compatibility: JavaScript and TypeScript Arcjet SDK.
metadata:
  author: arcjet
  type: core
  library: "@arcjet/skills"
  library_version: "1.11.0" # x-release-please-version
sources:
  - docs/choose-protections.md
---

# Choose Arcjet protections

Load this skill when you need to pick rules. Then load `@arcjet/skills#protect`
or `@arcjet/skills#guard` to implement them.

| Problem | Rule | Where |
| --- | --- | --- |
| Bots, scrapers, automated clients | `detectBot` (`allow` **or** `deny`, not both) | Request only |
| SQLi / XSS / common probes | `shield` (`mode: "LIVE"`) | Request only |
| Cost / abuse quotas | `tokenBucket`, `fixedWindow`, `slidingWindow` | Request and Guard |
| Jailbreaks, instruction overrides | `detectPromptInjection` | Request and Guard |
| Card / email / phone / IP in text | `sensitiveInfo` / `localDetectSensitiveInfo` | Request and Guard |
| Names, addresses, gov IDs | same rules + `@arcjet/sensitive-info-rampart` | Server runtime |
| Unsafe / abusive text | `moderateContent` | Guard only |
| Signup spam, disposable email | `validateEmail` + `protectSignup` | Request only |
| VPN / Tor / country / IP lists | `filter` | Request only |
| Dangerous tool calls | Guard per-tool `label` + rate limits | Guard only |

Token bucket: variable-cost AI (`requested` per call). Fixed window: hard cap.
Sliding window: no boundary burst. Request rate limits default to IP; set
`characteristics: ["userId"]` for a user key. Guard rate limits always need
`key` and `bucket`.

`capture()` records that an action happened. It is not a protection rule.

Remote bot and filter rules can be managed with the CLI or MCP without a
redeploy — load `@arcjet/skills#cli` or `@arcjet/skills#mcp`.
