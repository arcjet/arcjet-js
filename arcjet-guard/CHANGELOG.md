# Changelog

## [1.12.0](https://github.com/arcjet/arcjet-js/compare/v1.11.0...@arcjet/guard-v1.12.0) (2026-09-05)


### 🚀 New Features

* **guard:** add Claude Managed Agents as `@arcjet/guard/claude-managed-agents/v0` ([#6265](https://github.com/arcjet/arcjet-js/issues/6265)) ([b137824](https://github.com/arcjet/arcjet-js/commit/b137824779c2e21886a8f8385ff008337f10d083))
* **guard:** add Google ADK support as @arcjet/guard/google-adk/v2 ([#6264](https://github.com/arcjet/arcjet-js/issues/6264)) ([ed4edfb](https://github.com/arcjet/arcjet-js/commit/ed4edfb20a470c23817b51a52923359fb1b255f7))
* **guard:** add TanStack AI support as @arcjet/guard/tanstack-ai/v0 ([#6260](https://github.com/arcjet/arcjet-js/issues/6260)) ([d730d57](https://github.com/arcjet/arcjet-js/commit/d730d57a124f03843f085d41f64b0355a09d1eab))
* **guard:** record `degraded` when policy did not judge an action fully ([#6250](https://github.com/arcjet/arcjet-js/issues/6250)) ([bef4fec](https://github.com/arcjet/arcjet-js/commit/bef4fecbcd8fc104b733816f205adfa3ac3409b4))
* ship versioned Agent Skills with TanStack Intent ([#6261](https://github.com/arcjet/arcjet-js/issues/6261)) ([d93d25e](https://github.com/arcjet/arcjet-js/commit/d93d25e5428069d3daac8cbe90856f70bed237dc))


### 🪲 Bug Fixes

* **guard:** import Eve Approval types from eve/tools/approval ([#6253](https://github.com/arcjet/arcjet-js/issues/6253)) ([fa4c092](https://github.com/arcjet/arcjet-js/commit/fa4c0922e56073be0b5d61a5a1c1192e2171cea2))
* **transport:** port HTTP/2 PING keep-alive and connection recycling ([#6255](https://github.com/arcjet/arcjet-js/issues/6255)) ([#6256](https://github.com/arcjet/arcjet-js/issues/6256)) ([e2c3304](https://github.com/arcjet/arcjet-js/commit/e2c3304cf2f407e4f8d639b0759157ba3dc150e7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.11.0 to 1.12.0
    * @arcjet/logger bumped from 1.11.0 to 1.12.0
    * @arcjet/transport bumped from 1.11.0 to 1.12.0

## [1.11.0](https://github.com/arcjet/arcjet-js/compare/v1.10.0...@arcjet/guard-v1.11.0) (2026-08-25)


### 🚀 New Features

* **guard:** add Claude Agent SDK support as @arcjet/guard/claude-agent-sdk/v0 ([#6229](https://github.com/arcjet/arcjet-js/issues/6229)) ([43838ef](https://github.com/arcjet/arcjet-js/commit/43838ef336df9a71b16760575a7ae81abf711897))
* **guard:** add Eve 0.34+ request/response approval support ([#6231](https://github.com/arcjet/arcjet-js/issues/6231)) ([66d8b0c](https://github.com/arcjet/arcjet-js/commit/66d8b0c66c2559889131db0ecdc06392cbda387a))
* **guard:** add Genkit support as @arcjet/guard/genkit/v1 ([#6243](https://github.com/arcjet/arcjet-js/issues/6243)) ([4e41678](https://github.com/arcjet/arcjet-js/commit/4e416787b5aad709476173f5daf6c30212710c37))
* **guard:** add LangChain createAgent support as @arcjet/guard/langchain/v1 ([#6248](https://github.com/arcjet/arcjet-js/issues/6248)) ([c49abcc](https://github.com/arcjet/arcjet-js/commit/c49abcc1f9afce7d284b6c294d0dcee5916ada86))
* **guard:** add LangGraph support as @arcjet/guard/langgraph/v1 ([#6230](https://github.com/arcjet/arcjet-js/issues/6230)) ([a5debc7](https://github.com/arcjet/arcjet-js/commit/a5debc78e3cead84b3487f2a874efc9bbcb73845))
* **guard:** add Mastra support as @arcjet/guard/mastra/v1 ([#6226](https://github.com/arcjet/arcjet-js/issues/6226)) ([40cf399](https://github.com/arcjet/arcjet-js/commit/40cf39910fc868559fc4558ccf747723f58f810a))
* **guard:** add OpenAI Agents support as @arcjet/guard/openai-agents/v0 ([#6233](https://github.com/arcjet/arcjet-js/issues/6233)) ([0099fb7](https://github.com/arcjet/arcjet-js/commit/0099fb76e9229fa0b5922f938f4f1ce2e1033ce1))
* **guard:** add Strands Agents support as `@arcjet/guard/strands-agents/v1` ([#6251](https://github.com/arcjet/arcjet-js/issues/6251)) ([f3a07ee](https://github.com/arcjet/arcjet-js/commit/f3a07ee675cbdd812a36dcb778ee4325d2f89617))
* **guard:** graduate moderateContent from experimental ([#6228](https://github.com/arcjet/arcjet-js/issues/6228)) ([c50a947](https://github.com/arcjet/arcjet-js/commit/c50a9474c040b413e2f7334665642e37570b4003))
* **guard:** one denial payload, per-framework envelopes ([#6240](https://github.com/arcjet/arcjet-js/issues/6240)) ([fdec043](https://github.com/arcjet/arcjet-js/commit/fdec043e082f3998bcff2278905e9b4a3e553fe1))


### 🪲 Bug Fixes

* **guard:** agent adapter tweaks ([#6232](https://github.com/arcjet/arcjet-js/issues/6232)) ([286538e](https://github.com/arcjet/arcjet-js/commit/286538ec0357d2b9b655ed1158ae9ff3ac3939a0))
* **guard:** export package.json from @arcjet/guard ([#6239](https://github.com/arcjet/arcjet-js/issues/6239)) ([7a3086a](https://github.com/arcjet/arcjet-js/commit/7a3086a82b4e9648f82efb429d45b679da87bbac))


### 🧹 Miscellaneous Chores

* change release to 1.11.0 ([#6246](https://github.com/arcjet/arcjet-js/issues/6246)) ([752bd24](https://github.com/arcjet/arcjet-js/commit/752bd242f7bd6f128b530a133fcae2f7d4d686fa))


### ✅ Continuous Integration

* **guard:** consolidate optional-peer absent unit tests ([#6244](https://github.com/arcjet/arcjet-js/issues/6244)) ([c5329da](https://github.com/arcjet/arcjet-js/commit/c5329da88c5c438e086bb931bda43d12c1704445))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.10.0 to 1.11.0
    * @arcjet/logger bumped from 1.10.0 to 1.11.0

## [Unreleased]


### 🚀 New Features

* **guard:** add Eve 0.34+ request/response approval support
* **guard:** graduate moderateContent from experimental


## [1.10.0](https://github.com/arcjet/arcjet-js/compare/v1.9.1...@arcjet/guard-v1.10.0) (2026-08-11)


### 🚀 New Features

* expand metadata to nested JSON on guard() and protect() ([#6171](https://github.com/arcjet/arcjet-js/issues/6171)) ([caedefa](https://github.com/arcjet/arcjet-js/commit/caedefa10dc776c45f35977672add3d41b5b0b96))
* expose threat and billing metadata ([#6207](https://github.com/arcjet/arcjet-js/issues/6207)) ([aa94784](https://github.com/arcjet/arcjet-js/commit/aa947842857065465d60a5bcb156205176a20c96))
* **guard:** add capture client surface ([#6175](https://github.com/arcjet/arcjet-js/issues/6175)) ([95e07ef](https://github.com/arcjet/arcjet-js/commit/95e07efe299256bb76e20ab40c8ea69848237b9e))
* **guard:** add Eve support as @arcjet/guard/vercel-eve/v0 ([#6208](https://github.com/arcjet/arcjet-js/issues/6208)) ([e3a399d](https://github.com/arcjet/arcjet-js/commit/e3a399d5020bd4ec83cbd823ff53867bc3f8ee78))
* **guard:** add provider-namespaced AI SDK helpers as @arcjet/guard subpaths ([#6164](https://github.com/arcjet/arcjet-js/issues/6164)) ([90a867a](https://github.com/arcjet/arcjet-js/commit/90a867a32e382d7b049d4a7b0143551c3d82a195))
* **guard:** batch and flush capture delivery ([#6176](https://github.com/arcjet/arcjet-js/issues/6176)) ([3a3a74a](https://github.com/arcjet/arcjet-js/commit/3a3a74aef119d9b418eb01512b04109c2cd442b3))
* **guard:** evaluate remote local policies first ([#6222](https://github.com/arcjet/arcjet-js/issues/6222)) ([78183d9](https://github.com/arcjet/arcjet-js/commit/78183d9b3ed84161b85d00246be5737aa0b2e323))
* **guard:** evaluate remote policies ([#6186](https://github.com/arcjet/arcjet-js/issues/6186)) ([63e6939](https://github.com/arcjet/arcjet-js/commit/63e6939f4a272a4fc12733cf9c9eecd449d5835c))


### 🪲 Bug Fixes

* **guard:** pin @connectrpc/* and @bufbuild/protobuf to exact versions ([#6165](https://github.com/arcjet/arcjet-js/issues/6165)) ([a1114c3](https://github.com/arcjet/arcjet-js/commit/a1114c30e2db5843192583fb234775fdcd7bc7fe))


### 📝 Documentation

* **guard:** clarify failure defaults ([#6219](https://github.com/arcjet/arcjet-js/issues/6219)) ([d2358ea](https://github.com/arcjet/arcjet-js/commit/d2358ea174881717240aa1dfed3c1c2a51f2ff7d))


### 🧹 Miscellaneous Chores

* adjust Arcjet descriptions ([#6181](https://github.com/arcjet/arcjet-js/issues/6181)) ([c6f3928](https://github.com/arcjet/arcjet-js/commit/c6f3928f1b6a0fe49394104973aa096a0b981020))
* **proto:** sync generated bindings with arcjet monorepo main ([#6163](https://github.com/arcjet/arcjet-js/issues/6163)) ([500a889](https://github.com/arcjet/arcjet-js/commit/500a8895253dc02d74cd3a4d98dc21247f1baf15))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.9.1 to 1.10.0
    * @arcjet/logger bumped from 1.9.1 to 1.10.0

## [1.9.1](https://github.com/arcjet/arcjet-js/compare/v1.9.0...@arcjet/guard-v1.9.1) (2026-07-15)


### 🧹 Miscellaneous Chores

* **@arcjet/guard:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.9.0 to 1.9.1

## [1.9.0](https://github.com/arcjet/arcjet-js/compare/v1.8.0...@arcjet/guard-v1.9.0) (2026-07-15)


### 🚀 New Features

* add Rampart model backend to localDetectSensitiveInfo ([#6141](https://github.com/arcjet/arcjet-js/issues/6141)) ([a77cacc](https://github.com/arcjet/arcjet-js/commit/a77cacc392fba1d8edda2740ffda0eb1e8e14363))


### 🪲 Bug Fixes

* **arcjet-guard:** detect and recycle silently dropped HTTP/2 connections ([#6137](https://github.com/arcjet/arcjet-js/issues/6137)) ([742cb4b](https://github.com/arcjet/arcjet-js/commit/742cb4ba5c0f8b648966ae2bdf41b8e335a380bc))
* **arcjet-guard:** make connection recycling single-flight per session generation ([#6138](https://github.com/arcjet/arcjet-js/issues/6138)) ([ca0883c](https://github.com/arcjet/arcjet-js/commit/ca0883c896a7fed3b3a6055f7fac3940d6b50719))


### ✅ Continuous Integration

* **publish:** pass dist-tag via --tag and drop publishConfig.tag ([#6133](https://github.com/arcjet/arcjet-js/issues/6133)) ([a429662](https://github.com/arcjet/arcjet-js/commit/a42966201819b906be047c0c95ec3c8c3d1c3f48))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.8.0 to 1.9.0

## [1.8.0](https://github.com/arcjet/arcjet-js/compare/v1.7.0...@arcjet/guard-v1.8.0) (2026-07-07)


### 🚀 New Features

* publish 1.8.0 overtop of erroneously published 1.8.0-rc.0 ([#6132](https://github.com/arcjet/arcjet-js/issues/6132)) ([3929316](https://github.com/arcjet/arcjet-js/commit/3929316e62bb9c5fbb60dfb64f341754622df4c1))


### 🧹 Miscellaneous Chores

* modernize build tooling ([#6093](https://github.com/arcjet/arcjet-js/issues/6093)) ([48b89ea](https://github.com/arcjet/arcjet-js/commit/48b89ea27596556169155cb0215d085e59982ae2))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.7.0 to 1.8.0

## [1.7.0](https://github.com/arcjet/arcjet-js/compare/v1.6.1...@arcjet/guard-v1.7.0) (2026-07-06)


### 🚀 New Features

* publish 1.7.0 overtop of erroneously published 1.7.0-rc.1 ([#6125](https://github.com/arcjet/arcjet-js/issues/6125)) ([2d239c5](https://github.com/arcjet/arcjet-js/commit/2d239c576be4879a0b517d4e02b857756b3f4175))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.6.1 to 1.7.0

## [1.6.1](https://github.com/arcjet/arcjet-js/compare/v1.6.0...@arcjet/guard-v1.6.1) (2026-06-30)


### 🧹 Miscellaneous Chores

* **@arcjet/guard:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.6.0 to 1.6.1

## [1.6.0](https://github.com/arcjet/arcjet-js/compare/v1.5.0...@arcjet/guard-v1.6.0) (2026-06-30)


### 🚀 New Features

* add outbound proxy support to @arcjet/transport and @arcjet/guard ([#6089](https://github.com/arcjet/arcjet-js/issues/6089)) ([0048dfa](https://github.com/arcjet/arcjet-js/commit/0048dfa08e95e77241eda93bc5c7392a38f58746))
* **arcjet-guard:** add per-request metadata to experimental_moderateContent ([#6100](https://github.com/arcjet/arcjet-js/issues/6100)) ([fe28505](https://github.com/arcjet/arcjet-js/commit/fe285057f037f02b5cb01efa1f3fd02e75872f2b))
* **arcjet-guard:** export experimental_moderateContent from node and fetch entrypoints ([#6097](https://github.com/arcjet/arcjet-js/issues/6097)) ([1b7fc90](https://github.com/arcjet/arcjet-js/commit/1b7fc90c5144ce4ac5304ee533877dee81dae8a2))
* expose correlationId on protect() and guard() ([#6104](https://github.com/arcjet/arcjet-js/issues/6104)) ([14a3a1f](https://github.com/arcjet/arcjet-js/commit/14a3a1f201774dd9083eed26334121bfb893715a))
* **guard:** add experimental_moderateContent rule ([#6059](https://github.com/arcjet/arcjet-js/issues/6059)) ([b001765](https://github.com/arcjet/arcjet-js/commit/b00176529308c802c40f28776e4c7c4ad3d40bed))
* **guard:** error/warning decision model with hasFailedOpen() gate ([#6096](https://github.com/arcjet/arcjet-js/issues/6096)) ([8bbb885](https://github.com/arcjet/arcjet-js/commit/8bbb885fa564a23356bea0bfe98b6353add87de9))
* **protocol:** regenerate clients with correlation_id field ([#6098](https://github.com/arcjet/arcjet-js/issues/6098)) ([71346b3](https://github.com/arcjet/arcjet-js/commit/71346b3ad22d0fb734dedd74f327fb6e40e9d52c))
* require Node.js &gt;=22.21.0 and drop EOL Node.js 20 ([#6090](https://github.com/arcjet/arcjet-js/issues/6090)) ([d002118](https://github.com/arcjet/arcjet-js/commit/d00211896cd13f13dce90df9a5308fa942f334f7))


### 🪲 Bug Fixes

* **arcjet-guard:** accept object input on string-input rules ([#6114](https://github.com/arcjet/arcjet-js/issues/6114)) ([8e828d0](https://github.com/arcjet/arcjet-js/commit/8e828d00770181a5c07deb4229764976cb9e2f68))
* **guard:** split errorResult() from result() so errors aren't up-cast ([#6107](https://github.com/arcjet/arcjet-js/issues/6107)) ([b5317ed](https://github.com/arcjet/arcjet-js/commit/b5317ed749e104499acdb1a39033f70b4ceeee0b))


### 📝 Documentation

* use unified Arcjet skill install command ([#6115](https://github.com/arcjet/arcjet-js/issues/6115)) ([3007110](https://github.com/arcjet/arcjet-js/commit/300711084e55b09608e745d25290a8aeaf4cefb3))


### 🔨 Build System

* **deps:** bump undici and miniflare in /arcjet-guard ([#6091](https://github.com/arcjet/arcjet-js/issues/6091)) ([b15e4b9](https://github.com/arcjet/arcjet-js/commit/b15e4b993830c977513c2a184dea752c89ae70cc))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.5.0 to 1.6.0

## [1.5.0](https://github.com/arcjet/arcjet-js/compare/v1.4.0...@arcjet/guard-v1.5.0) (2026-06-09)


### 📝 Documentation

* clarify label/bucket slug validation in @arcjet/guard types ([#6043](https://github.com/arcjet/arcjet-js/issues/6043)) ([81293b3](https://github.com/arcjet/arcjet-js/commit/81293b3f310fb6c5e5136e747667a73a64fdd369))
* refresh root, next, and guard READMEs for guards release ([#6017](https://github.com/arcjet/arcjet-js/issues/6017)) ([994232c](https://github.com/arcjet/arcjet-js/commit/994232c83346cd75b93fc01095e7c1e5796b49c1))


### 🔨 Build System

* **deps-dev:** bump next from 16.2.4 to 16.2.6 in /arcjet-next ([#6028](https://github.com/arcjet/arcjet-js/issues/6028)) ([082c20f](https://github.com/arcjet/arcjet-js/commit/082c20fbb3aab1ecca2abc24aabd62bf4064b62c))
* **deps-dev:** bump next from 16.2.4 to 16.2.6 in /nosecone-next ([#6027](https://github.com/arcjet/arcjet-js/issues/6027)) ([29f3de1](https://github.com/arcjet/arcjet-js/commit/29f3de1d537b505a84b763427695af25cc5011c0))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.4.0 to 1.5.0

## [1.4.0](https://github.com/arcjet/arcjet-js/compare/v1.3.1...@arcjet/guard-v1.4.0) (2026-04-14)


### 🚀 New Features

* **guard:** promote @arcjet/guard from experimental to stable release ([#5996](https://github.com/arcjet/arcjet-js/issues/5996)) ([f511f44](https://github.com/arcjet/arcjet-js/commit/f511f446912d3a677772bf84744b2853b7dc5e49))


### 📝 Documentation

* add MCP server mentions to @arcjet/guard ([#5974](https://github.com/arcjet/arcjet-js/issues/5974)) ([cd398c0](https://github.com/arcjet/arcjet-js/commit/cd398c0fb551e6ea394584e7a8d8cf45a8a88b52))


### 🧹 Miscellaneous Chores

* **guard:** add legacy type resolution for typescript@&lt;=5 ([#5978](https://github.com/arcjet/arcjet-js/issues/5978)) ([fd6ad6d](https://github.com/arcjet/arcjet-js/commit/fd6ad6dff6f32379ec1e119a98675b7577469c56))
* **guard:** introduce arcjet guard js ([#5957](https://github.com/arcjet/arcjet-js/issues/5957)) ([53ff2e2](https://github.com/arcjet/arcjet-js/commit/53ff2e206c665431799e47d43c938b486d6b6eb7))
* **guard:** update protobuf ([#5986](https://github.com/arcjet/arcjet-js/issues/5986)) ([25f0e9e](https://github.com/arcjet/arcjet-js/commit/25f0e9e0d6acd81024addeadb9083b7e78b8a226))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.3.1 to 1.4.0
