# Changelog

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
