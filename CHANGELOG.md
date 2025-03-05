# Changelog

## [1.0.0-beta.3](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.2...v1.0.0-beta.3) (2025-03-05)


### 🚀 New Features

* Add `@arcjet/inspect` package with utilities to inspect decisions ([#3455](https://github.com/arcjet/arcjet-js/issues/3455)) ([9b8db53](https://github.com/arcjet/arcjet-js/commit/9b8db53c0223ef7764deafbdb5909f9f9f9bf41c))
* **analyze:** Add Hydrozen monitoring bot ([#3132](https://github.com/arcjet/arcjet-js/issues/3132)) ([211dbd0](https://github.com/arcjet/arcjet-js/commit/211dbd0fe35f3a72c267fd21cfeb083214f66372))


### 🪲 Bug Fixes

* Include turbo plugin correctly ([#3451](https://github.com/arcjet/arcjet-js/issues/3451)) ([21da4d3](https://github.com/arcjet/arcjet-js/commit/21da4d3e57d1c18923eb05e9068ad7b98193ab37))
* **transport:** Add connect as a direct dependency to satisfy peerDep ([#3416](https://github.com/arcjet/arcjet-js/issues/3416)) ([96c7a48](https://github.com/arcjet/arcjet-js/commit/96c7a48b085329a389094fb47226434b024a4962))


### 📝 Documentation

* https://github.com/arcjet/arcjet-docs/pull/356 ([0514251](https://github.com/arcjet/arcjet-js/commit/051425101d4e025e692cf43652a9097218c307f4))


### 🧹 Miscellaneous Chores

* Change doc comments key examples ([#3465](https://github.com/arcjet/arcjet-js/issues/3465)) ([6389563](https://github.com/arcjet/arcjet-js/commit/63895638668877b7a612ef16495a1ccf14475e26))
* **ci:** Enable Bun Dependabot ecosystem ([#3190](https://github.com/arcjet/arcjet-js/issues/3190)) ([f01f4c2](https://github.com/arcjet/arcjet-js/commit/f01f4c2a2ffba117b60cfa73f380fe746d516b55))
* Disable dependabot for bun examples ([#3447](https://github.com/arcjet/arcjet-js/issues/3447)) ([1ce1a2c](https://github.com/arcjet/arcjet-js/commit/1ce1a2ca880420271ed08a9dd1d30b2ac1c5f71d))
* **examples:** Next.js + Better Auth ([#2750](https://github.com/arcjet/arcjet-js/issues/2750)) ([0514251](https://github.com/arcjet/arcjet-js/commit/051425101d4e025e692cf43652a9097218c307f4))
* Improved doc comments ([#3377](https://github.com/arcjet/arcjet-js/issues/3377)) ([dfb8445](https://github.com/arcjet/arcjet-js/commit/dfb8445c02a8c96bcc05c734f71c6d51d76a6689))
* regen wasm with bot improvements ([#3378](https://github.com/arcjet/arcjet-js/issues/3378)) ([b882835](https://github.com/arcjet/arcjet-js/commit/b882835940a5b1d258e422a410c538c01f452daf))
* Regenerate analyze & redact WebAssembly files ([#3404](https://github.com/arcjet/arcjet-js/issues/3404)) ([97df114](https://github.com/arcjet/arcjet-js/commit/97df114bc1bd19f3ec358a574a9cce7c0f87e3bf))
* Regenerate jco bindings ([#3098](https://github.com/arcjet/arcjet-js/issues/3098)) ([8268d83](https://github.com/arcjet/arcjet-js/commit/8268d833d6a9bfd7849447a05ae5455f279ba19f))
* Restrict jco in dependabot config ([#3446](https://github.com/arcjet/arcjet-js/issues/3446)) ([e7c8a65](https://github.com/arcjet/arcjet-js/commit/e7c8a657906b281031378c3d215d132dd4e6cc4d))
* Update trunk, linters, and allowed workflow endpoints ([#3097](https://github.com/arcjet/arcjet-js/issues/3097)) ([92dc38b](https://github.com/arcjet/arcjet-js/commit/92dc38b4e8951f54213a80a559fdf08382a965b2))


### ✅ Continuous Integration

* Run semgrep action on ubuntu-latest ([#3448](https://github.com/arcjet/arcjet-js/issues/3448)) ([ea3678d](https://github.com/arcjet/arcjet-js/commit/ea3678dea6dcfb28fad056da8e174e793caf9958))

## [1.0.0-beta.2](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.1...v1.0.0-beta.2) (2025-02-04)


### 🚀 New Features

* **env:** Support MODE environment variable for `isDevelopment` detection ([#3012](https://github.com/arcjet/arcjet-js/issues/3012)) ([f3a45a7](https://github.com/arcjet/arcjet-js/commit/f3a45a7d253c759d467e5ff2c1a52a924ea7496c))
* Implement Astro integration ([#2992](https://github.com/arcjet/arcjet-js/issues/2992)) ([a48eea8](https://github.com/arcjet/arcjet-js/commit/a48eea89f80bff18c9a1889fd83f1eed9092b110)), closes [#1075](https://github.com/arcjet/arcjet-js/issues/1075)
* **nestjs:** Allow NestJS v11 as peerDependency ([#3042](https://github.com/arcjet/arcjet-js/issues/3042)) ([4a75963](https://github.com/arcjet/arcjet-js/commit/4a75963f1c39bc584b6a0549ce44bd51cf8eeb59)), closes [#2921](https://github.com/arcjet/arcjet-js/issues/2921)
* **redact:** Pre-compile WebAssembly on module load ([#3037](https://github.com/arcjet/arcjet-js/issues/3037)) ([c12bec5](https://github.com/arcjet/arcjet-js/commit/c12bec58ee0abd3becb1e978596fed9047702d3d))


### 🪲 Bug Fixes

* **analyze:** Always lowercase headers and iterate in insertion order ([#2865](https://github.com/arcjet/arcjet-js/issues/2865)) ([a9af1e4](https://github.com/arcjet/arcjet-js/commit/a9af1e49eff46aaab16522e38df9f2ce7888f7fa))
* **arcjet:** Ensure Characteristics are readonly type on protect signup options ([#3013](https://github.com/arcjet/arcjet-js/issues/3013)) ([1f16a99](https://github.com/arcjet/arcjet-js/commit/1f16a997cbbc574bbed31c70f234e2598d348bf9))
* **protocol:** Double timeout when email rule configured ([#2934](https://github.com/arcjet/arcjet-js/issues/2934)) ([23f9a9e](https://github.com/arcjet/arcjet-js/commit/23f9a9eab277b9c2e1a350ca621367cefe0c0e1f)), closes [#1697](https://github.com/arcjet/arcjet-js/issues/1697)


### 🧹 Miscellaneous Chores

* **ci:** Add dependabot for Astro example ([#3068](https://github.com/arcjet/arcjet-js/issues/3068)) ([d4d8f82](https://github.com/arcjet/arcjet-js/commit/d4d8f822fa1949713ba5be699acfb049ac1d2fa6))
* **ci:** Avoid upgrading Tailwind where it breaks things ([#3081](https://github.com/arcjet/arcjet-js/issues/3081)) ([5c25abe](https://github.com/arcjet/arcjet-js/commit/5c25abe97fd4b62e3a9025878c7d93d0613c6e68))
* **ci:** Restrict tailwind-merge where tailwind restricted ([#3089](https://github.com/arcjet/arcjet-js/issues/3089)) ([a3437a5](https://github.com/arcjet/arcjet-js/commit/a3437a54583f4a46968f5d4b749a265be1ce781c))
* **docs:** Add a link to the Redact reference page ([#3038](https://github.com/arcjet/arcjet-js/issues/3038)) ([6095b6a](https://github.com/arcjet/arcjet-js/commit/6095b6a25aaf60b2c583a71babab54de53113b0c))
* Refresh root & Next.js READMEs ([#3066](https://github.com/arcjet/arcjet-js/issues/3066)) ([57a38d7](https://github.com/arcjet/arcjet-js/commit/57a38d7c61871f0d836aa9304ca1f787286c86c1))
* **rollup-config:** Consolidate wasmToModule plugin ([#3039](https://github.com/arcjet/arcjet-js/issues/3039)) ([c3b8e36](https://github.com/arcjet/arcjet-js/commit/c3b8e36dd59a0ca0c8a10946b0d76e4bc3766f40))

## [1.0.0-beta.1](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.34...v1.0.0-beta.1) (2025-01-15)


### ⚠ BREAKING CHANGES

* **redact:** Correctly handle urlencoded data when tokenizing characters ([#2864](https://github.com/arcjet/arcjet-js/issues/2864))
* Correctly handle urlencoded data when tokenizing characters ([#2863](https://github.com/arcjet/arcjet-js/issues/2863))
* **protocol:** Improve deprecation message on enum-like field usage ([#2855](https://github.com/arcjet/arcjet-js/issues/2855))
* refactor wasm loading for analyze ([#1832](https://github.com/arcjet/arcjet-js/issues/1832))

### 🚀 New Features

* Export more option types ([#2752](https://github.com/arcjet/arcjet-js/issues/2752)) ([89a9f77](https://github.com/arcjet/arcjet-js/commit/89a9f77a74031e0e22c0c77c5426b377daa5c8be)), closes [#2751](https://github.com/arcjet/arcjet-js/issues/2751)
* support `allow` or `deny` config in validateEmail & deprecate `block` config ([#2661](https://github.com/arcjet/arcjet-js/issues/2661)) ([890afcd](https://github.com/arcjet/arcjet-js/commit/890afcd2d1afef262b741a74521b82cb85711860)), closes [#1834](https://github.com/arcjet/arcjet-js/issues/1834)


### 🪲 Bug Fixes

* Correctly handle urlencoded data when tokenizing characters ([#2863](https://github.com/arcjet/arcjet-js/issues/2863)) ([fa93290](https://github.com/arcjet/arcjet-js/commit/fa93290b91ac1edc3acf44cd4f2a9ff324da3fbd))
* **protocol:** Improve deprecation message on enum-like field usage ([#2855](https://github.com/arcjet/arcjet-js/issues/2855)) ([6512258](https://github.com/arcjet/arcjet-js/commit/6512258546076d6ac3478b02337741c2c0dbf67f))
* **protocol:** Include `cookies` and `query` fields on reports ([#2777](https://github.com/arcjet/arcjet-js/issues/2777)) ([cff2e3a](https://github.com/arcjet/arcjet-js/commit/cff2e3ae4e3ed3e714d90cd52da26ec7b6a7c4cc))
* **redact:** Correctly handle urlencoded data when tokenizing characters ([#2864](https://github.com/arcjet/arcjet-js/issues/2864)) ([fbed883](https://github.com/arcjet/arcjet-js/commit/fbed8835f7e2c4ee659bcfafecad1bfa7898c7a4))


### 🏎️ Performance Improvements

* **analyze:** Compile WebAssembly upon module load ([#2727](https://github.com/arcjet/arcjet-js/issues/2727)) ([489f1c6](https://github.com/arcjet/arcjet-js/commit/489f1c6b5248197ef170676992a9089a9bc46c6b))


### 🧹 Miscellaneous Chores

* Deprecate Arcjet enum-like objects ([#2684](https://github.com/arcjet/arcjet-js/issues/2684)) ([7d9ac4f](https://github.com/arcjet/arcjet-js/commit/7d9ac4f6401c2e47632c8dc97845f6cd3abf92f9)), closes [#2621](https://github.com/arcjet/arcjet-js/issues/2621)
* **examples:** Add Auth.js chained middleware example using Nosecone ([#2640](https://github.com/arcjet/arcjet-js/issues/2640)) ([d9774cc](https://github.com/arcjet/arcjet-js/commit/d9774cca64065a85965f5914622bb702a5dbc759))
* **examples:** Restrict React to v18 in Next 14 example ([#2778](https://github.com/arcjet/arcjet-js/issues/2778)) ([50cde21](https://github.com/arcjet/arcjet-js/commit/50cde215e7b44c904d2f0d2887130e8e6100fa99))
* **protocol:** Opt out of Buf & ConnectRPC v2 changes ([#2473](https://github.com/arcjet/arcjet-js/issues/2473)) ([06b5b21](https://github.com/arcjet/arcjet-js/commit/06b5b21d10c4a861c5379b4896168284d5c33225))
* refactor wasm loading for analyze ([#1832](https://github.com/arcjet/arcjet-js/issues/1832)) ([02e4435](https://github.com/arcjet/arcjet-js/commit/02e4435a86b6b40b97feb369f0402b2199a4bc12)), closes [#1448](https://github.com/arcjet/arcjet-js/issues/1448)
* **runtime:** Replace Jest with Node test harness ([#2565](https://github.com/arcjet/arcjet-js/issues/2565)) ([ec60fe2](https://github.com/arcjet/arcjet-js/commit/ec60fe2c39519eeb3ffdfd7b89ba0aac544cc478)), closes [#9](https://github.com/arcjet/arcjet-js/issues/9)
* Switch most test harnesses to node:test ([#2479](https://github.com/arcjet/arcjet-js/issues/2479)) ([8a71bbc](https://github.com/arcjet/arcjet-js/commit/8a71bbc3d1fa6b63586f1bae7fa6f0f8d4fbad66))

## [1.0.0-alpha.34](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.33...v1.0.0-alpha.34) (2024-12-03)


### ⚠ BREAKING CHANGES

* **nosecone:** Remove `upgradeInsecureRequests` default value ([#2401](https://github.com/arcjet/arcjet-js/issues/2401))

### 🚀 New Features

* **ip:** Allow trusted proxies to exclude when looking for global IP ([#2393](https://github.com/arcjet/arcjet-js/issues/2393)) ([58286b7](https://github.com/arcjet/arcjet-js/commit/58286b72d456236e85bdd0c975b007e081dcac5a))
* **nosecone-next:** Keep `'self'` script-src in defaults ([#2378](https://github.com/arcjet/arcjet-js/issues/2378)) ([13348c8](https://github.com/arcjet/arcjet-js/commit/13348c8a771a167f970cfa68d6c57f1c6288447b))
* Support trusted proxy configuration on each adapter ([#2394](https://github.com/arcjet/arcjet-js/issues/2394)) ([f9587d8](https://github.com/arcjet/arcjet-js/commit/f9587d8ec6bd0327cb34ac19e52aeecbf6b79cf3)), closes [#2346](https://github.com/arcjet/arcjet-js/issues/2346)


### 🪲 Bug Fixes

* **nosecone:** Remove `upgradeInsecureRequests` default value ([#2401](https://github.com/arcjet/arcjet-js/issues/2401)) ([093dc53](https://github.com/arcjet/arcjet-js/commit/093dc53459c187955781997446df98e5d190fca3))


### 📝 Documentation

* Add nosecone section to root README ([#2404](https://github.com/arcjet/arcjet-js/issues/2404)) ([4674fa4](https://github.com/arcjet/arcjet-js/commit/4674fa41d8ed2bace58ea66bed8a138c4f52a167))


### 🧹 Miscellaneous Chores

* **nosecone:** Add JSDoc comments to NoseconeOptions ([#2380](https://github.com/arcjet/arcjet-js/issues/2380)) ([53ec4eb](https://github.com/arcjet/arcjet-js/commit/53ec4eb96fd742dec7a23cd8abd2722b77c537b8))

## [1.0.0-alpha.33](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.32...v1.0.0-alpha.33) (2024-11-29)


### ⚠ BREAKING CHANGES

* **nosecone-next:** Remove strict-dynamic value in script-src directive ([#2363](https://github.com/arcjet/arcjet-js/issues/2363))
* **nosecone:** Change return value to Headers ([#2362](https://github.com/arcjet/arcjet-js/issues/2362))

### 🚀 New Features

* **nosecone:** Add withVercelToolbar utility function ([#2364](https://github.com/arcjet/arcjet-js/issues/2364)) ([177d16d](https://github.com/arcjet/arcjet-js/commit/177d16db642899213a3d936d671fc197d03f4fa1))
* show isSpoofed() in bot examples ([#2375](https://github.com/arcjet/arcjet-js/issues/2375)) ([d9cab55](https://github.com/arcjet/arcjet-js/commit/d9cab55ecc6d9cbd199aac776f229f384d984ea7))


### 🪲 Bug Fixes

* **nosecone-next:** Remove strict-dynamic value in script-src directive ([#2363](https://github.com/arcjet/arcjet-js/issues/2363)) ([2bd8bff](https://github.com/arcjet/arcjet-js/commit/2bd8bffdc8a1be0634b50aa6123bf74b781e9764))
* **nosecone:** Change return value to Headers ([#2362](https://github.com/arcjet/arcjet-js/issues/2362)) ([ff19af9](https://github.com/arcjet/arcjet-js/commit/ff19af90920b0637d6c628e15aa0f295bb6f2e64))

## [1.0.0-alpha.32](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.31...v1.0.0-alpha.32) (2024-11-26)


### ⚠ BREAKING CHANGES

* Stop publishing TypeScript source files ([#2326](https://github.com/arcjet/arcjet-js/issues/2326))

### 🚀 New Features

* check verification status ([#2229](https://github.com/arcjet/arcjet-js/issues/2229)) ([3329fd7](https://github.com/arcjet/arcjet-js/commit/3329fd7baaafa6784d6f6573905c95fd0686ea4e))


### 🪲 Bug Fixes

* **nosecone-next:** Apply the correct defaults based on env ([#2311](https://github.com/arcjet/arcjet-js/issues/2311)) ([2bfaa79](https://github.com/arcjet/arcjet-js/commit/2bfaa7953d0580b71f69e5d61cb964dcf98873a7))
* Stop publishing TypeScript source files ([#2326](https://github.com/arcjet/arcjet-js/issues/2326)) ([f8f6a2d](https://github.com/arcjet/arcjet-js/commit/f8f6a2d998220d9705ecda8f10d3c5e14b47cad6)), closes [#1836](https://github.com/arcjet/arcjet-js/issues/1836)


### 🧹 Miscellaneous Chores

* Update AI chat example to latest AI SDK v4 ([#2313](https://github.com/arcjet/arcjet-js/issues/2313)) ([a3fd423](https://github.com/arcjet/arcjet-js/commit/a3fd42399e6827ee933ec2d7d5fa0851052b91c5)), closes [#2283](https://github.com/arcjet/arcjet-js/issues/2283)
* Update example for Clerk v6 ([#2312](https://github.com/arcjet/arcjet-js/issues/2312)) ([439c1d5](https://github.com/arcjet/arcjet-js/commit/439c1d52934a9864da5654e97cea49127ebe90b7))

## [1.0.0-alpha.31](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.30...v1.0.0-alpha.31) (2024-11-22)


### 🪲 Bug Fixes

* **nosecone:** Export overridden defaults from adapters ([#2301](https://github.com/arcjet/arcjet-js/issues/2301)) ([e3f4686](https://github.com/arcjet/arcjet-js/commit/e3f46864bcfe46fe3361077309bf0a362ee9c23e))

## [1.0.0-alpha.30](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.29...v1.0.0-alpha.30) (2024-11-20)


### 🪲 Bug Fixes

* **nosecone-next:** Avoid overriding original headers ([#2284](https://github.com/arcjet/arcjet-js/issues/2284)) ([3fcd8b1](https://github.com/arcjet/arcjet-js/commit/3fcd8b1bbc5e1e8175060713c47f580ed2460725))
* **nosecone:** Re-export default configuration from adapters ([#2285](https://github.com/arcjet/arcjet-js/issues/2285)) ([8b19f65](https://github.com/arcjet/arcjet-js/commit/8b19f650f8063aa1073f71eda369926e480c9651))

## [1.0.0-alpha.29](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.28...v1.0.0-alpha.29) (2024-11-19)


### 🚀 New Features

* Create nosecone package for creating secure headers ([#2237](https://github.com/arcjet/arcjet-js/issues/2237)) ([1e8e73b](https://github.com/arcjet/arcjet-js/commit/1e8e73b43e8d93ed5bd6aa9a2f0efcb7cb142378))


### 🪲 Bug Fixes

* **arcjet:** Log error message when fingerprint cannot be built ([#2139](https://github.com/arcjet/arcjet-js/issues/2139)) ([56e5319](https://github.com/arcjet/arcjet-js/commit/56e5319e096f282a99cb008f3086f083dc782992))
* Guard against incorrectly written local rules ([#2191](https://github.com/arcjet/arcjet-js/issues/2191)) ([0885ccf](https://github.com/arcjet/arcjet-js/commit/0885ccfc6d9dedf0d16b7add66ea4be0a43e5432))
* **sveltekit:** Load env from `node:process` ([#2156](https://github.com/arcjet/arcjet-js/issues/2156)) ([346a350](https://github.com/arcjet/arcjet-js/commit/346a3507cc01795c9e4c7246123a62c2a64f0e60)), closes [#2154](https://github.com/arcjet/arcjet-js/issues/2154)


### 🧹 Miscellaneous Chores

* Add initial contributing help ([#2158](https://github.com/arcjet/arcjet-js/issues/2158)) ([d21b81e](https://github.com/arcjet/arcjet-js/commit/d21b81e22a5a14129c49161085fbfea869043a2b)), closes [#1122](https://github.com/arcjet/arcjet-js/issues/1122)
* **arcjet:** Increase test coverage to 100% ([#2157](https://github.com/arcjet/arcjet-js/issues/2157)) ([17f8a9a](https://github.com/arcjet/arcjet-js/commit/17f8a9a43d3a3470d08f17b2529e4d380f2e7ae2)), closes [#1802](https://github.com/arcjet/arcjet-js/issues/1802)
* **example:** Allow swc compilers ([#2280](https://github.com/arcjet/arcjet-js/issues/2280)) ([cb64f4a](https://github.com/arcjet/arcjet-js/commit/cb64f4a63f260ce8e605c9165927ae285ceaf75a))
* **ip:** Update documentation for previous breaking changes ([#2278](https://github.com/arcjet/arcjet-js/issues/2278)) ([cff3cc9](https://github.com/arcjet/arcjet-js/commit/cff3cc935545cf06c6b5eba6227ee48a09bcd825)), closes [#2277](https://github.com/arcjet/arcjet-js/issues/2277)
* **logger:** Remove unused `getTimeLabel` function ([#2140](https://github.com/arcjet/arcjet-js/issues/2140)) ([73d94d5](https://github.com/arcjet/arcjet-js/commit/73d94d5c69148acb81d10ef932f6fec179a8cb6e))
* Regenerate Wasm with updated dependencies ([#2168](https://github.com/arcjet/arcjet-js/issues/2168)) ([90b8350](https://github.com/arcjet/arcjet-js/commit/90b8350160d80f7d55416ae179fdd9ab85f8fdfe))
* Regenerate Wasm with updated dependencies ([#2258](https://github.com/arcjet/arcjet-js/issues/2258)) ([b82284b](https://github.com/arcjet/arcjet-js/commit/b82284bc08e5952656664f7056d2749da9286872))
* Update root readme with all packages and new urls ([#2169](https://github.com/arcjet/arcjet-js/issues/2169)) ([32f0572](https://github.com/arcjet/arcjet-js/commit/32f0572d9b38f4cfac9fbeccdf709bba7b23a9fb))

## [1.0.0-alpha.28](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.27...v1.0.0-alpha.28) (2024-10-23)


### ⚠ BREAKING CHANGES

* **ip:** Accept Request or IncomingMessage directly ([#2018](https://github.com/arcjet/arcjet-js/issues/2018))
* **ip:** Exit early if platform-specific headers are missing IP ([#2021](https://github.com/arcjet/arcjet-js/issues/2021))
* Ensure performance metrics are scoped to same call ([#2019](https://github.com/arcjet/arcjet-js/issues/2019))
* Return ERROR decision when fingerprint cannot be generated ([#1990](https://github.com/arcjet/arcjet-js/issues/1990))
* **protocol:** Remove received_at and decision fields from Report ([#1988](https://github.com/arcjet/arcjet-js/issues/1988))
* **analyze:** improve sensitive info string token accuracy ([#1962](https://github.com/arcjet/arcjet-js/issues/1962))
* Update Wasm with phone-number fix and tokenizer update ([#1854](https://github.com/arcjet/arcjet-js/issues/1854))
* Remove `match` option from rate limit rules ([#1815](https://github.com/arcjet/arcjet-js/issues/1815))

### 🚀 New Features

* Add Remix adapter ([#1866](https://github.com/arcjet/arcjet-js/issues/1866)) ([32d6d41](https://github.com/arcjet/arcjet-js/commit/32d6d41661ec2e5fe08d4300b60086dc007841bc)), closes [#1313](https://github.com/arcjet/arcjet-js/issues/1313)
* **analyze:** improve sensitive info string token accuracy ([#1962](https://github.com/arcjet/arcjet-js/issues/1962)) ([abad1bd](https://github.com/arcjet/arcjet-js/commit/abad1bdbb13c9778d9724e29e97cddfadcf3ab02))
* **ip:** Accept Request or IncomingMessage directly ([#2018](https://github.com/arcjet/arcjet-js/issues/2018)) ([1704da8](https://github.com/arcjet/arcjet-js/commit/1704da87a6791c824cc5ddf6b10a11d5e0786a39)), closes [#1904](https://github.com/arcjet/arcjet-js/issues/1904)
* **ip:** Add Vercel platform-specific IP header detection ([#2022](https://github.com/arcjet/arcjet-js/issues/2022)) ([d886c76](https://github.com/arcjet/arcjet-js/commit/d886c763983b2adcf50223a56f80ba0df2df078a))
* **nextjs:** Support Next.js Server Actions ([#1991](https://github.com/arcjet/arcjet-js/issues/1991)) ([07e68dc](https://github.com/arcjet/arcjet-js/commit/07e68dc2f8d2273b8c114df7a6bc74a5a1249b9f)), closes [#1200](https://github.com/arcjet/arcjet-js/issues/1200)
* Use `waitUntil` for Report call if available ([#1838](https://github.com/arcjet/arcjet-js/issues/1838)) ([2851021](https://github.com/arcjet/arcjet-js/commit/28510216334e2b66fc19a7ee51e741fb59a20607)), closes [#884](https://github.com/arcjet/arcjet-js/issues/884)


### 🪲 Bug Fixes

* **arcjet:** Ensure performance measurements are 1-to-1 and always captured ([#1858](https://github.com/arcjet/arcjet-js/issues/1858)) ([4d29f9a](https://github.com/arcjet/arcjet-js/commit/4d29f9adee96296ca0a4fc7cd3192f68ebc6ad0a))
* Ensure performance metrics are scoped to same call ([#2019](https://github.com/arcjet/arcjet-js/issues/2019)) ([e9f869c](https://github.com/arcjet/arcjet-js/commit/e9f869ca0c287c9dfb23fa3ebe91007822b3390e)), closes [#1865](https://github.com/arcjet/arcjet-js/issues/1865)
* **ip:** Exit early if platform-specific headers are missing IP ([#2021](https://github.com/arcjet/arcjet-js/issues/2021)) ([1a13d9c](https://github.com/arcjet/arcjet-js/commit/1a13d9c9b3a96a4c90a13842b04ca5bf39bf018e))
* **nestjs:** Lookup request from GraphQL context in ArcjetGuard ([#1857](https://github.com/arcjet/arcjet-js/issues/1857)) ([c0b2903](https://github.com/arcjet/arcjet-js/commit/c0b29032a9a4bb5398edb041221d5cc732fc21cb)), closes [#1856](https://github.com/arcjet/arcjet-js/issues/1856)
* Return ERROR decision when fingerprint cannot be generated ([#1990](https://github.com/arcjet/arcjet-js/issues/1990)) ([618a1ee](https://github.com/arcjet/arcjet-js/commit/618a1eef0bd70c827ce1c4911d991bfb55b0deb2)), closes [#1801](https://github.com/arcjet/arcjet-js/issues/1801)
* Update Wasm with phone-number fix and tokenizer update ([#1854](https://github.com/arcjet/arcjet-js/issues/1854)) ([f94f078](https://github.com/arcjet/arcjet-js/commit/f94f07825431dea7690bd82982047e2820971b72))


### 🧹 Miscellaneous Chores

* Add README links for new adapters ([#1831](https://github.com/arcjet/arcjet-js/issues/1831)) ([81885d9](https://github.com/arcjet/arcjet-js/commit/81885d92c1a4cb36d4ffbf4483ae20c1d90b7b6c)), closes [#1813](https://github.com/arcjet/arcjet-js/issues/1813)
* **analyze:** Regenerate Wasm with updated dependencies ([#2067](https://github.com/arcjet/arcjet-js/issues/2067)) ([f96994c](https://github.com/arcjet/arcjet-js/commit/f96994c83fbd40bd40a379c954dae53c11e5d1ae))
* **examples:** Reorganize examples for clarity and decoupling from Next.js version ([#2017](https://github.com/arcjet/arcjet-js/issues/2017)) ([8568bf2](https://github.com/arcjet/arcjet-js/commit/8568bf2f930bcf65c6870c003b7018942268d64a))
* **examples:** Various cleanup ([#2066](https://github.com/arcjet/arcjet-js/issues/2066)) ([c626228](https://github.com/arcjet/arcjet-js/commit/c62622871ab851b33eee4dd6d6fdcfe5af52fa20))
* **protocol:** Remove received_at and decision fields from Report ([#1988](https://github.com/arcjet/arcjet-js/issues/1988)) ([3da543e](https://github.com/arcjet/arcjet-js/commit/3da543e78fa95dc2d001fd54a210115458eb5a60))
* Remove `match` option from rate limit rules ([#1815](https://github.com/arcjet/arcjet-js/issues/1815)) ([853119d](https://github.com/arcjet/arcjet-js/commit/853119d24c37330690c937149a0cf1d0c4d31862)), closes [#1810](https://github.com/arcjet/arcjet-js/issues/1810)

## [1.0.0-alpha.27](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.26...v1.0.0-alpha.27) (2024-10-01)


### ⚠ BREAKING CHANGES

* Add options validation for all rules ([#1785](https://github.com/arcjet/arcjet-js/issues/1785))
* Only produce 1 rule per constructor ([#1783](https://github.com/arcjet/arcjet-js/issues/1783))

### 🚀 New Features

* Add Deno adapter ([#1782](https://github.com/arcjet/arcjet-js/issues/1782)) ([fdfcaf3](https://github.com/arcjet/arcjet-js/commit/fdfcaf3e0242e9b4a6d9db5d93dc601f983bae3c)), closes [#758](https://github.com/arcjet/arcjet-js/issues/758)
* Add NestJS adapter ([#1776](https://github.com/arcjet/arcjet-js/issues/1776)) ([4e52453](https://github.com/arcjet/arcjet-js/commit/4e5245300f2e9958630a948b902472c2e056b3ba)), closes [#781](https://github.com/arcjet/arcjet-js/issues/781)


### 🪲 Bug Fixes

* **protocol:** Ensure relative imports have extensions ([#1722](https://github.com/arcjet/arcjet-js/issues/1722)) ([73928c8](https://github.com/arcjet/arcjet-js/commit/73928c8c77c643577384cb5481a1dff955638388)), closes [#1720](https://github.com/arcjet/arcjet-js/issues/1720)


### 🧹 Miscellaneous Chores

* Add options validation for all rules ([#1785](https://github.com/arcjet/arcjet-js/issues/1785)) ([c3a248e](https://github.com/arcjet/arcjet-js/commit/c3a248ee953a54d5b818942135bebff22a84b307)), closes [#992](https://github.com/arcjet/arcjet-js/issues/992)
* **analyze:** Update well known bots ([#1784](https://github.com/arcjet/arcjet-js/issues/1784)) ([52f1ee3](https://github.com/arcjet/arcjet-js/commit/52f1ee35fde144d152ef2face2546ed79ca35f49))
* Only produce 1 rule per constructor ([#1783](https://github.com/arcjet/arcjet-js/issues/1783)) ([8d79e63](https://github.com/arcjet/arcjet-js/commit/8d79e639be69095c97fb383490817a7eb326458c)), closes [#1397](https://github.com/arcjet/arcjet-js/issues/1397)
* Update WebAssembly modules ([#1721](https://github.com/arcjet/arcjet-js/issues/1721)) ([2dbb9eb](https://github.com/arcjet/arcjet-js/commit/2dbb9eb90755dca6dc99dc0092246304b98889f9))

## [1.0.0-alpha.26](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.25...v1.0.0-alpha.26) (2024-09-16)


### 🚀 New Features

* Implement bot detection categories ([#1618](https://github.com/arcjet/arcjet-js/issues/1618)) ([540cfe8](https://github.com/arcjet/arcjet-js/commit/540cfe8d74b9f029248cfeb6f27e4c7b47fbb9b7))


### 🧹 Miscellaneous Chores

* **ci:** Ignore eslint majors for our nestjs example ([#1638](https://github.com/arcjet/arcjet-js/issues/1638)) ([16be215](https://github.com/arcjet/arcjet-js/commit/16be21596724d4181cfb33055f56aa1dd305fc81))
* **ci:** Increase our dependabot open PR limit ([#1670](https://github.com/arcjet/arcjet-js/issues/1670)) ([5dee404](https://github.com/arcjet/arcjet-js/commit/5dee404ccf29de1caa333ef3f079b8f3c541a1ec))
* **ci:** Sort dependabot projects and add missing nestjs example ([#1617](https://github.com/arcjet/arcjet-js/issues/1617)) ([4c0e77b](https://github.com/arcjet/arcjet-js/commit/4c0e77badb69af195638c087e94a4df8c369ef0e))

## [1.0.0-alpha.25](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.24...v1.0.0-alpha.25) (2024-09-10)


### 🧹 Miscellaneous Chores

* All examples use root level characteristics ([#1543](https://github.com/arcjet/arcjet-js/issues/1543)) ([6b360af](https://github.com/arcjet/arcjet-js/commit/6b360af99fc83fa9e940a9c61777136ff3c3bb95))
* **analyze:** Regenerate WebAssembly with updated bot list ([#1546](https://github.com/arcjet/arcjet-js/issues/1546)) ([0a38e0f](https://github.com/arcjet/arcjet-js/commit/0a38e0f954eb9cfe52289720f3724b0f8f337744)), closes [#1545](https://github.com/arcjet/arcjet-js/issues/1545)
* **analyze:** Update crawler list with Coda Server Fetcher ([#1580](https://github.com/arcjet/arcjet-js/issues/1580)) ([91dd435](https://github.com/arcjet/arcjet-js/commit/91dd435bc5abeafbe7955b6e186668e7af6307a1))
* Update READMEs with latest examples ([#1542](https://github.com/arcjet/arcjet-js/issues/1542)) ([8969486](https://github.com/arcjet/arcjet-js/commit/8969486cc01dac6fc01289672744744913eaab01))

## [1.0.0-alpha.24](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.23...v1.0.0-alpha.24) (2024-09-05)


### ⚠ BREAKING CHANGES

* Rework bot detection rule with allow/deny configuration ([#1437](https://github.com/arcjet/arcjet-js/issues/1437))

### 🚀 New Features

* Rework bot detection rule with allow/deny configuration ([#1437](https://github.com/arcjet/arcjet-js/issues/1437)) ([eef18e3](https://github.com/arcjet/arcjet-js/commit/eef18e3a7c52a849fbc1766439dc28bf0cb2da27))


### 🧹 Miscellaneous Chores

* **examples:** Correct some usage mistakes in sensitive info examples ([#1503](https://github.com/arcjet/arcjet-js/issues/1503)) ([1286280](https://github.com/arcjet/arcjet-js/commit/12862800e790c1ad92f14c9285bfde66588027a6))

## [1.0.0-alpha.23](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.22...v1.0.0-alpha.23) (2024-09-02)


### 🚀 New Features

* add library to perform redaction of sensitive information ([#1358](https://github.com/arcjet/arcjet-js/issues/1358)) ([59d4a0d](https://github.com/arcjet/arcjet-js/commit/59d4a0de86ae8f6b44839566df49bb2cd391e51a))


### 🪲 Bug Fixes

* **analyze:** Ensure headers are serialized correctly ([#1435](https://github.com/arcjet/arcjet-js/issues/1435)) ([0319412](https://github.com/arcjet/arcjet-js/commit/0319412a56e6227f71ab981e23ccdd460a3515cd))
* **arcjet:** Infer types when no detect function is specified ([#1446](https://github.com/arcjet/arcjet-js/issues/1446)) ([8ae0370](https://github.com/arcjet/arcjet-js/commit/8ae03707f6e168c3451542d9ea78f816f0e1fc6a))
* Ensure instantiation throws if WebAssembly is unavailable ([#1458](https://github.com/arcjet/arcjet-js/issues/1458)) ([0edfd45](https://github.com/arcjet/arcjet-js/commit/0edfd457d9f1428d360787e8c78dce3471abdee8))


### 🧹 Miscellaneous Chores

* **deps:** bump webpack and @nestjs/cli in /examples/nodejs-nestjs ([#1456](https://github.com/arcjet/arcjet-js/issues/1456)) ([8d125ac](https://github.com/arcjet/arcjet-js/commit/8d125acfe3b641fc9337693d64c4bcba11a5b334))
* **example:** Remove env package usage ([#1457](https://github.com/arcjet/arcjet-js/issues/1457)) ([f09f3d3](https://github.com/arcjet/arcjet-js/commit/f09f3d3cfc9b74bde91d5f1fbedbcfc1da0a282c))
* remove sideEffects from analyze ([#1444](https://github.com/arcjet/arcjet-js/issues/1444)) ([572aaa0](https://github.com/arcjet/arcjet-js/commit/572aaa067ba8d2e132e608997b15953896474ca9))
* **transport:** Reduce idle timeout for AWS Global Accelerator ([#1479](https://github.com/arcjet/arcjet-js/issues/1479)) ([cd1df38](https://github.com/arcjet/arcjet-js/commit/cd1df385c412266aa78fe14489c680d0b100fecb))

## [1.0.0-alpha.22](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.21...v1.0.0-alpha.22) (2024-08-26)


### ⚠ BREAKING CHANGES

* **tsconfig:** Enable verbatim module syntax ([#1324](https://github.com/arcjet/arcjet-js/issues/1324))

### 🚀 New Features

* add detect sensitive info rule ([#1300](https://github.com/arcjet/arcjet-js/issues/1300)) ([006e344](https://github.com/arcjet/arcjet-js/commit/006e34449a1af0768fe2c265c40161e0ecf90d82))


### 🧹 Miscellaneous Chores

* **tsconfig:** Enable verbatim module syntax ([#1324](https://github.com/arcjet/arcjet-js/issues/1324)) ([7012b54](https://github.com/arcjet/arcjet-js/commit/7012b5473431a84c6025e361a89eca027ebfc93f)), closes [#1314](https://github.com/arcjet/arcjet-js/issues/1314)

## [1.0.0-alpha.21](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.20...v1.0.0-alpha.21) (2024-08-05)


### 🚀 New Features

* Abstract transports into package to leverage conditional exports ([#1221](https://github.com/arcjet/arcjet-js/issues/1221)) ([27776f7](https://github.com/arcjet/arcjet-js/commit/27776f742ef94212ac4164d3feb21b5b5f1681db))
* Attempt to warm http2 connection upon SDK startup ([#1201](https://github.com/arcjet/arcjet-js/issues/1201)) ([a5c2571](https://github.com/arcjet/arcjet-js/commit/a5c25719e1a9dab4658a6a7c736f14b405ecff1e))


### 🧹 Miscellaneous Chores

* **ci:** Change the dependabot commit prefix for Actions PRs ([#1231](https://github.com/arcjet/arcjet-js/issues/1231)) ([4dac6d5](https://github.com/arcjet/arcjet-js/commit/4dac6d5c1f515960b54d215218cdeb5e3030c3f5))
* **ci:** Ignore typescript-eslint 8 until we upgrade to eslint 9 ([#1263](https://github.com/arcjet/arcjet-js/issues/1263)) ([b089de2](https://github.com/arcjet/arcjet-js/commit/b089de280782d927288d1d3685c7dff24f7e47de)), closes [#539](https://github.com/arcjet/arcjet-js/issues/539)
* **ci:** Leverage Dependabot to update our GitHub Actions ([#1222](https://github.com/arcjet/arcjet-js/issues/1222)) ([ffde70a](https://github.com/arcjet/arcjet-js/commit/ffde70a7f7203b5a5ff1772b00065fcfe7a8bcd1))
* **ci:** Switch release-please-action location & update to latest version ([#1229](https://github.com/arcjet/arcjet-js/issues/1229)) ([e44d81d](https://github.com/arcjet/arcjet-js/commit/e44d81d6eff544fcaa9b7e579ae1d37b40073f5b))
* **deps:** bump actions/checkout from 3 to 4 ([#1226](https://github.com/arcjet/arcjet-js/issues/1226)) ([7d5242c](https://github.com/arcjet/arcjet-js/commit/7d5242c318f29de3c483b86756db6582317bfe1a))
* **deps:** bump step-security/harden-runner from 2.7.0 to 2.9.0 ([#1225](https://github.com/arcjet/arcjet-js/issues/1225)) ([76755e1](https://github.com/arcjet/arcjet-js/commit/76755e163a5b13f2678c2bd0cfc50d1627f7bc02))
* **examples:** Ensure bun examples have updated dependencies ([#1213](https://github.com/arcjet/arcjet-js/issues/1213)) ([e766029](https://github.com/arcjet/arcjet-js/commit/e766029fe5e5b1e0e55b53f0733b81c1287647fc))
* Remove Dependencies section from release notes ([#1211](https://github.com/arcjet/arcjet-js/issues/1211)) ([1708f6a](https://github.com/arcjet/arcjet-js/commit/1708f6a259a5220a0e7c54aa31d9d9362336e05d))

## [1.0.0-alpha.20](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.19...v1.0.0-alpha.20) (2024-07-24)


### 🪲 Bug Fixes

* **analyze:** Ensure locally-unknown email information doesn't deny ([#1176](https://github.com/arcjet/arcjet-js/issues/1176)) ([c4ca3f8](https://github.com/arcjet/arcjet-js/commit/c4ca3f8c986f87f16fad016e9f204ab817df9ab3)), closes [#1175](https://github.com/arcjet/arcjet-js/issues/1175)


### 📦 Dependencies

* bump @typescript-eslint/eslint-plugin from 7.16.1 to 7.17.0 ([#1164](https://github.com/arcjet/arcjet-js/issues/1164)) ([06344e7](https://github.com/arcjet/arcjet-js/commit/06344e78111a3de8a1f22afd899ced9cd4e702e1))
* bump @typescript-eslint/parser from 7.16.1 to 7.17.0 ([#1165](https://github.com/arcjet/arcjet-js/issues/1165)) ([40adc5b](https://github.com/arcjet/arcjet-js/commit/40adc5bd6490d18a2f801f1c9b8663c2eb1bda2a))
* bump eslint-config-turbo from 2.0.6 to 2.0.9 ([#1159](https://github.com/arcjet/arcjet-js/issues/1159)) ([1e7a59f](https://github.com/arcjet/arcjet-js/commit/1e7a59f52d756d44e0637ca6b904aff12c5ac016))
* **dev:** bump @rollup/wasm-node from 4.18.1 to 4.19.0 ([#1160](https://github.com/arcjet/arcjet-js/issues/1160)) ([7062ca0](https://github.com/arcjet/arcjet-js/commit/7062ca00012dd73b2e80f0679609be6e45ec5f5d))
* **dev:** bump typescript from 5.5.3 to 5.5.4 ([#1166](https://github.com/arcjet/arcjet-js/issues/1166)) ([644e3a6](https://github.com/arcjet/arcjet-js/commit/644e3a6e69d092626fdf4f356aaa8e8f974ae46b))
* **example:** bump @clerk/nextjs from 5.2.5 to 5.2.6 in /examples/nextjs-14-permit in the dependencies group ([#1173](https://github.com/arcjet/arcjet-js/issues/1173)) ([2dd29a7](https://github.com/arcjet/arcjet-js/commit/2dd29a75b0f9959f06eeffdb8dc54d513ab0040a))
* **example:** bump hono from 4.4.13 to 4.5.1 in /examples/nodejs-hono-rl in the dependencies group across 1 directory ([#1158](https://github.com/arcjet/arcjet-js/issues/1158)) ([797d8b8](https://github.com/arcjet/arcjet-js/commit/797d8b833f9e1012259680ebd36168effb98253d))
* **example:** bump postcss from 8.4.39 to 8.4.40 in /examples/nextjs-14-app-dir-validate-email in the dependencies group ([#1177](https://github.com/arcjet/arcjet-js/issues/1177)) ([926f84e](https://github.com/arcjet/arcjet-js/commit/926f84eb45350a8be3d34f5914728e05afe25b43))
* **example:** bump postcss from 8.4.39 to 8.4.40 in /examples/nextjs-14-clerk-rl in the dependencies group across 1 directory ([#1180](https://github.com/arcjet/arcjet-js/issues/1180)) ([47b6e7d](https://github.com/arcjet/arcjet-js/commit/47b6e7d7bd50af742034d94e4c12d83531049b19))
* **example:** bump tailwindcss from 3.4.4 to 3.4.6 in /examples/nextjs-14-app-dir-validate-email in the dependencies group across 1 directory ([#1139](https://github.com/arcjet/arcjet-js/issues/1139)) ([ee1938b](https://github.com/arcjet/arcjet-js/commit/ee1938b7dff95bd742b8d0ead0f67b45b54eb244))
* **example:** bump tailwindcss from 3.4.5 to 3.4.6 in /examples/nextjs-14-app-dir-rl in the dependencies group ([#1152](https://github.com/arcjet/arcjet-js/issues/1152)) ([282448a](https://github.com/arcjet/arcjet-js/commit/282448a7d5c68bdc8b5f8314409d7536fe741b3b))
* **example:** bump tailwindcss from 3.4.5 to 3.4.6 in /examples/nextjs-14-decorate in the dependencies group ([#1148](https://github.com/arcjet/arcjet-js/issues/1148)) ([1149de9](https://github.com/arcjet/arcjet-js/commit/1149de94c0f39b0b288fb2611631295aad117d98))
* **example:** bump tailwindcss from 3.4.5 to 3.4.6 in /examples/nextjs-14-ip-details in the dependencies group ([#1147](https://github.com/arcjet/arcjet-js/issues/1147)) ([c77aa6b](https://github.com/arcjet/arcjet-js/commit/c77aa6bdaf0aca3187aae1b0666b4eaea7be1d1d))
* **example:** bump tailwindcss from 3.4.5 to 3.4.6 in /examples/nextjs-14-nextauth-4 in the dependencies group ([#1145](https://github.com/arcjet/arcjet-js/issues/1145)) ([a97525b](https://github.com/arcjet/arcjet-js/commit/a97525b6104381c540935f4bab83beba0d676fea))
* **example:** bump tailwindcss from 3.4.5 to 3.4.6 in /examples/nextjs-14-pages-wrap in the dependencies group ([#1151](https://github.com/arcjet/arcjet-js/issues/1151)) ([d9291c6](https://github.com/arcjet/arcjet-js/commit/d9291c658d7b1ce9e9636379b94c501cfa4c2bba))
* **example:** bump the dependencies group across 1 directory with 2 updates ([#1171](https://github.com/arcjet/arcjet-js/issues/1171)) ([e2bfd35](https://github.com/arcjet/arcjet-js/commit/e2bfd35913571ffe3a1f9aa80c53d7edad46ca8e))
* **example:** bump the dependencies group across 1 directory with 2 updates ([#1179](https://github.com/arcjet/arcjet-js/issues/1179)) ([1240621](https://github.com/arcjet/arcjet-js/commit/1240621c516ce8d55fd1d8c069ad2a38af2a1869))
* **example:** bump the dependencies group across 1 directory with 3 updates ([#1163](https://github.com/arcjet/arcjet-js/issues/1163)) ([213a7c8](https://github.com/arcjet/arcjet-js/commit/213a7c8e2675e7419682f3e43a1d89418aa13b5f))
* **example:** bump the dependencies group across 1 directory with 3 updates ([#1178](https://github.com/arcjet/arcjet-js/issues/1178)) ([9bc5f1e](https://github.com/arcjet/arcjet-js/commit/9bc5f1e3a654a2106e6ad4a398a9bd74a40de1c7))
* **example:** bump the dependencies group across 1 directory with 3 updates ([#1181](https://github.com/arcjet/arcjet-js/issues/1181)) ([f01ec2c](https://github.com/arcjet/arcjet-js/commit/f01ec2c72cdc772534bd163fcfc41c47b12798e7))
* **example:** bump the dependencies group across 1 directory with 5 updates ([#1167](https://github.com/arcjet/arcjet-js/issues/1167)) ([f3c8ca7](https://github.com/arcjet/arcjet-js/commit/f3c8ca770c17b1b70be3b7a42ee318b073cf5e0b))
* **example:** bump the dependencies group across 1 directory with 6 updates ([#1169](https://github.com/arcjet/arcjet-js/issues/1169)) ([a02a74c](https://github.com/arcjet/arcjet-js/commit/a02a74c127cd4745191d9cc1252c072fe3425642))


### 🧹 Miscellaneous Chores

* **examples:** Add Next.js app with Permit.io for dynamic Arcjet rules ([#1067](https://github.com/arcjet/arcjet-js/issues/1067)) ([6939878](https://github.com/arcjet/arcjet-js/commit/6939878dfb01b2cd0a624a3f2c398413abd496d1))

## [1.0.0-alpha.19](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.18...v1.0.0-alpha.19) (2024-07-15)


### 🚀 New Features

* detect common free/disposable email providers locally ([#1096](https://github.com/arcjet/arcjet-js/issues/1096)) ([115d016](https://github.com/arcjet/arcjet-js/commit/115d01662d4ff456cf4d81825338ef1099626fdf)), closes [#1095](https://github.com/arcjet/arcjet-js/issues/1095)


### 📦 Dependencies

* Bump @typescript-eslint/eslint-plugin from 7.14.1 to 7.15.0 ([#1063](https://github.com/arcjet/arcjet-js/issues/1063)) ([d4a1cfe](https://github.com/arcjet/arcjet-js/commit/d4a1cfedd1fe144560589d05d05a26e8eb724870))
* Bump @typescript-eslint/eslint-plugin from 7.15.0 to 7.16.0 ([#1091](https://github.com/arcjet/arcjet-js/issues/1091)) ([6bbcbe6](https://github.com/arcjet/arcjet-js/commit/6bbcbe6531e6f0e9f70cacebe252ed7845e75e6a))
* bump @typescript-eslint/eslint-plugin from 7.16.0 to 7.16.1 ([#1135](https://github.com/arcjet/arcjet-js/issues/1135)) ([6f4495a](https://github.com/arcjet/arcjet-js/commit/6f4495a94c0a6ba867dec550077600ace581ad1c))
* Bump @typescript-eslint/parser from 7.14.1 to 7.15.0 ([#1064](https://github.com/arcjet/arcjet-js/issues/1064)) ([b6e2b0f](https://github.com/arcjet/arcjet-js/commit/b6e2b0f4d076d3fa1f61b883e886bfd741353920))
* Bump @typescript-eslint/parser from 7.15.0 to 7.16.0 ([#1090](https://github.com/arcjet/arcjet-js/issues/1090)) ([c31957f](https://github.com/arcjet/arcjet-js/commit/c31957fbcd0c2e30ebea6d23d3d69cd5d2afa7d2))
* bump @typescript-eslint/parser from 7.16.0 to 7.16.1 ([#1132](https://github.com/arcjet/arcjet-js/issues/1132)) ([3feb40a](https://github.com/arcjet/arcjet-js/commit/3feb40a01f1274ee311909fcc0a6d0c0c138a7a5))
* Bump typeid-js from 0.7.0 to 1.0.0 ([#1079](https://github.com/arcjet/arcjet-js/issues/1079)) ([fa276c5](https://github.com/arcjet/arcjet-js/commit/fa276c508f9881287f519a3e9d0513ec6b4558f1))
* **dev:** Bump @edge-runtime/jest-environment from 2.3.10 to 3.0.0 ([#1087](https://github.com/arcjet/arcjet-js/issues/1087)) ([1e6eb00](https://github.com/arcjet/arcjet-js/commit/1e6eb004ecb052f82d1a72772c0a1c99a8002965))
* **dev:** bump @edge-runtime/jest-environment from 3.0.0 to 3.0.1 ([#1123](https://github.com/arcjet/arcjet-js/issues/1123)) ([9064240](https://github.com/arcjet/arcjet-js/commit/90642400a22a13ca21bbe28380bc2beaad06c235))
* **dev:** Bump @rollup/wasm-node from 4.18.0 to 4.18.1 ([#1092](https://github.com/arcjet/arcjet-js/issues/1092)) ([ffc298a](https://github.com/arcjet/arcjet-js/commit/ffc298ad030721519af02c6c2da26fd2bd3fbdbd))
* **dev:** Bump bun-types from 1.1.17 to 1.1.18 ([#1080](https://github.com/arcjet/arcjet-js/issues/1080)) ([6bb3483](https://github.com/arcjet/arcjet-js/commit/6bb34832c80ec0ef1403e6836de693a1ff91973b))
* **dev:** bump bun-types from 1.1.18 to 1.1.20 ([#1118](https://github.com/arcjet/arcjet-js/issues/1118)) ([dbf3826](https://github.com/arcjet/arcjet-js/commit/dbf3826f68af03d5ae06c0302b1894e4facec9d6))
* **dev:** Bump typescript from 5.5.2 to 5.5.3 ([#1065](https://github.com/arcjet/arcjet-js/issues/1065)) ([ef05395](https://github.com/arcjet/arcjet-js/commit/ef053953cf4a6cba621b778cba2e0dd4e114b626))
* **example:** Bump @clerk/nextjs from 5.1.6 to 5.2.2 in /examples/nextjs-14-clerk-rl in the dependencies group across 1 directory ([#1082](https://github.com/arcjet/arcjet-js/issues/1082)) ([7ac1236](https://github.com/arcjet/arcjet-js/commit/7ac12360e4e3a586ec101de6cd378bcbbc029b2b))
* **example:** Bump @clerk/nextjs from 5.1.6 to 5.2.2 in /examples/nextjs-14-clerk-shield in the dependencies group across 1 directory ([#1081](https://github.com/arcjet/arcjet-js/issues/1081)) ([9b89f9b](https://github.com/arcjet/arcjet-js/commit/9b89f9bb120dcaded3bb41f72523f5be9e8eb5e4))
* **example:** bump @clerk/nextjs from 5.2.2 to 5.2.3 in /examples/nextjs-14-clerk-rl in the dependencies group ([#1119](https://github.com/arcjet/arcjet-js/issues/1119)) ([5fe9ef0](https://github.com/arcjet/arcjet-js/commit/5fe9ef0a1ed23e989cf002a5f2e3aa2212e4b91b))
* **example:** bump @clerk/nextjs from 5.2.2 to 5.2.3 in /examples/nextjs-14-clerk-shield in the dependencies group ([#1121](https://github.com/arcjet/arcjet-js/issues/1121)) ([baf55e0](https://github.com/arcjet/arcjet-js/commit/baf55e09b9743c70e006041c145c2e62d9d112c7))
* **example:** Bump hono from 4.4.11 to 4.4.12 in /examples/nodejs-hono-rl in the dependencies group ([#1085](https://github.com/arcjet/arcjet-js/issues/1085)) ([3782001](https://github.com/arcjet/arcjet-js/commit/378200141ce9c664b6c60119b4f355f61ba1ba9a))
* **example:** Bump hono from 4.4.12 to 4.4.13 in /examples/nodejs-hono-rl in the dependencies group ([#1112](https://github.com/arcjet/arcjet-js/issues/1112)) ([49f8721](https://github.com/arcjet/arcjet-js/commit/49f87210d539081edff038769fdfc371a4b40189))
* **example:** Bump lucide-react from 0.399.0 to 0.400.0 in /examples/nextjs-14-authjs-5 in the dependencies group ([#1066](https://github.com/arcjet/arcjet-js/issues/1066)) ([b44dd6a](https://github.com/arcjet/arcjet-js/commit/b44dd6a3ec5ded8665f1b3d4132cc98ded10cb6d))
* **example:** bump lucide-react from 0.407.0 to 0.408.0 in /examples/nextjs-14-authjs-5 in the dependencies group ([#1116](https://github.com/arcjet/arcjet-js/issues/1116)) ([84bd181](https://github.com/arcjet/arcjet-js/commit/84bd1810c23646860c5fe01a55d778daeddafc99))
* **example:** bump tailwindcss from 3.4.4 to 3.4.5 in /examples/nextjs-14-app-dir-rl in the dependencies group ([#1124](https://github.com/arcjet/arcjet-js/issues/1124)) ([c73e955](https://github.com/arcjet/arcjet-js/commit/c73e9553edc61da6a41ea8f63942ab85f2c74217))
* **example:** bump tailwindcss from 3.4.4 to 3.4.5 in /examples/nextjs-14-authjs-5 in the dependencies group ([#1129](https://github.com/arcjet/arcjet-js/issues/1129)) ([74adca7](https://github.com/arcjet/arcjet-js/commit/74adca7ad833c03117a45bc79e940035eba6ca58))
* **example:** bump tailwindcss from 3.4.4 to 3.4.5 in /examples/nextjs-14-clerk-rl in the dependencies group ([#1125](https://github.com/arcjet/arcjet-js/issues/1125)) ([8aa2f53](https://github.com/arcjet/arcjet-js/commit/8aa2f53be8d8d64f05f781cb0b1c047d0ab73f01))
* **example:** bump tailwindcss from 3.4.4 to 3.4.5 in /examples/nextjs-14-clerk-shield in the dependencies group ([#1130](https://github.com/arcjet/arcjet-js/issues/1130)) ([6f76186](https://github.com/arcjet/arcjet-js/commit/6f761867cfcfd6594791530a97b0d08654fcb8e4))
* **example:** bump tailwindcss from 3.4.4 to 3.4.5 in /examples/nextjs-14-decorate in the dependencies group ([#1126](https://github.com/arcjet/arcjet-js/issues/1126)) ([b2d9a81](https://github.com/arcjet/arcjet-js/commit/b2d9a81d4d30cc85929a778c193e88552867cf8f))
* **example:** bump tailwindcss from 3.4.4 to 3.4.5 in /examples/nextjs-14-ip-details in the dependencies group ([#1127](https://github.com/arcjet/arcjet-js/issues/1127)) ([0251e74](https://github.com/arcjet/arcjet-js/commit/0251e74685fbe57370563fab25c97d3e8897c918))
* **example:** bump tailwindcss from 3.4.4 to 3.4.5 in /examples/nextjs-14-nextauth-4 in the dependencies group ([#1128](https://github.com/arcjet/arcjet-js/issues/1128)) ([b7f0028](https://github.com/arcjet/arcjet-js/commit/b7f0028b97fb856c1a35f902ed15500cbd397532))
* **example:** bump tailwindcss from 3.4.4 to 3.4.5 in /examples/nextjs-14-pages-wrap in the dependencies group ([#1131](https://github.com/arcjet/arcjet-js/issues/1131)) ([af3f8d6](https://github.com/arcjet/arcjet-js/commit/af3f8d66b16e3f3c89fe3505a38fe046a2dcef57))
* **example:** Bump the dependencies group across 1 directory with 2 updates ([#1068](https://github.com/arcjet/arcjet-js/issues/1068)) ([bc86928](https://github.com/arcjet/arcjet-js/commit/bc86928a0a3a3771ceb19e3539323316cd5e08b3))
* **example:** Bump the dependencies group across 1 directory with 2 updates ([#1071](https://github.com/arcjet/arcjet-js/issues/1071)) ([75df78a](https://github.com/arcjet/arcjet-js/commit/75df78a3df1b6cd350ef37faacc270745f03d18d))
* **example:** bump the dependencies group across 1 directory with 2 updates ([#1117](https://github.com/arcjet/arcjet-js/issues/1117)) ([306d4f1](https://github.com/arcjet/arcjet-js/commit/306d4f1bd9f146c4c3bdcf06666517bcd4284c25))
* **example:** Bump the dependencies group across 1 directory with 3 updates ([#1072](https://github.com/arcjet/arcjet-js/issues/1072)) ([937b184](https://github.com/arcjet/arcjet-js/commit/937b184a87a30c5133e71095d4207c01817f3b18))
* **example:** Bump the dependencies group across 1 directory with 3 updates ([#1108](https://github.com/arcjet/arcjet-js/issues/1108)) ([3714941](https://github.com/arcjet/arcjet-js/commit/37149419968667402c809927cbb9bba36deafc96))
* **example:** Bump the dependencies group across 1 directory with 4 updates ([#1106](https://github.com/arcjet/arcjet-js/issues/1106)) ([caaea7a](https://github.com/arcjet/arcjet-js/commit/caaea7a16da8f7e4994745c9872504785bd47235))
* **example:** Bump the dependencies group across 1 directory with 6 updates ([#1109](https://github.com/arcjet/arcjet-js/issues/1109)) ([c877b39](https://github.com/arcjet/arcjet-js/commit/c877b3976f477bb6b162a89882ab8308bae8c795))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-rl with 2 updates ([#1104](https://github.com/arcjet/arcjet-js/issues/1104)) ([8cbde05](https://github.com/arcjet/arcjet-js/commit/8cbde05f930220a5439f4c65a0fe3664bb5f0ade))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-validate-email with 2 updates ([#1107](https://github.com/arcjet/arcjet-js/issues/1107)) ([298a70b](https://github.com/arcjet/arcjet-js/commit/298a70b387bab0628551b215fac7424edb60e560))
* **example:** Bump the dependencies group in /examples/nextjs-14-clerk-rl with 2 updates ([#1102](https://github.com/arcjet/arcjet-js/issues/1102)) ([f1e7a4c](https://github.com/arcjet/arcjet-js/commit/f1e7a4ccfe6e58e35696ff0ac458f7de11d282d1))
* **example:** Bump the dependencies group in /examples/nextjs-14-clerk-shield with 2 updates ([#1101](https://github.com/arcjet/arcjet-js/issues/1101)) ([10184f9](https://github.com/arcjet/arcjet-js/commit/10184f991fb84cd2b346899898572d22d020cdaf))
* **example:** Bump the dependencies group in /examples/nextjs-14-decorate with 2 updates ([#1111](https://github.com/arcjet/arcjet-js/issues/1111)) ([52394af](https://github.com/arcjet/arcjet-js/commit/52394aff747f9a1d0210da2faf8cb12ba0460a7c))
* **example:** Bump the dependencies group in /examples/nextjs-14-ip-details with 2 updates ([#1105](https://github.com/arcjet/arcjet-js/issues/1105)) ([5127321](https://github.com/arcjet/arcjet-js/commit/5127321429a15d52d8592672a7c219bb6e3ae270))
* **example:** Bump the dependencies group in /examples/nextjs-14-nextauth-4 with 2 updates ([#1103](https://github.com/arcjet/arcjet-js/issues/1103)) ([8ef993f](https://github.com/arcjet/arcjet-js/commit/8ef993fab5da47046d64547e1fd1308b6457f354))
* **example:** Bump the dependencies group in /examples/nextjs-14-openai with 2 updates ([#1113](https://github.com/arcjet/arcjet-js/issues/1113)) ([89b3ccb](https://github.com/arcjet/arcjet-js/commit/89b3ccbefaf785ce7d32a11807128a7b86f9539b))
* **example:** bump the dependencies group in /examples/nextjs-14-openai with 2 updates ([#1133](https://github.com/arcjet/arcjet-js/issues/1133)) ([d2ac694](https://github.com/arcjet/arcjet-js/commit/d2ac694c537cdc4971612eb225034a83308ccc08))
* **example:** Bump the dependencies group in /examples/nextjs-14-pages-wrap with 2 updates ([#1110](https://github.com/arcjet/arcjet-js/issues/1110)) ([fb05224](https://github.com/arcjet/arcjet-js/commit/fb052242fa45949fa897b6be353a3cbf67a69d5b))
* **example:** bump the dependencies group in /examples/nextjs-14-react-hook-form with 2 updates ([#1120](https://github.com/arcjet/arcjet-js/issues/1120)) ([729c886](https://github.com/arcjet/arcjet-js/commit/729c88670529fb20da135261f817e34ca1d2eae1))
* **example:** bump the dependencies group in /examples/nextjs-14-react-hook-form with 2 updates ([#1134](https://github.com/arcjet/arcjet-js/issues/1134)) ([2fbe4d6](https://github.com/arcjet/arcjet-js/commit/2fbe4d6c239182c0c12f99f6b9d88184e65826d2))
* **example:** Bump the dependencies group in /examples/sveltekit with 2 updates ([#1093](https://github.com/arcjet/arcjet-js/issues/1093)) ([009591a](https://github.com/arcjet/arcjet-js/commit/009591ac7a5159f161f6cbfbece1fd7ea8c81f69))
* **example:** bump the dependencies group in /examples/sveltekit with 2 updates ([#1136](https://github.com/arcjet/arcjet-js/issues/1136)) ([c93a9eb](https://github.com/arcjet/arcjet-js/commit/c93a9ebeb0f08f5b27fe56305bb8cd24afb072e3))


### 🧹 Miscellaneous Chores

* **examples:** Add example of testing APIs with Newman ([#1083](https://github.com/arcjet/arcjet-js/issues/1083)) ([6b2ccf0](https://github.com/arcjet/arcjet-js/commit/6b2ccf09775fc1222ac5ed0830c63ec266f96f87))
* **examples:** Show dynamic feature flags with LaunchDarkly ([#1100](https://github.com/arcjet/arcjet-js/issues/1100)) ([d3bf356](https://github.com/arcjet/arcjet-js/commit/d3bf35640bc09eac581092b1df7f3dbf48148305))

## [1.0.0-alpha.18](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.17...v1.0.0-alpha.18) (2024-07-01)


### ⚠ BREAKING CHANGES

* Move generated protobuf to default buf file path ([#1009](https://github.com/arcjet/arcjet-js/issues/1009))

### 🚀 New Features

* Allow characteristics to be specified on the SDK for fingerprint generation & propagate to rate limit rule ([#1016](https://github.com/arcjet/arcjet-js/issues/1016)) ([6b692da](https://github.com/arcjet/arcjet-js/commit/6b692da8e6da506a977ec5617a223b6512035a19)), closes [#1015](https://github.com/arcjet/arcjet-js/issues/1015)


### 🪲 Bug Fixes

* **env:** Always rely on isDevelopment & remove isProduction helper ([#998](https://github.com/arcjet/arcjet-js/issues/998)) ([43423c6](https://github.com/arcjet/arcjet-js/commit/43423c650cb5b6f2e992af961faad52a4fcdd24f))
* **sdk:** Inform type signature of protect via global characteristics ([#1043](https://github.com/arcjet/arcjet-js/issues/1043)) ([1ae4a89](https://github.com/arcjet/arcjet-js/commit/1ae4a89637c02dffd7801becdf519ce4f911dc6d)), closes [#1042](https://github.com/arcjet/arcjet-js/issues/1042)


### 📦 Dependencies

* Bump @typescript-eslint/eslint-plugin from 7.13.0 to 7.13.1 ([#994](https://github.com/arcjet/arcjet-js/issues/994)) ([9481c7f](https://github.com/arcjet/arcjet-js/commit/9481c7f599a725875a9f84693933238ae168611c))
* Bump @typescript-eslint/eslint-plugin from 7.13.1 to 7.14.1 ([#1025](https://github.com/arcjet/arcjet-js/issues/1025)) ([7e8cc60](https://github.com/arcjet/arcjet-js/commit/7e8cc6020e3cb384fca039f68efccc019ba5b0d3))
* Bump @typescript-eslint/parser from 7.13.0 to 7.13.1 ([#993](https://github.com/arcjet/arcjet-js/issues/993)) ([d15a09d](https://github.com/arcjet/arcjet-js/commit/d15a09d9d4661e2227a8b80dd22b05cae3c66f85))
* Bump @typescript-eslint/parser from 7.13.1 to 7.14.1 ([#1024](https://github.com/arcjet/arcjet-js/issues/1024)) ([ee81b09](https://github.com/arcjet/arcjet-js/commit/ee81b0905901cf390bbccb8995c99812d7711336))
* Bump eslint-config-turbo from 2.0.4 to 2.0.5 ([#1023](https://github.com/arcjet/arcjet-js/issues/1023)) ([aaaf17c](https://github.com/arcjet/arcjet-js/commit/aaaf17c421f560cb7da83ae9187091e67795c168))
* Bump eslint-config-turbo from 2.0.5 to 2.0.6 ([#1052](https://github.com/arcjet/arcjet-js/issues/1052)) ([e1d3cd3](https://github.com/arcjet/arcjet-js/commit/e1d3cd347226a9403e4b7f37256aa5467e716e51))
* **dev:** Bump bun-types from 1.1.13 to 1.1.17 ([#1022](https://github.com/arcjet/arcjet-js/issues/1022)) ([3aa7181](https://github.com/arcjet/arcjet-js/commit/3aa718110537a5c26a267b4db2b57c5b50af6bf2))
* **dev:** Bump typescript from 5.4.5 to 5.5.2 ([#1011](https://github.com/arcjet/arcjet-js/issues/1011)) ([c17a101](https://github.com/arcjet/arcjet-js/commit/c17a101c5729db44ddf8a7e14d5e4184dcf38949))
* **example:** Bump @clerk/nextjs from 5.1.5 to 5.1.6 in /examples/nextjs-14-clerk-rl in the dependencies group ([#1013](https://github.com/arcjet/arcjet-js/issues/1013)) ([8bed1dc](https://github.com/arcjet/arcjet-js/commit/8bed1dcd321093ad9f60742b28a6982bb3b42fc7))
* **example:** Bump @clerk/nextjs from 5.1.5 to 5.1.6 in /examples/nextjs-14-clerk-shield in the dependencies group ([#1012](https://github.com/arcjet/arcjet-js/issues/1012)) ([c4bcde8](https://github.com/arcjet/arcjet-js/commit/c4bcde837dc2d333eaa23ef89539ce4b80a806be))
* **example:** Bump @sveltejs/kit from 2.5.17 to 2.5.18 in /examples/sveltekit in the dependencies group ([#1046](https://github.com/arcjet/arcjet-js/issues/1046)) ([ebab7de](https://github.com/arcjet/arcjet-js/commit/ebab7de82a481616e33308726d9dfaed5a729cab))
* **example:** Bump ai from 3.1.36 to 3.1.37 in /examples/nextjs-14-openai in the dependencies group ([#995](https://github.com/arcjet/arcjet-js/issues/995)) ([b43827b](https://github.com/arcjet/arcjet-js/commit/b43827bb3a2fef6396e7c89ae019bdef0325a502))
* **example:** Bump hono from 4.4.9 to 4.4.10 in /examples/nodejs-hono-rl in the dependencies group ([#1048](https://github.com/arcjet/arcjet-js/issues/1048)) ([6e7c1fe](https://github.com/arcjet/arcjet-js/commit/6e7c1fe0e56b51d726614e8954a404c779884813))
* **example:** Bump lucide-react from 0.396.0 to 0.399.0 in /examples/nextjs-14-authjs-5 in the dependencies group across 1 directory ([#1040](https://github.com/arcjet/arcjet-js/issues/1040)) ([ea96487](https://github.com/arcjet/arcjet-js/commit/ea964878f7ec1ef3de586b45a7d1982ac52f39de))
* **example:** Bump lucide-react from 0.396.0 to 0.399.0 in /examples/nextjs-14-react-hook-form in the dependencies group across 1 directory ([#1039](https://github.com/arcjet/arcjet-js/issues/1039)) ([334ff9e](https://github.com/arcjet/arcjet-js/commit/334ff9ef520aa8723b1922a576d85be1a04c861a))
* **example:** Bump postcss from 8.4.38 to 8.4.39 in /examples/nextjs-14-app-dir-rl in the dependencies group ([#1051](https://github.com/arcjet/arcjet-js/issues/1051)) ([ac24a0b](https://github.com/arcjet/arcjet-js/commit/ac24a0b0d6c9ef5fde71766d8c0c37b084e0114e))
* **example:** Bump postcss from 8.4.38 to 8.4.39 in /examples/nextjs-14-app-dir-validate-email in the dependencies group ([#1045](https://github.com/arcjet/arcjet-js/issues/1045)) ([290bc49](https://github.com/arcjet/arcjet-js/commit/290bc49b2ac7744dbb039ae91d6fc6ee5fd21420))
* **example:** Bump postcss from 8.4.38 to 8.4.39 in /examples/nextjs-14-authjs-5 in the dependencies group ([#1056](https://github.com/arcjet/arcjet-js/issues/1056)) ([e2343f0](https://github.com/arcjet/arcjet-js/commit/e2343f012a8e1bc4962f6dd10d67f3c405276baa))
* **example:** Bump postcss from 8.4.38 to 8.4.39 in /examples/nextjs-14-clerk-rl in the dependencies group ([#1058](https://github.com/arcjet/arcjet-js/issues/1058)) ([422b320](https://github.com/arcjet/arcjet-js/commit/422b3204890059cbf125f9044b81c1a3e83d0844))
* **example:** Bump postcss from 8.4.38 to 8.4.39 in /examples/nextjs-14-clerk-shield in the dependencies group ([#1044](https://github.com/arcjet/arcjet-js/issues/1044)) ([b6b891f](https://github.com/arcjet/arcjet-js/commit/b6b891fc06b308e0336ef5289390b7f5e41515d9))
* **example:** Bump postcss from 8.4.38 to 8.4.39 in /examples/nextjs-14-decorate in the dependencies group ([#1049](https://github.com/arcjet/arcjet-js/issues/1049)) ([43523a5](https://github.com/arcjet/arcjet-js/commit/43523a502f5ba7783c3239f648954ce62d6ca129))
* **example:** Bump postcss from 8.4.38 to 8.4.39 in /examples/nextjs-14-ip-details in the dependencies group ([#1047](https://github.com/arcjet/arcjet-js/issues/1047)) ([1fe6a05](https://github.com/arcjet/arcjet-js/commit/1fe6a05d7b25b18c89e4857066dab21d605a5976))
* **example:** Bump postcss from 8.4.38 to 8.4.39 in /examples/nextjs-14-nextauth-4 in the dependencies group ([#1054](https://github.com/arcjet/arcjet-js/issues/1054)) ([caff3dc](https://github.com/arcjet/arcjet-js/commit/caff3dc68924d93d359e1ff501dd681aa438b4fa))
* **example:** Bump postcss from 8.4.38 to 8.4.39 in /examples/nextjs-14-pages-wrap in the dependencies group ([#1055](https://github.com/arcjet/arcjet-js/issues/1055)) ([90e04f5](https://github.com/arcjet/arcjet-js/commit/90e04f521cec56ee9d35c81c3b250433c35a642b))
* **example:** Bump postcss from 8.4.38 to 8.4.39 in /examples/nextjs-14-react-hook-form in the dependencies group ([#1050](https://github.com/arcjet/arcjet-js/issues/1050)) ([21e1108](https://github.com/arcjet/arcjet-js/commit/21e1108cb0fe709dbdc3e8c118a665872d83f103))
* **example:** Bump the dependencies group across 1 directory with 2 updates ([#1006](https://github.com/arcjet/arcjet-js/issues/1006)) ([0578cb2](https://github.com/arcjet/arcjet-js/commit/0578cb2ae9ff46663e753d96b8702ed6ae9f30c6))
* **example:** Bump the dependencies group across 1 directory with 2 updates ([#1019](https://github.com/arcjet/arcjet-js/issues/1019)) ([a15df12](https://github.com/arcjet/arcjet-js/commit/a15df125d5accfa926e46861e4aca6215c68a91e))
* **example:** Bump the dependencies group across 1 directory with 6 updates ([#1017](https://github.com/arcjet/arcjet-js/issues/1017)) ([fb43c78](https://github.com/arcjet/arcjet-js/commit/fb43c78b9a9505e3687aae04b70b30049365d349))
* **example:** Bump the dependencies group across 1 directory with 7 updates ([#1028](https://github.com/arcjet/arcjet-js/issues/1028)) ([a3693d0](https://github.com/arcjet/arcjet-js/commit/a3693d0cff1567c8d28cb1ab22a51f53ce399ade))
* **example:** Bump the dependencies group across 1 directory with 7 updates ([#1036](https://github.com/arcjet/arcjet-js/issues/1036)) ([4e2bfe9](https://github.com/arcjet/arcjet-js/commit/4e2bfe9b9240b025d49ce7aca6a7f9901e751014))
* **example:** Bump the dependencies group in /examples/nextjs-14-openai with 2 updates ([#1057](https://github.com/arcjet/arcjet-js/issues/1057)) ([5df2e47](https://github.com/arcjet/arcjet-js/commit/5df2e47c57758466ffcd2dc80313e0c85d331be0))
* **example:** Bump the dependencies group in /examples/nextjs-14-react-hook-form with 2 updates ([#996](https://github.com/arcjet/arcjet-js/issues/996)) ([988dbf3](https://github.com/arcjet/arcjet-js/commit/988dbf3ad0e438029525b0710d08b64d70d59ad1))
* **example:** Bump the dependencies group in /examples/nodejs-hono-rl with 2 updates ([#1007](https://github.com/arcjet/arcjet-js/issues/1007)) ([c36b9f3](https://github.com/arcjet/arcjet-js/commit/c36b9f358dad057c69665f7ae16e546e9b84c28a))


### 🧹 Miscellaneous Chores

* **analyze:** Regenerate WebAssembly ([#1041](https://github.com/arcjet/arcjet-js/issues/1041)) ([a45faa3](https://github.com/arcjet/arcjet-js/commit/a45faa3e39005bf089b7c37c7a5a15f1951c6529))
* Move generated protobuf to default buf file path ([#1009](https://github.com/arcjet/arcjet-js/issues/1009)) ([6800a00](https://github.com/arcjet/arcjet-js/commit/6800a003d9d2e1ba356408328f33d8f19e0d89c7))
* Warn when IP is empty, even if we override it in development ([#1000](https://github.com/arcjet/arcjet-js/issues/1000)) ([da14bcb](https://github.com/arcjet/arcjet-js/commit/da14bcb67f3bd5ffff9cc17bdbac4d2217a1bf36)), closes [#987](https://github.com/arcjet/arcjet-js/issues/987) [#216](https://github.com/arcjet/arcjet-js/issues/216)

## [1.0.0-alpha.17](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.16...v1.0.0-alpha.17) (2024-06-17)


### 🪲 Bug Fixes

* **sveltekit:** Load environment variables from process.env ([#989](https://github.com/arcjet/arcjet-js/issues/989)) ([375eaa9](https://github.com/arcjet/arcjet-js/commit/375eaa9d41e2aa3e8534cdc826429b3a3f8e6909)), closes [#982](https://github.com/arcjet/arcjet-js/issues/982)


### 📦 Dependencies

* Bump eslint-config-turbo from 2.0.3 to 2.0.4 ([#983](https://github.com/arcjet/arcjet-js/issues/983)) ([8383a31](https://github.com/arcjet/arcjet-js/commit/8383a31ff7188da653c879dcb3128b4cf2ab8e1d))
* **example:** Bump ai from 3.1.35 to 3.1.36 in /examples/nextjs-14-openai in the dependencies group ([#984](https://github.com/arcjet/arcjet-js/issues/984)) ([08d4b57](https://github.com/arcjet/arcjet-js/commit/08d4b576f31c5e439cec7e4bca1384244816ce89))
* **example:** Bump the dependencies group across 1 directory with 5 updates ([#991](https://github.com/arcjet/arcjet-js/issues/991)) ([593833d](https://github.com/arcjet/arcjet-js/commit/593833dbab8f66a2e6d038d30f4c402424f2615e))
* **example:** Bump the dependencies group in /examples/nextjs-14-react-hook-form with 2 updates ([#985](https://github.com/arcjet/arcjet-js/issues/985)) ([c259fb3](https://github.com/arcjet/arcjet-js/commit/c259fb3ccc1281f70f530b84747f0d31b97cd69d))


### 🧹 Miscellaneous Chores

* **examples:** Update .env file with ARCJET_ENV when NODE_ENV isn't set ([#988](https://github.com/arcjet/arcjet-js/issues/988)) ([6f7ca62](https://github.com/arcjet/arcjet-js/commit/6f7ca62d14b15acad25578676b010b8586d00f4a))

## [1.0.0-alpha.16](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.15...v1.0.0-alpha.16) (2024-06-14)


### 🪲 Bug Fixes

* Ensure withRule always contains previous rules in the same chain ([#981](https://github.com/arcjet/arcjet-js/issues/981)) ([2ee6581](https://github.com/arcjet/arcjet-js/commit/2ee658188c8b423988c8e549f219c545103412d0))


### 📦 Dependencies

* **example:** Bump @arcjet/next from 1.0.0-alpha.14 to 1.0.0-alpha.15 in /examples/nextjs-14-react-hook-form in the dependencies group ([#967](https://github.com/arcjet/arcjet-js/issues/967)) ([bba6546](https://github.com/arcjet/arcjet-js/commit/bba654610a71902875dd529db0f53899f5573c04))
* **example:** Bump ai from 3.1.33 to 3.1.35 in /examples/nextjs-14-openai in the dependencies group ([#975](https://github.com/arcjet/arcjet-js/issues/975)) ([d9f7fcf](https://github.com/arcjet/arcjet-js/commit/d9f7fcfa6a957c37f916289fdb68c68e73bf1315))
* **example:** Bump lucide-react from 0.394.0 to 0.395.0 in /examples/nextjs-14-authjs-5 in the dependencies group ([#978](https://github.com/arcjet/arcjet-js/issues/978)) ([3fee58d](https://github.com/arcjet/arcjet-js/commit/3fee58dcd2c35bfbedd16012212d4221c00cf2a1))
* **example:** Bump lucide-react from 0.394.0 to 0.395.0 in /examples/nextjs-14-react-hook-form in the dependencies group ([#979](https://github.com/arcjet/arcjet-js/issues/979)) ([8ee8c3c](https://github.com/arcjet/arcjet-js/commit/8ee8c3c4ae7e210d385b9e5a463cb94c2ecc87c0))
* **example:** Bump the dependencies group across 1 directory with 4 updates ([#980](https://github.com/arcjet/arcjet-js/issues/980)) ([cd4621e](https://github.com/arcjet/arcjet-js/commit/cd4621ebee759e4c46bd83f4ac75c3a754c8b03b))
* **example:** Bump the dependencies group in /examples/nextjs-14-openai with 2 updates ([#968](https://github.com/arcjet/arcjet-js/issues/968)) ([f563848](https://github.com/arcjet/arcjet-js/commit/f56384885d88abe93e3576ec1eebd74f6ef2705a))
* **example:** Bump the dependencies group in /examples/nodejs-hono-rl with 2 updates ([#974](https://github.com/arcjet/arcjet-js/issues/974)) ([a6ee6af](https://github.com/arcjet/arcjet-js/commit/a6ee6af593772da726609e7a54f356413e0c89fd))


### 🧹 Miscellaneous Chores

* **deps:** Upgrade Trunk ([#976](https://github.com/arcjet/arcjet-js/issues/976)) ([e1e867e](https://github.com/arcjet/arcjet-js/commit/e1e867e92c6b4d173135849f9740a8760214b576))
* **examples:** Add ARCJET_ENV to Bun and SvelteKit env files ([#970](https://github.com/arcjet/arcjet-js/issues/970)) ([8a20d30](https://github.com/arcjet/arcjet-js/commit/8a20d305b5460d3744dceb4bd2e1f605ab188a8f))
* Update logo in examples ([#977](https://github.com/arcjet/arcjet-js/issues/977)) ([4d394a8](https://github.com/arcjet/arcjet-js/commit/4d394a83edc5b382fa48b59dfa1b3b93efa16dab))

## [1.0.0-alpha.15](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.14...v1.0.0-alpha.15) (2024-06-12)


### ⚠ BREAKING CHANGES

* Remove rateLimit alias for fixedWindow rule ([#964](https://github.com/arcjet/arcjet-js/issues/964))
* Remove logger dependency from core ([#929](https://github.com/arcjet/arcjet-js/issues/929))
* Move client into protocol and rename builders in adapters ([#932](https://github.com/arcjet/arcjet-js/issues/932))
* Freeze the ArcjetContext before using it ([#934](https://github.com/arcjet/arcjet-js/issues/934))

### 🪲 Bug Fixes

* **examples:** Update Sveltekite deps & fix a typo ([#939](https://github.com/arcjet/arcjet-js/issues/939)) ([dffd4a5](https://github.com/arcjet/arcjet-js/commit/dffd4a5759c0eaddf1fbfbe0ade1e0b75d6adc14))


### 📦 Dependencies

* Bump braces from 3.0.2 to 3.0.3 ([#954](https://github.com/arcjet/arcjet-js/issues/954)) ([f3d2af5](https://github.com/arcjet/arcjet-js/commit/f3d2af53e6939f25597f75b1dfe212238afee626))
* **dev:** Bump bun-types from 1.1.12 to 1.1.13 ([#947](https://github.com/arcjet/arcjet-js/issues/947)) ([bbf996d](https://github.com/arcjet/arcjet-js/commit/bbf996d6d2134fecee25eb218e9534b0550691fd))
* **example:** Bump braces from 3.0.2 to 3.0.3 in /examples/nextjs-14-app-dir-rl ([#962](https://github.com/arcjet/arcjet-js/issues/962)) ([3ef130f](https://github.com/arcjet/arcjet-js/commit/3ef130fe55c3da54927dd25b048b974ff6edf7f4))
* **example:** Bump braces from 3.0.2 to 3.0.3 in /examples/nextjs-14-app-dir-validate-email ([#961](https://github.com/arcjet/arcjet-js/issues/961)) ([05c8aed](https://github.com/arcjet/arcjet-js/commit/05c8aed7a2e56514d672485a5a117137e6026815))
* **example:** Bump braces from 3.0.2 to 3.0.3 in /examples/nextjs-14-authjs-5 ([#959](https://github.com/arcjet/arcjet-js/issues/959)) ([9af5c16](https://github.com/arcjet/arcjet-js/commit/9af5c166620b969e759bf01503321c74063fed44))
* **example:** Bump braces from 3.0.2 to 3.0.3 in /examples/nextjs-14-clerk-rl ([#949](https://github.com/arcjet/arcjet-js/issues/949)) ([2a3a919](https://github.com/arcjet/arcjet-js/commit/2a3a9190119b99d4aae99c73e23ed84e6e3578e5))
* **example:** Bump braces from 3.0.2 to 3.0.3 in /examples/nextjs-14-clerk-shield ([#957](https://github.com/arcjet/arcjet-js/issues/957)) ([18c5068](https://github.com/arcjet/arcjet-js/commit/18c506801a62f21a4521d5fd57157169a562321d))
* **example:** Bump braces from 3.0.2 to 3.0.3 in /examples/nextjs-14-decorate ([#952](https://github.com/arcjet/arcjet-js/issues/952)) ([3077d96](https://github.com/arcjet/arcjet-js/commit/3077d96d794d1ead9039c6429d97d86fcc924948))
* **example:** Bump braces from 3.0.2 to 3.0.3 in /examples/nextjs-14-ip-details ([#956](https://github.com/arcjet/arcjet-js/issues/956)) ([466c6d6](https://github.com/arcjet/arcjet-js/commit/466c6d63351af181789ed4f35986d0aaf36a7b09))
* **example:** Bump braces from 3.0.2 to 3.0.3 in /examples/nextjs-14-nextauth-4 ([#951](https://github.com/arcjet/arcjet-js/issues/951)) ([c6270dd](https://github.com/arcjet/arcjet-js/commit/c6270ddd266c354c1d08725493d1b997f89ba763))
* **example:** Bump braces from 3.0.2 to 3.0.3 in /examples/nextjs-14-openai ([#955](https://github.com/arcjet/arcjet-js/issues/955)) ([cc46877](https://github.com/arcjet/arcjet-js/commit/cc46877c730debb10622a9f674150d9229678cf4))
* **example:** Bump braces from 3.0.2 to 3.0.3 in /examples/nextjs-14-pages-wrap ([#953](https://github.com/arcjet/arcjet-js/issues/953)) ([6449d0d](https://github.com/arcjet/arcjet-js/commit/6449d0de43706929f8739762e7cc8a24b60382e8))
* **example:** Bump braces from 3.0.2 to 3.0.3 in /examples/nextjs-14-react-hook-form ([#958](https://github.com/arcjet/arcjet-js/issues/958)) ([3cc0ae7](https://github.com/arcjet/arcjet-js/commit/3cc0ae71b57de1452e00611b6d5ce286fd184f27))
* **example:** Bump hono from 4.4.4 to 4.4.5 in /examples/nodejs-hono-rl in the dependencies group ([#923](https://github.com/arcjet/arcjet-js/issues/923)) ([8458fe8](https://github.com/arcjet/arcjet-js/commit/8458fe84a16df97de2b92fbec82a4a75350d5a9d))
* **example:** Bump next from 14.2.3 to 14.2.4 in /examples/nextjs-14-authjs-5 in the dependencies group ([#940](https://github.com/arcjet/arcjet-js/issues/940)) ([4a1e3c1](https://github.com/arcjet/arcjet-js/commit/4a1e3c13365a0f6a8317f457ad18e745755abc60))
* **example:** Bump prettier from 3.3.1 to 3.3.2 in /examples/sveltekit in the dependencies group ([#926](https://github.com/arcjet/arcjet-js/issues/926)) ([30e03ad](https://github.com/arcjet/arcjet-js/commit/30e03ad1d65d9e44668e73b7db68db82a626621e))
* **example:** Bump the dependencies group across 1 directory with 3 updates ([#943](https://github.com/arcjet/arcjet-js/issues/943)) ([8e84ab6](https://github.com/arcjet/arcjet-js/commit/8e84ab616adf62975ebf3d565cb44345dff5773d))
* **example:** Bump the dependencies group across 1 directory with 3 updates ([#960](https://github.com/arcjet/arcjet-js/issues/960)) ([12c541c](https://github.com/arcjet/arcjet-js/commit/12c541ccccc33efead5058af00a9d0d74ceacd88))
* **example:** Bump the dependencies group across 1 directory with 3 updates ([#963](https://github.com/arcjet/arcjet-js/issues/963)) ([37f387c](https://github.com/arcjet/arcjet-js/commit/37f387c11d13885cb2249a2598afaf13cde1acbd))
* **example:** Bump the dependencies group across 1 directory with 4 updates ([#946](https://github.com/arcjet/arcjet-js/issues/946)) ([71fcc86](https://github.com/arcjet/arcjet-js/commit/71fcc860431d80f85b856f7b397c5c429e5a49b9))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-rl with 2 updates ([#937](https://github.com/arcjet/arcjet-js/issues/937)) ([9384f4e](https://github.com/arcjet/arcjet-js/commit/9384f4ebf1bd78dd4a5ef84aa83fac2e24287b3b))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-validate-email with 2 updates ([#944](https://github.com/arcjet/arcjet-js/issues/944)) ([6b6fe28](https://github.com/arcjet/arcjet-js/commit/6b6fe281c7b91c533facf86db2363c8c0d72ae21))
* **example:** Bump the dependencies group in /examples/nextjs-14-decorate with 2 updates ([#938](https://github.com/arcjet/arcjet-js/issues/938)) ([8c31888](https://github.com/arcjet/arcjet-js/commit/8c31888cf348d6c8c4aeb50c95f4e1451d1a732d))
* **example:** Bump the dependencies group in /examples/nextjs-14-ip-details with 2 updates ([#936](https://github.com/arcjet/arcjet-js/issues/936)) ([0cb5ed7](https://github.com/arcjet/arcjet-js/commit/0cb5ed700dc946a89ba89b71427963a794dee271))
* **example:** Bump the dependencies group in /examples/nextjs-14-nextauth-4 with 2 updates ([#942](https://github.com/arcjet/arcjet-js/issues/942)) ([00d32d1](https://github.com/arcjet/arcjet-js/commit/00d32d1c84dab67d57354de35cd60920771dba20))
* **example:** Bump the dependencies group in /examples/nextjs-14-pages-wrap with 2 updates ([#935](https://github.com/arcjet/arcjet-js/issues/935)) ([78f1a31](https://github.com/arcjet/arcjet-js/commit/78f1a31cf8cbaca914aec3c72c11e96a5d96cdf6))


### 🧹 Miscellaneous Chores

* **deps-dev:** Bump braces from 3.0.2 to 3.0.3 in /examples/nodejs-nestjs ([#950](https://github.com/arcjet/arcjet-js/issues/950)) ([eb4efc1](https://github.com/arcjet/arcjet-js/commit/eb4efc1af48a95da9bd44dd67da298d44ebdd11e))
* Fix typo in the release-please config ([#966](https://github.com/arcjet/arcjet-js/issues/966)) ([4e67890](https://github.com/arcjet/arcjet-js/commit/4e678908239247ebaf9003b892f7eb9da0e145ec))
* Freeze the ArcjetContext before using it ([#934](https://github.com/arcjet/arcjet-js/issues/934)) ([6720504](https://github.com/arcjet/arcjet-js/commit/672050415e4c73027be44238abbd9c7312519978))
* Link the versions of our new packages ([#965](https://github.com/arcjet/arcjet-js/issues/965)) ([6d20dfc](https://github.com/arcjet/arcjet-js/commit/6d20dfc17f0075c3cd3e7006cdfa367b2c68ca04))
* Move client into protocol and rename builders in adapters ([#932](https://github.com/arcjet/arcjet-js/issues/932)) ([ea1c2b2](https://github.com/arcjet/arcjet-js/commit/ea1c2b25d146be10056cbc616180abeac75f9a01))
* Remove logger dependency from core ([#929](https://github.com/arcjet/arcjet-js/issues/929)) ([8c15961](https://github.com/arcjet/arcjet-js/commit/8c15961dfbb7f193f93a5036b26f181fc2ae7ec7))
* Remove rateLimit alias for fixedWindow rule ([#964](https://github.com/arcjet/arcjet-js/issues/964)) ([320d67c](https://github.com/arcjet/arcjet-js/commit/320d67c8c45ac381811615a10c86286057192291))
* **rollup-config:** Allow more builtins to avoid warnings ([#933](https://github.com/arcjet/arcjet-js/issues/933)) ([2d6f4a0](https://github.com/arcjet/arcjet-js/commit/2d6f4a0c4bbab46eb79f96270abdc5a48dbc616b))

## [1.0.0-alpha.14](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.13...v1.0.0-alpha.14) (2024-06-10)


### ⚠ BREAKING CHANGES

* Move all environment lookup into separate package ([#897](https://github.com/arcjet/arcjet-js/issues/897))
* **ip:** Allow platform to be specified when looking up IP ([#896](https://github.com/arcjet/arcjet-js/issues/896))
* Add fallback IP in each adapter ([#895](https://github.com/arcjet/arcjet-js/issues/895))
* **analyze:** Leverage conditional exports to load Wasm appropriately ([#887](https://github.com/arcjet/arcjet-js/issues/887))
* **logger:** Align logger with Pino API ([#858](https://github.com/arcjet/arcjet-js/issues/858))
* Create runtime package and remove from SDK ([#871](https://github.com/arcjet/arcjet-js/issues/871))
* **decorate:** Use console to log instead of Arcjet logger ([#865](https://github.com/arcjet/arcjet-js/issues/865))
* **logger:** Replace nodejs util import with our sprintf library ([#857](https://github.com/arcjet/arcjet-js/issues/857))
* Allow ArcjetContext extension via new argument to core `protect()` ([#841](https://github.com/arcjet/arcjet-js/issues/841))
* Separate `@arcjet/headers` package from core ([#824](https://github.com/arcjet/arcjet-js/issues/824))
* **ip:** Rework priority of IP detection ([#799](https://github.com/arcjet/arcjet-js/issues/799))

### 🚀 New Features

* Add fallback IP in each adapter ([#895](https://github.com/arcjet/arcjet-js/issues/895)) ([0f23cff](https://github.com/arcjet/arcjet-js/commit/0f23cff62214462504a21b84e00b258721e31ead)), closes [#51](https://github.com/arcjet/arcjet-js/issues/51) [#885](https://github.com/arcjet/arcjet-js/issues/885)
* Allow ArcjetContext extension via new argument to core `protect()` ([#841](https://github.com/arcjet/arcjet-js/issues/841)) ([96bbe94](https://github.com/arcjet/arcjet-js/commit/96bbe941b2f1613bc870e8f6073db919c1f41a7e))
* Create runtime package and remove from SDK ([#871](https://github.com/arcjet/arcjet-js/issues/871)) ([4e9e216](https://github.com/arcjet/arcjet-js/commit/4e9e2169e587ab010ff587a915ae8e1416c9b8f5))
* Create sprintf package to replace util.format ([#856](https://github.com/arcjet/arcjet-js/issues/856)) ([160a16e](https://github.com/arcjet/arcjet-js/commit/160a16e94da1a2cd40ea7db0d339d68beed1c20d))
* **ip:** Allow platform to be specified when looking up IP ([#896](https://github.com/arcjet/arcjet-js/issues/896)) ([c9f54bb](https://github.com/arcjet/arcjet-js/commit/c9f54bbe0561b13dbb2dbc6f58087a1b25218504))
* **logger:** Align logger with Pino API ([#858](https://github.com/arcjet/arcjet-js/issues/858)) ([1806b94](https://github.com/arcjet/arcjet-js/commit/1806b94d7f7d0a7fd052e3121892d4dc1fdb719b)), closes [#822](https://github.com/arcjet/arcjet-js/issues/822) [#855](https://github.com/arcjet/arcjet-js/issues/855)
* Move all environment lookup into separate package ([#897](https://github.com/arcjet/arcjet-js/issues/897)) ([a5bb8ca](https://github.com/arcjet/arcjet-js/commit/a5bb8ca6bad9d831b3f67f12b3ef87048ced25bb))
* Separate `@arcjet/headers` package from core ([#824](https://github.com/arcjet/arcjet-js/issues/824)) ([c8364f4](https://github.com/arcjet/arcjet-js/commit/c8364f464b99b5b66749ea776e29c728257a2d74))


### 🪲 Bug Fixes

* **analyze:** Disable cache during base64 decode ([#838](https://github.com/arcjet/arcjet-js/issues/838)) ([72fb961](https://github.com/arcjet/arcjet-js/commit/72fb9610aa2ead7bf26121bb793ec2086b8d4f70))
* **ip:** Rework priority of IP detection ([#799](https://github.com/arcjet/arcjet-js/issues/799)) ([1df6291](https://github.com/arcjet/arcjet-js/commit/1df62917c934feba4f3ce76054817058f5cfadd9))


### 📦 Dependencies

* Bump @bufbuild/protobuf from 1.9.0 to 1.10.0 ([#847](https://github.com/arcjet/arcjet-js/issues/847)) ([de8266f](https://github.com/arcjet/arcjet-js/commit/de8266f53beb66d0e4770b82cb0c372715704993))
* Bump @rollup/plugin-replace from 5.0.5 to 5.0.7 ([#920](https://github.com/arcjet/arcjet-js/issues/920)) ([176170b](https://github.com/arcjet/arcjet-js/commit/176170b600790bb2198d49c30e16096de60553c5))
* Bump @typescript-eslint/eslint-plugin from 7.12.0 to 7.13.0 ([#918](https://github.com/arcjet/arcjet-js/issues/918)) ([bbd72a5](https://github.com/arcjet/arcjet-js/commit/bbd72a5c007a40ee31ed72b9ff145d24bef4274c))
* Bump @typescript-eslint/eslint-plugin from 7.9.0 to 7.12.0 ([#862](https://github.com/arcjet/arcjet-js/issues/862)) ([51330b7](https://github.com/arcjet/arcjet-js/commit/51330b77852e51704e2cffc9994115f24f4fae17))
* Bump @typescript-eslint/parser from 7.12.0 to 7.13.0 ([#917](https://github.com/arcjet/arcjet-js/issues/917)) ([cfe0c14](https://github.com/arcjet/arcjet-js/commit/cfe0c147a209828be7555f4d3781213d3e8e0edb))
* Bump @typescript-eslint/parser from 7.9.0 to 7.12.0 ([#861](https://github.com/arcjet/arcjet-js/issues/861)) ([eaf8c26](https://github.com/arcjet/arcjet-js/commit/eaf8c26c81bb202a9417c993f37e336b91b871b0))
* Bump eslint-config-turbo from 1.13.3 to 2.0.3 ([#893](https://github.com/arcjet/arcjet-js/issues/893)) ([97525af](https://github.com/arcjet/arcjet-js/commit/97525af1ae3f9395e403113733419ab9fbdf5f12))
* **dev:** Bump @rollup/wasm-node from 4.17.2 to 4.18.0 ([#803](https://github.com/arcjet/arcjet-js/issues/803)) ([e6321af](https://github.com/arcjet/arcjet-js/commit/e6321afbad7127442d78b9c760c0e4c1ef73a77c))
* **dev:** Bump bun-types from 1.1.8 to 1.1.12 ([#853](https://github.com/arcjet/arcjet-js/issues/853)) ([a42fbd3](https://github.com/arcjet/arcjet-js/commit/a42fbd3c6c1e718343c579cbfd893f07a1859da3))
* **example:** Bump @types/bun from 1.1.2 to 1.1.3 in /examples/bun-hono-rl in the dependencies group ([#804](https://github.com/arcjet/arcjet-js/issues/804)) ([ecada7f](https://github.com/arcjet/arcjet-js/commit/ecada7fd3ba29b90819d3dc1f9a7b4280dfb1f43))
* **example:** Bump @types/bun from 1.1.2 to 1.1.3 in /examples/bun-rl in the dependencies group ([#800](https://github.com/arcjet/arcjet-js/issues/800)) ([de15757](https://github.com/arcjet/arcjet-js/commit/de157578743e9ef4f6860a1cd598420eccdf3db0))
* **example:** Bump ai from 3.1.30 to 3.1.31 in /examples/nextjs-14-openai in the dependencies group ([#915](https://github.com/arcjet/arcjet-js/issues/915)) ([84510a8](https://github.com/arcjet/arcjet-js/commit/84510a827ed07ad7b378778a121fd6c4782dc1ae))
* **example:** Bump lucide-react from 0.390.0 to 0.394.0 in /examples/nextjs-14-authjs-5 in the dependencies group ([#916](https://github.com/arcjet/arcjet-js/issues/916)) ([0414404](https://github.com/arcjet/arcjet-js/commit/04144047ba9894375202b17bb1db4feebb0cef43))
* **example:** Bump the dependencies group across 1 directory with 12 updates ([#921](https://github.com/arcjet/arcjet-js/issues/921)) ([2e373c4](https://github.com/arcjet/arcjet-js/commit/2e373c458125075db9430e120969bbf330b9bdcd))
* **example:** Bump the dependencies group across 1 directory with 2 updates ([#872](https://github.com/arcjet/arcjet-js/issues/872)) ([2e8257d](https://github.com/arcjet/arcjet-js/commit/2e8257d9cde6a48bef3bb2bbe1373cc5e2af17d7))
* **example:** Bump the dependencies group across 1 directory with 2 updates ([#876](https://github.com/arcjet/arcjet-js/issues/876)) ([e35a61a](https://github.com/arcjet/arcjet-js/commit/e35a61a5303eb2bfbd8e35e03ed8a9aa72e4d29b))
* **example:** Bump the dependencies group across 1 directory with 2 updates ([#877](https://github.com/arcjet/arcjet-js/issues/877)) ([37b268f](https://github.com/arcjet/arcjet-js/commit/37b268f4d3192bc676cfc08596795a7bec4801e8))
* **example:** Bump the dependencies group across 1 directory with 2 updates ([#878](https://github.com/arcjet/arcjet-js/issues/878)) ([03e8f0a](https://github.com/arcjet/arcjet-js/commit/03e8f0a48b21eeaee10d8184a7e68432f2998aea))
* **example:** Bump the dependencies group across 1 directory with 2 updates ([#881](https://github.com/arcjet/arcjet-js/issues/881)) ([f37d892](https://github.com/arcjet/arcjet-js/commit/f37d892eed7245caf932327e2839b5ad02ff894e))
* **example:** Bump the dependencies group across 1 directory with 2 updates ([#883](https://github.com/arcjet/arcjet-js/issues/883)) ([22b4792](https://github.com/arcjet/arcjet-js/commit/22b47920fcead6c706f476d6d0858c7c5b1a072f))
* **example:** Bump the dependencies group across 1 directory with 2 updates ([#888](https://github.com/arcjet/arcjet-js/issues/888)) ([6d5b708](https://github.com/arcjet/arcjet-js/commit/6d5b708dae0cbe6c702124088b09270fefe4b35b))
* **example:** Bump the dependencies group across 1 directory with 3 updates ([#875](https://github.com/arcjet/arcjet-js/issues/875)) ([a7b541e](https://github.com/arcjet/arcjet-js/commit/a7b541eed02b1b2cb7dc4e381763c0114a01c6a7))
* **example:** Bump the dependencies group across 1 directory with 3 updates ([#882](https://github.com/arcjet/arcjet-js/issues/882)) ([1b38026](https://github.com/arcjet/arcjet-js/commit/1b3802631e8bd479758c4bcd2eb01c9f684baef6))
* **example:** Bump the dependencies group across 1 directory with 4 updates ([#892](https://github.com/arcjet/arcjet-js/issues/892)) ([4dddd0c](https://github.com/arcjet/arcjet-js/commit/4dddd0c4d9261acda832b80f32d54adf1603cc43))
* **example:** Bump the dependencies group across 1 directory with 4 updates ([#899](https://github.com/arcjet/arcjet-js/issues/899)) ([99886d1](https://github.com/arcjet/arcjet-js/commit/99886d1ac68dbe255254b2cd4cfb69cb9b9301ae))
* **example:** Bump the dependencies group across 1 directory with 9 updates ([#889](https://github.com/arcjet/arcjet-js/issues/889)) ([a5f9db6](https://github.com/arcjet/arcjet-js/commit/a5f9db6a731c8e01b197c4a29be7c7ade69d2b1e))
* **example:** Bump the dependencies group in /examples/nextjs-14-react-hook-form with 2 updates ([#919](https://github.com/arcjet/arcjet-js/issues/919)) ([391f3fc](https://github.com/arcjet/arcjet-js/commit/391f3fc253f5575fc4a010a0a628ab2dd2ee5c68))


### 📝 Documentation

* Add headers package to root readme ([#837](https://github.com/arcjet/arcjet-js/issues/837)) ([d1089ad](https://github.com/arcjet/arcjet-js/commit/d1089add5222eab3e968ad0c759d7a08a70ff6e0))
* Add quick start links & update Bun example ([#870](https://github.com/arcjet/arcjet-js/issues/870)) ([ee3079f](https://github.com/arcjet/arcjet-js/commit/ee3079f21484ed3b5cf67ae03a45cb9d07b3d911))
* Remove wording that implies is Shield is added by default ([#796](https://github.com/arcjet/arcjet-js/issues/796)) ([a85d18c](https://github.com/arcjet/arcjet-js/commit/a85d18ca6f6da589cfad58d3167b1c8a4b1edc55))


### 🧹 Miscellaneous Chores

* **analyze:** Leverage conditional exports to load Wasm appropriately ([#887](https://github.com/arcjet/arcjet-js/issues/887)) ([d7a698f](https://github.com/arcjet/arcjet-js/commit/d7a698f136e93dc927c0cb9a9a8c48d15ed48f83))
* **ci:** Avoid dependabot for bun examples ([#914](https://github.com/arcjet/arcjet-js/issues/914)) ([09391f7](https://github.com/arcjet/arcjet-js/commit/09391f74de11aa92676fc0ad4385685b5050d992))
* **decorate:** Use console to log instead of Arcjet logger ([#865](https://github.com/arcjet/arcjet-js/issues/865)) ([39bfcfc](https://github.com/arcjet/arcjet-js/commit/39bfcfc1017c25a1ce283d0604b491432deb8e8d))
* **docs:** Add live example app to READMEs ([#823](https://github.com/arcjet/arcjet-js/issues/823)) ([8b1c811](https://github.com/arcjet/arcjet-js/commit/8b1c81188b0035cfde810917239ea584e6ce3b3d))
* **logger:** Replace nodejs util import with our sprintf library ([#857](https://github.com/arcjet/arcjet-js/issues/857)) ([edd99a1](https://github.com/arcjet/arcjet-js/commit/edd99a11ca80a36115e9977b13039b4c3b0e761a))
* **logger:** Update description to match implementation ([#907](https://github.com/arcjet/arcjet-js/issues/907)) ([0840358](https://github.com/arcjet/arcjet-js/commit/0840358a00d70ff573c7a9f14bdc38623fad0f0d))

## [1.0.0-alpha.13](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.12...v1.0.0-alpha.13) (2024-05-20)


### ⚠ BREAKING CHANGES

* **protocol:** Export only things we use from connect and buf ([#783](https://github.com/arcjet/arcjet-js/issues/783))
* **eslint-config:** Update linting rules ([#774](https://github.com/arcjet/arcjet-js/issues/774))

### 🚀 New Features

* Create Bun.sh adapter ([#757](https://github.com/arcjet/arcjet-js/issues/757)) ([381dde5](https://github.com/arcjet/arcjet-js/commit/381dde59b2daae1599bf1d9b4106f1054aed8f99)), closes [#475](https://github.com/arcjet/arcjet-js/issues/475)
* Create SvelteKit adapter ([#775](https://github.com/arcjet/arcjet-js/issues/775)) ([002fdbb](https://github.com/arcjet/arcjet-js/commit/002fdbb7472bb88921bb6577d6950e7064605589)), closes [#754](https://github.com/arcjet/arcjet-js/issues/754)
* Filter cookie headers when normalizing with ArcjetHeaders ([#773](https://github.com/arcjet/arcjet-js/issues/773)) ([99b3e1f](https://github.com/arcjet/arcjet-js/commit/99b3e1fd1f104824642817e2f22bc78d308e2fb1))
* **ip:** Detect Fly-Client-IP header when available ([#751](https://github.com/arcjet/arcjet-js/issues/751)) ([73359f6](https://github.com/arcjet/arcjet-js/commit/73359f63c69f19d10443d1c2dc113e714a004be9))


### 🪲 Bug Fixes

* **analyze:** Leverage string interpolation to import Wasm files on edge runtime ([#784](https://github.com/arcjet/arcjet-js/issues/784)) ([9b85908](https://github.com/arcjet/arcjet-js/commit/9b8590817091971581735c39406fe6cf40472e5b))
* **protocol:** Export only things we use from connect and buf ([#783](https://github.com/arcjet/arcjet-js/issues/783)) ([4596da5](https://github.com/arcjet/arcjet-js/commit/4596da514de35fd04bb186a6cd61c698492ee0ed))


### 📦 Dependencies

* Bump @bufbuild/protobuf from 1.8.0 to 1.9.0 ([#652](https://github.com/arcjet/arcjet-js/issues/652)) ([4cd2114](https://github.com/arcjet/arcjet-js/commit/4cd21148e1d1061ee8638bc70221d8bdf02ad4cb))
* Bump eslint-config-next from 14.2.2 to 14.2.3 ([#670](https://github.com/arcjet/arcjet-js/issues/670)) ([8d7ff7e](https://github.com/arcjet/arcjet-js/commit/8d7ff7e04cc23b65c220682c0e037e67fc9ec669))
* Bump eslint-config-turbo from 1.13.2 to 1.13.3 ([#686](https://github.com/arcjet/arcjet-js/issues/686)) ([1b9b68e](https://github.com/arcjet/arcjet-js/commit/1b9b68e6169575b6759dcbb61ddd5d1230ab0724))
* **dev:** Bump @bytecodealliance/jco from 1.1.1 to 1.2.2 ([#707](https://github.com/arcjet/arcjet-js/issues/707)) ([39989b8](https://github.com/arcjet/arcjet-js/commit/39989b8278fa9329b4e2a2a6d3326b5f37e573e4))
* **dev:** Bump @bytecodealliance/jco from 1.2.2 to 1.2.4 ([#725](https://github.com/arcjet/arcjet-js/issues/725)) ([7c43124](https://github.com/arcjet/arcjet-js/commit/7c431248ffc99e3a59688264ec4c2876ab113000))
* **dev:** Bump @rollup/wasm-node from 4.14.3 to 4.17.2 ([#708](https://github.com/arcjet/arcjet-js/issues/708)) ([6e548bf](https://github.com/arcjet/arcjet-js/commit/6e548bf30743d06615dc9a0b46b3cbdabd6a89e4))
* **example:** Bump @clerk/nextjs from 4.29.12 to 4.30.0 in /examples/nextjs-14-clerk-rl in the dependencies group ([#637](https://github.com/arcjet/arcjet-js/issues/637)) ([0fa5e3e](https://github.com/arcjet/arcjet-js/commit/0fa5e3e7f9df76ac0c1bc8f2cf2935470d02ae1e))
* **example:** Bump @clerk/nextjs from 5.0.10 to 5.0.11 in /examples/nextjs-14-clerk-rl in the dependencies group ([#771](https://github.com/arcjet/arcjet-js/issues/771)) ([81d1078](https://github.com/arcjet/arcjet-js/commit/81d107854f86e8c30af4d6fbfd2ad95342150342))
* **example:** Bump @clerk/nextjs from 5.0.10 to 5.0.11 in /examples/nextjs-14-clerk-shield in the dependencies group ([#770](https://github.com/arcjet/arcjet-js/issues/770)) ([ae4c32e](https://github.com/arcjet/arcjet-js/commit/ae4c32e856216a2bc7c641700a03839f3f71de3a))
* **example:** Bump @clerk/nextjs from 5.0.11 to 5.0.12 in /examples/nextjs-14-clerk-rl in the dependencies group ([#776](https://github.com/arcjet/arcjet-js/issues/776)) ([1454a35](https://github.com/arcjet/arcjet-js/commit/1454a3510dbfce723d6893d52429e5573b9c7f15))
* **example:** Bump @clerk/nextjs from 5.0.11 to 5.0.12 in /examples/nextjs-14-clerk-shield in the dependencies group ([#777](https://github.com/arcjet/arcjet-js/issues/777)) ([8b5c648](https://github.com/arcjet/arcjet-js/commit/8b5c648545a20a149a7c57fb2068f3e514d8c3b7))
* **example:** Bump @hono/node-server from 1.10.0 to 1.10.1 in /examples/nodejs-hono-rl in the dependencies group ([#640](https://github.com/arcjet/arcjet-js/issues/640)) ([5a8998f](https://github.com/arcjet/arcjet-js/commit/5a8998f1a6feb1f815defa0fae42c50be777270d))
* **example:** Bump @sveltejs/kit from 2.5.8 to 2.5.9 in /examples/sveltekit in the dependencies group ([#790](https://github.com/arcjet/arcjet-js/issues/790)) ([9e14db1](https://github.com/arcjet/arcjet-js/commit/9e14db1a24b9244ecc7da7264331964838bd5182))
* **example:** Bump @types/react from 18.3.1 to 18.3.2 in /examples/nextjs-14-app-dir-rl in the dependencies group ([#741](https://github.com/arcjet/arcjet-js/issues/741)) ([625a165](https://github.com/arcjet/arcjet-js/commit/625a1658f97d91cf88347424fca0d42ccf47f4ca))
* **example:** Bump @types/react from 18.3.1 to 18.3.2 in /examples/nextjs-14-app-dir-validate-email in the dependencies group ([#746](https://github.com/arcjet/arcjet-js/issues/746)) ([a562bed](https://github.com/arcjet/arcjet-js/commit/a562bed959eb9ebc08459fdf2223a47bd6e6acce))
* **example:** Bump @types/react from 18.3.1 to 18.3.2 in /examples/nextjs-14-decorate in the dependencies group ([#739](https://github.com/arcjet/arcjet-js/issues/739)) ([b3da4e6](https://github.com/arcjet/arcjet-js/commit/b3da4e6a7ef2fda08ff08b68270691fd19ed451f))
* **example:** Bump @types/react from 18.3.1 to 18.3.2 in /examples/nextjs-14-ip-details in the dependencies group ([#745](https://github.com/arcjet/arcjet-js/issues/745)) ([debbe35](https://github.com/arcjet/arcjet-js/commit/debbe350cab9df3b6eb930e0c17f10ab9ac10d76))
* **example:** Bump @types/react from 18.3.1 to 18.3.2 in /examples/nextjs-14-nextauth-4 in the dependencies group ([#748](https://github.com/arcjet/arcjet-js/issues/748)) ([e521eb9](https://github.com/arcjet/arcjet-js/commit/e521eb9adcf4b6af1808e03b1bdafa33d078aad7))
* **example:** Bump @types/react from 18.3.1 to 18.3.2 in /examples/nextjs-14-pages-wrap in the dependencies group ([#742](https://github.com/arcjet/arcjet-js/issues/742)) ([9f8040a](https://github.com/arcjet/arcjet-js/commit/9f8040aa72641aaaefb356cf58f347801dccd7b2))
* **example:** Bump ai from 3.1.8 to 3.1.9 in /examples/nextjs-14-openai in the dependencies group ([#767](https://github.com/arcjet/arcjet-js/issues/767)) ([bd7cf85](https://github.com/arcjet/arcjet-js/commit/bd7cf85011563c8bdb37efa88fdfe364cd0d6ae5))
* **example:** Bump ai from 3.1.9 to 3.1.12 in /examples/nextjs-14-openai in the dependencies group across 1 directory ([#779](https://github.com/arcjet/arcjet-js/issues/779)) ([225dbae](https://github.com/arcjet/arcjet-js/commit/225dbae3ade37e783e34e0fb12aef2a15467cf21))
* **example:** Bump eslint-config-next from 14.2.2 to 14.2.3 in /examples/nextjs-example in the dependencies group ([#668](https://github.com/arcjet/arcjet-js/issues/668)) ([36bf48b](https://github.com/arcjet/arcjet-js/commit/36bf48bb7335ecc1c684955a5686f9c71a3dac56))
* **example:** Bump hono from 4.2.5 to 4.2.7 in /examples/nodejs-hono-rl ([#654](https://github.com/arcjet/arcjet-js/issues/654)) ([330b317](https://github.com/arcjet/arcjet-js/commit/330b3178a2ac273134d5a18d60078d651bd72f67))
* **example:** Bump hono from 4.3.4 to 4.3.7 in /examples/nodejs-hono-rl in the dependencies group across 1 directory ([#762](https://github.com/arcjet/arcjet-js/issues/762)) ([8fb68f5](https://github.com/arcjet/arcjet-js/commit/8fb68f5dd34f9afbfa2742f0efdaff50f08f9c56))
* **example:** Bump hono from 4.3.7 to 4.3.8 in /examples/nodejs-hono-rl in the dependencies group ([#789](https://github.com/arcjet/arcjet-js/issues/789)) ([94c5e01](https://github.com/arcjet/arcjet-js/commit/94c5e01f36dcb8cdd3821e8c3cf9b9726057456e))
* **example:** Bump lucide-react from 0.370.0 to 0.371.0 in /examples/nextjs-14-authjs-5 in the dependencies group ([#638](https://github.com/arcjet/arcjet-js/issues/638)) ([3e79236](https://github.com/arcjet/arcjet-js/commit/3e79236e87f8b6245e6df9833661eba648cdcd81))
* **example:** Bump the dependencies group across 1 directory with 13 updates ([#760](https://github.com/arcjet/arcjet-js/issues/760)) ([18456d9](https://github.com/arcjet/arcjet-js/commit/18456d961370bceeae9394618637407f408a435e))
* **example:** Bump the dependencies group across 1 directory with 2 updates ([#732](https://github.com/arcjet/arcjet-js/issues/732)) ([0ff6abc](https://github.com/arcjet/arcjet-js/commit/0ff6abcb40a4687063b8e66258d0f0b5688cae05))
* **example:** Bump the dependencies group across 1 directory with 2 updates ([#736](https://github.com/arcjet/arcjet-js/issues/736)) ([608c9c4](https://github.com/arcjet/arcjet-js/commit/608c9c4ed95317b2074ee35814ac85a4f8a92b78))
* **example:** Bump the dependencies group across 1 directory with 2 updates ([#737](https://github.com/arcjet/arcjet-js/issues/737)) ([41ddb45](https://github.com/arcjet/arcjet-js/commit/41ddb4584181439242cab6f74a3ee9a0280ccc5b))
* **example:** Bump the dependencies group across 1 directory with 2 updates ([#763](https://github.com/arcjet/arcjet-js/issues/763)) ([c3d6b1d](https://github.com/arcjet/arcjet-js/commit/c3d6b1dcb757ec5d0c830866d8dd1ee1b7e9ef88))
* **example:** Bump the dependencies group across 1 directory with 2 updates ([#764](https://github.com/arcjet/arcjet-js/issues/764)) ([ffc7739](https://github.com/arcjet/arcjet-js/commit/ffc77397042e51ba6f412cef89bf7639ffd82456))
* **example:** Bump the dependencies group across 1 directory with 3 updates ([#761](https://github.com/arcjet/arcjet-js/issues/761)) ([eb6d64d](https://github.com/arcjet/arcjet-js/commit/eb6d64d636094b93fd16d3911c1431758aa72945))
* **example:** Bump the dependencies group across 1 directory with 6 updates ([#689](https://github.com/arcjet/arcjet-js/issues/689)) ([f9ee74f](https://github.com/arcjet/arcjet-js/commit/f9ee74f016d103d8d3b82b67f0ddafbad586505b))
* **example:** Bump the dependencies group across 1 directory with 6 updates ([#692](https://github.com/arcjet/arcjet-js/issues/692)) ([d06033f](https://github.com/arcjet/arcjet-js/commit/d06033f073209b0814afe7411bd08251de462476))
* **example:** Bump the dependencies group across 1 directory with 6 updates ([#698](https://github.com/arcjet/arcjet-js/issues/698)) ([3d14b66](https://github.com/arcjet/arcjet-js/commit/3d14b66a2144d8a6a9fc77159f4f30e3d90608e0))
* **example:** Bump the dependencies group across 1 directory with 6 updates ([#699](https://github.com/arcjet/arcjet-js/issues/699)) ([a473eee](https://github.com/arcjet/arcjet-js/commit/a473eeed70cea3e0feaa11c7b35dc700eacea451))
* **example:** Bump the dependencies group across 1 directory with 6 updates ([#702](https://github.com/arcjet/arcjet-js/issues/702)) ([1b7b3bb](https://github.com/arcjet/arcjet-js/commit/1b7b3bb673b6e228c7f07fea0323517a68d4aaae))
* **example:** Bump the dependencies group across 1 directory with 6 updates ([#703](https://github.com/arcjet/arcjet-js/issues/703)) ([6923c83](https://github.com/arcjet/arcjet-js/commit/6923c83e41a0f8809b8ba5554a200810784a9b7c))
* **example:** Bump the dependencies group across 1 directory with 6 updates ([#768](https://github.com/arcjet/arcjet-js/issues/768)) ([f7fd624](https://github.com/arcjet/arcjet-js/commit/f7fd624bd3c54c3d2070f48ad3b09d246584851c))
* **example:** Bump the dependencies group across 1 directory with 8 updates ([#735](https://github.com/arcjet/arcjet-js/issues/735)) ([0e08e60](https://github.com/arcjet/arcjet-js/commit/0e08e6034ac8cbdb2302c95af96ca17efecd30d6))
* **example:** Bump the dependencies group across 1 directory with 9 updates ([#740](https://github.com/arcjet/arcjet-js/issues/740)) ([74f4308](https://github.com/arcjet/arcjet-js/commit/74f4308b0f56c4d4fcf447f9b3332e214354dd5b))
* **example:** Bump the dependencies group in /examples/nextjs-14-openai with 2 updates ([#636](https://github.com/arcjet/arcjet-js/issues/636)) ([5500faf](https://github.com/arcjet/arcjet-js/commit/5500fafe97069ac9f5499feeebdb075de1759c0c))
* **example:** Bump the dependencies group in /examples/nextjs-14-react-hook-form with 2 updates ([#639](https://github.com/arcjet/arcjet-js/issues/639)) ([1337efc](https://github.com/arcjet/arcjet-js/commit/1337efcad41142f414060584659746cc22ddcfc8))


### 📝 Documentation

* **bun:** Update the request param on protect method ([#786](https://github.com/arcjet/arcjet-js/issues/786)) ([f51b8d9](https://github.com/arcjet/arcjet-js/commit/f51b8d9881aa2aaa3b958c3725c9e02053c531fb))
* **examples:** Add NestJS example ([#688](https://github.com/arcjet/arcjet-js/issues/688)) ([f9cbc35](https://github.com/arcjet/arcjet-js/commit/f9cbc359e0254edf4d92a73b431499a8b10e3649))
* **examples:** Updated to Clerk Core 2 (Clerk NextJS v5) ([#704](https://github.com/arcjet/arcjet-js/issues/704)) ([9049bad](https://github.com/arcjet/arcjet-js/commit/9049bad171b90586ff98b35279cecb483af5b052))


### 🧹 Miscellaneous Chores

* **ci:** Ignore eslint 9 in SvelteKit example ([#766](https://github.com/arcjet/arcjet-js/issues/766)) ([6f8edac](https://github.com/arcjet/arcjet-js/commit/6f8edac38bea1f1e29ff860a397c866c6b5b844a))
* **ci:** Version Bun and SvelteKit adapters ([#787](https://github.com/arcjet/arcjet-js/issues/787)) ([384e4a4](https://github.com/arcjet/arcjet-js/commit/384e4a43f94b5aff58e4d62e049f724813861e05))
* **eslint-config:** Update linting rules ([#774](https://github.com/arcjet/arcjet-js/issues/774)) ([c223ba0](https://github.com/arcjet/arcjet-js/commit/c223ba061f27c786159fb6224341d162ef15bf0f)), closes [#337](https://github.com/arcjet/arcjet-js/issues/337)
* **example:** Add SvelteKit app ([#738](https://github.com/arcjet/arcjet-js/issues/738)) ([56f7dd3](https://github.com/arcjet/arcjet-js/commit/56f7dd3864ee2f6ab66a853f1379735da455d29d))
* **example:** Remove Next 13 example ([#734](https://github.com/arcjet/arcjet-js/issues/734)) ([0cafdbe](https://github.com/arcjet/arcjet-js/commit/0cafdbe5353def6e3a0e3587e1f5e4052e1c550a))
* **next:** Inline redirect interceptor to drop type import ([#785](https://github.com/arcjet/arcjet-js/issues/785)) ([e613372](https://github.com/arcjet/arcjet-js/commit/e613372fc7d7043aadcada090715fb43018c6a55))

## [1.0.0-alpha.12](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.11...v1.0.0-alpha.12) (2024-04-18)


### ⚠ BREAKING CHANGES

* Deprecate calling `protect()` with no rules ([#608](https://github.com/arcjet/arcjet-js/issues/608))

### 🚀 New Features

* Add configurable shield rule ([#609](https://github.com/arcjet/arcjet-js/issues/609)) ([a5717a1](https://github.com/arcjet/arcjet-js/commit/a5717a1183945d0cf1b06450b813fcd154a367a3)), closes [#606](https://github.com/arcjet/arcjet-js/issues/606)
* Add urls for Arcjet fly.io deployments ([#554](https://github.com/arcjet/arcjet-js/issues/554)) ([27d946b](https://github.com/arcjet/arcjet-js/commit/27d946b1f4adf00ab2c3ac931381d003771758df))


### 📦 Dependencies

* Bump eslint-config-next from 14.1.4 to 14.2.1 ([#585](https://github.com/arcjet/arcjet-js/issues/585)) ([b92474b](https://github.com/arcjet/arcjet-js/commit/b92474bd8b67820a098f2d126e0659960d07873d))
* Bump eslint-config-next from 14.2.1 to 14.2.2 ([#621](https://github.com/arcjet/arcjet-js/issues/621)) ([3268a70](https://github.com/arcjet/arcjet-js/commit/3268a70eb214fb84465a625f26a3a3d45300e911))
* Bump typeid-js from 0.5.0 to 0.6.0 ([#566](https://github.com/arcjet/arcjet-js/issues/566)) ([b6dcaeb](https://github.com/arcjet/arcjet-js/commit/b6dcaeb1667e082ed03a077b6a4b15e0e212ace7))
* Bump typeid-js from 0.6.0 to 0.7.0 ([#620](https://github.com/arcjet/arcjet-js/issues/620)) ([8b09974](https://github.com/arcjet/arcjet-js/commit/8b099749c656149b4bd947f14d79023e2a578a62))
* **dev:** Bump @rollup/wasm-node from 4.14.1 to 4.14.3 ([#597](https://github.com/arcjet/arcjet-js/issues/597)) ([598adf0](https://github.com/arcjet/arcjet-js/commit/598adf0b3d61b9e9bce046c7c3e8ddef2802a37c))
* **dev:** Bump typescript from 5.4.4 to 5.4.5 ([#557](https://github.com/arcjet/arcjet-js/issues/557)) ([16af391](https://github.com/arcjet/arcjet-js/commit/16af3914d66f05eb3b0d79a9623d2c5ade52bddd))
* **example:** Bump eslint-config-next from 14.1.4 to 14.2.1 in /examples/nextjs-example in the dependencies group ([#583](https://github.com/arcjet/arcjet-js/issues/583)) ([93b7d22](https://github.com/arcjet/arcjet-js/commit/93b7d22b39da53c982a3eb43b585e2f5756f2347))
* **example:** Bump eslint-config-next from 14.2.1 to 14.2.2 in /examples/nextjs-13-pages-wrap in the dependencies group ([#631](https://github.com/arcjet/arcjet-js/issues/631)) ([78e7f71](https://github.com/arcjet/arcjet-js/commit/78e7f71c86076e63e469def3a2ad2ea45632430a))
* **example:** Bump eslint-config-next from 14.2.1 to 14.2.2 in /examples/nextjs-example in the dependencies group ([#626](https://github.com/arcjet/arcjet-js/issues/626)) ([99c54ae](https://github.com/arcjet/arcjet-js/commit/99c54aedd8aae9dd5d30a4aa05263d1d9571a13e))
* **example:** Bump hono from 4.2.4 to 4.2.5 in /examples/nodejs-hono-rl in the dependencies group ([#628](https://github.com/arcjet/arcjet-js/issues/628)) ([27f6d41](https://github.com/arcjet/arcjet-js/commit/27f6d415c3092324786999a69d9fe9652a25435f))
* **example:** Bump the dependencies group across 1 directory with 3 updates ([#634](https://github.com/arcjet/arcjet-js/issues/634)) ([c57b920](https://github.com/arcjet/arcjet-js/commit/c57b920fc132e328a057c814370aa749eb5d1785))
* **example:** Bump the dependencies group across 1 directory with 3 updates ([#635](https://github.com/arcjet/arcjet-js/issues/635)) ([a0d587b](https://github.com/arcjet/arcjet-js/commit/a0d587be93eeaab5be70f7a99bb6673a9f03d9de))
* **example:** Bump the dependencies group across 1 directory with 6 updates ([#611](https://github.com/arcjet/arcjet-js/issues/611)) ([950279d](https://github.com/arcjet/arcjet-js/commit/950279d59fbd3c80f164ff66d4f9717c5b5dc89d))
* **example:** Bump the dependencies group in /examples/nextjs-13-pages-wrap with 3 updates ([#592](https://github.com/arcjet/arcjet-js/issues/592)) ([d24c26f](https://github.com/arcjet/arcjet-js/commit/d24c26f07deed7ce7118296b8840332d85fcb597))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-rl with 2 updates ([#624](https://github.com/arcjet/arcjet-js/issues/624)) ([f4038dd](https://github.com/arcjet/arcjet-js/commit/f4038dd7ed908bfe8d311cfd8371da1dcb58b673))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-rl with 4 updates ([#600](https://github.com/arcjet/arcjet-js/issues/600)) ([b02997f](https://github.com/arcjet/arcjet-js/commit/b02997f9423bb4f22b519165fdb3b864bce64300))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-validate-email with 2 updates ([#618](https://github.com/arcjet/arcjet-js/issues/618)) ([183cd3f](https://github.com/arcjet/arcjet-js/commit/183cd3f9f5d4ae811469875e43ae5c08fd4c5a8f))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-validate-email with 4 updates ([#596](https://github.com/arcjet/arcjet-js/issues/596)) ([b1aac10](https://github.com/arcjet/arcjet-js/commit/b1aac10bca9c77daa4fc479d8c504766e636ff62))
* **example:** Bump the dependencies group in /examples/nextjs-14-authjs-5 with 2 updates ([#632](https://github.com/arcjet/arcjet-js/issues/632)) ([baf13f3](https://github.com/arcjet/arcjet-js/commit/baf13f3a2e1fca560e20c4142cf8cedeb2e39022))
* **example:** Bump the dependencies group in /examples/nextjs-14-authjs-5 with 4 updates ([#598](https://github.com/arcjet/arcjet-js/issues/598)) ([bd3ae6e](https://github.com/arcjet/arcjet-js/commit/bd3ae6ea6653f1d3e81406f2800660f8fa502dbd))
* **example:** Bump the dependencies group in /examples/nextjs-14-clerk-rl with 2 updates ([#625](https://github.com/arcjet/arcjet-js/issues/625)) ([a08a5b3](https://github.com/arcjet/arcjet-js/commit/a08a5b357fc83ed9a4fe8514ddfa2803e291dcf1))
* **example:** Bump the dependencies group in /examples/nextjs-14-clerk-rl with 5 updates ([#594](https://github.com/arcjet/arcjet-js/issues/594)) ([a53aa2d](https://github.com/arcjet/arcjet-js/commit/a53aa2d07cf747a0476d22413864c3ed9e146c77))
* **example:** Bump the dependencies group in /examples/nextjs-14-clerk-shield with 5 updates ([#599](https://github.com/arcjet/arcjet-js/issues/599)) ([43fc6e6](https://github.com/arcjet/arcjet-js/commit/43fc6e6aceb4135a649f9dc7c87e7903f97732df))
* **example:** Bump the dependencies group in /examples/nextjs-14-decorate with 2 updates ([#627](https://github.com/arcjet/arcjet-js/issues/627)) ([2ebf3fe](https://github.com/arcjet/arcjet-js/commit/2ebf3fe9aa7acc9acd49c5ed3f22fce776f38a4e))
* **example:** Bump the dependencies group in /examples/nextjs-14-decorate with 4 updates ([#593](https://github.com/arcjet/arcjet-js/issues/593)) ([e250755](https://github.com/arcjet/arcjet-js/commit/e25075595c2e0f12a503a31cc5a1d001243395de))
* **example:** Bump the dependencies group in /examples/nextjs-14-ip-details with 2 updates ([#629](https://github.com/arcjet/arcjet-js/issues/629)) ([235599c](https://github.com/arcjet/arcjet-js/commit/235599c67956a61f864bffb95ce5ef4da61ebf68))
* **example:** Bump the dependencies group in /examples/nextjs-14-ip-details with 4 updates ([#602](https://github.com/arcjet/arcjet-js/issues/602)) ([56b8338](https://github.com/arcjet/arcjet-js/commit/56b833808f64727693b1369f3cbd025c5040de43))
* **example:** Bump the dependencies group in /examples/nextjs-14-nextauth-4 with 2 updates ([#633](https://github.com/arcjet/arcjet-js/issues/633)) ([10aa44e](https://github.com/arcjet/arcjet-js/commit/10aa44e86bb36c198832aa967ae7dabbc756db69))
* **example:** Bump the dependencies group in /examples/nextjs-14-nextauth-4 with 4 updates ([#601](https://github.com/arcjet/arcjet-js/issues/601)) ([e9cd5ee](https://github.com/arcjet/arcjet-js/commit/e9cd5ee238a5509025b267178e437694b4b22a49))
* **example:** Bump the dependencies group in /examples/nextjs-14-openai with 3 updates ([#630](https://github.com/arcjet/arcjet-js/issues/630)) ([f381437](https://github.com/arcjet/arcjet-js/commit/f3814373bbc054dfd2505cd6dba10ec11c18167e))
* **example:** Bump the dependencies group in /examples/nextjs-14-pages-wrap with 2 updates ([#623](https://github.com/arcjet/arcjet-js/issues/623)) ([a499f3f](https://github.com/arcjet/arcjet-js/commit/a499f3fc4a2345ae14a3b51858169c6e6c044d24))
* **example:** Bump the dependencies group in /examples/nextjs-14-pages-wrap with 4 updates ([#591](https://github.com/arcjet/arcjet-js/issues/591)) ([0d6a7d5](https://github.com/arcjet/arcjet-js/commit/0d6a7d5989f8e78c4963807523add39dc68778e6))
* **example:** Bump the dependencies group in /examples/nextjs-14-react-hook-form with 9 updates ([#603](https://github.com/arcjet/arcjet-js/issues/603)) ([a46de79](https://github.com/arcjet/arcjet-js/commit/a46de79e732c4590bb47feed2d9edc29f1b63548))
* **example:** Bump the dependencies group in /examples/nodejs-hono-rl with 2 updates ([#580](https://github.com/arcjet/arcjet-js/issues/580)) ([e49db56](https://github.com/arcjet/arcjet-js/commit/e49db565fecf09937454d3c130db96d2c2688f62))


### 📝 Documentation

* **examples:** Add missing Vercel external-id ([#617](https://github.com/arcjet/arcjet-js/issues/617)) ([cb59c81](https://github.com/arcjet/arcjet-js/commit/cb59c8105d1464488a2d3ecb73bb3af544ea5384))
* **examples:** Fix build warnings ([#616](https://github.com/arcjet/arcjet-js/issues/616)) ([e2cbd2a](https://github.com/arcjet/arcjet-js/commit/e2cbd2a2b0299773fdf059686f9335c20dd1399b))
* **examples:** Fix deploy button rendering ([#614](https://github.com/arcjet/arcjet-js/issues/614)) ([515168b](https://github.com/arcjet/arcjet-js/commit/515168bdaddb6992debe70cd2e9b53e9e9082ff2))
* **examples:** Remove redirect from deploy button ([#615](https://github.com/arcjet/arcjet-js/issues/615)) ([2f93ba6](https://github.com/arcjet/arcjet-js/commit/2f93ba6440c0541f6635f0bc056ee521b81db2c2))
* **examples:** Remove shield from rule ([1eb02d2](https://github.com/arcjet/arcjet-js/commit/1eb02d2cb6a7cf01707dae2ca5a8acd3695143b2))
* **examples:** Remove shield from rules ([#613](https://github.com/arcjet/arcjet-js/issues/613)) ([1eb02d2](https://github.com/arcjet/arcjet-js/commit/1eb02d2cb6a7cf01707dae2ca5a8acd3695143b2))


### 🧹 Miscellaneous Chores

* **ci:** Temporarily ignore eslint 9 updates ([#543](https://github.com/arcjet/arcjet-js/issues/543)) ([a8ac938](https://github.com/arcjet/arcjet-js/commit/a8ac93884b9b647a5111ae497fe887dae880878e))
* Deprecate calling `protect()` with no rules ([#608](https://github.com/arcjet/arcjet-js/issues/608)) ([57a8f6b](https://github.com/arcjet/arcjet-js/commit/57a8f6ba933b769cf7531f27ca36c08ecf74ea80))
* **example:** Remove log of user input ([24c97a0](https://github.com/arcjet/arcjet-js/commit/24c97a005a649e89257da955b22133e24672919a))
* **examples:** Add Hono + Node.js example ([#538](https://github.com/arcjet/arcjet-js/issues/538)) ([e0e84c8](https://github.com/arcjet/arcjet-js/commit/e0e84c8ad5f006c323eeb095a7853aa2d21e9285))
* **examples:** Added new Next.js + React Hook Form example ([#559](https://github.com/arcjet/arcjet-js/issues/559)) ([b0a13a4](https://github.com/arcjet/arcjet-js/commit/b0a13a45be66044b65d1ed4295bd92ffbdf45186))
* **examples:** Remove log of user input ([#525](https://github.com/arcjet/arcjet-js/issues/525)) ([24c97a0](https://github.com/arcjet/arcjet-js/commit/24c97a005a649e89257da955b22133e24672919a))
* **examples:** Update examples app deploy button ([#612](https://github.com/arcjet/arcjet-js/issues/612)) ([999e1bb](https://github.com/arcjet/arcjet-js/commit/999e1bb05f923a39b261743e735c38e4cb208a2b))

## [1.0.0-alpha.11](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.10...v1.0.0-alpha.11) (2024-04-08)


### 🚀 New Features

* Add ArcjetIpDetails to an ArcjetDecision ([#510](https://github.com/arcjet/arcjet-js/issues/510)) ([0642c51](https://github.com/arcjet/arcjet-js/commit/0642c5184272d8cc855cffa84491b1b7e75f1465)), closes [#474](https://github.com/arcjet/arcjet-js/issues/474)


### 📦 Dependencies

* Bump @bufbuild/protobuf from 1.7.2 to 1.8.0 ([#377](https://github.com/arcjet/arcjet-js/issues/377)) ([5253740](https://github.com/arcjet/arcjet-js/commit/5253740ba485e9fbacd627a0baf1bb54df5a56fc))
* Bump eslint-config-next from 14.1.3 to 14.1.4 ([#403](https://github.com/arcjet/arcjet-js/issues/403)) ([119245b](https://github.com/arcjet/arcjet-js/commit/119245bdc97d5df7ad345fbf8c384057c46a0472))
* Bump eslint-config-turbo from 1.12.5 to 1.13.2 ([#488](https://github.com/arcjet/arcjet-js/issues/488)) ([b6ab105](https://github.com/arcjet/arcjet-js/commit/b6ab1058af6d1801e6c4a2259155f7921be90a9e))
* Bump eslint-plugin-react from 7.34.0 to 7.34.1 ([#388](https://github.com/arcjet/arcjet-js/issues/388)) ([5ff4950](https://github.com/arcjet/arcjet-js/commit/5ff4950e05573a9079ac9b90b0dc04cff89f6150))
* Bump undici from 5.28.3 to 5.28.4 ([#505](https://github.com/arcjet/arcjet-js/issues/505)) ([0ffa608](https://github.com/arcjet/arcjet-js/commit/0ffa608264aa86614dcb91995a69f2f0d6b28d84))
* **dev:** Bump @bytecodealliance/jco from 1.0.3 to 1.1.1 ([#473](https://github.com/arcjet/arcjet-js/issues/473)) ([4584fe4](https://github.com/arcjet/arcjet-js/commit/4584fe43af549d4ec42565276f2fcf64cfdf3e57))
* **dev:** Bump @rollup/wasm-node from 4.13.0 to 4.13.2 ([#472](https://github.com/arcjet/arcjet-js/issues/472)) ([0268e51](https://github.com/arcjet/arcjet-js/commit/0268e51eb8967b2379014c1d16c65d1fbca13186))
* **dev:** Bump @rollup/wasm-node from 4.13.2 to 4.14.0 ([#493](https://github.com/arcjet/arcjet-js/issues/493)) ([ac14f3f](https://github.com/arcjet/arcjet-js/commit/ac14f3fb12157f9b2306ce2e703f80c081dcd9bc))
* **dev:** Bump @rollup/wasm-node from 4.14.0 to 4.14.1 ([#519](https://github.com/arcjet/arcjet-js/issues/519)) ([f859c0e](https://github.com/arcjet/arcjet-js/commit/f859c0eb071fcd83c68c8c94b60071217a600b3a))
* **dev:** Bump typescript from 5.4.2 to 5.4.3 ([#412](https://github.com/arcjet/arcjet-js/issues/412)) ([a69b76b](https://github.com/arcjet/arcjet-js/commit/a69b76b011a58bad21dc0763661927003c6b2a2e))
* **dev:** Bump typescript from 5.4.3 to 5.4.4 ([#509](https://github.com/arcjet/arcjet-js/issues/509)) ([8976fb1](https://github.com/arcjet/arcjet-js/commit/8976fb1b49f06b50b2a1d52b8a4619548993c737))
* **example:** Bump express from 4.18.3 to 4.19.2 in /examples/nodejs-express-rl ([#459](https://github.com/arcjet/arcjet-js/issues/459)) ([ee1af9d](https://github.com/arcjet/arcjet-js/commit/ee1af9d070e9ef9a2231f3131c74860f5d33882a))
* **example:** Bump express from 4.18.3 to 4.19.2 in /examples/nodejs-express-validate-email ([#461](https://github.com/arcjet/arcjet-js/issues/461)) ([d45953e](https://github.com/arcjet/arcjet-js/commit/d45953eee58e81fdfbd0a9b6aff9e3089754a7ff))
* **example:** Bump the dependencies group in /examples/nextjs-13-pages-wrap with 2 updates ([#504](https://github.com/arcjet/arcjet-js/issues/504)) ([ebe7548](https://github.com/arcjet/arcjet-js/commit/ebe75484c84b82cbc525bbcacb753d93256d076c))
* **example:** Bump the dependencies group in /examples/nextjs-13-pages-wrap with 6 updates ([#462](https://github.com/arcjet/arcjet-js/issues/462)) ([7e7affe](https://github.com/arcjet/arcjet-js/commit/7e7affefbdbfd6431fab097f7b3b571d53cd438f))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-rl with 2 updates ([#498](https://github.com/arcjet/arcjet-js/issues/498)) ([c30357f](https://github.com/arcjet/arcjet-js/commit/c30357f8cd81584e61590944341906217112d4b2))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-rl with 7 updates ([#463](https://github.com/arcjet/arcjet-js/issues/463)) ([6181c38](https://github.com/arcjet/arcjet-js/commit/6181c3886deaa317373c248bbe562e29d03a7099))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-validate-email with 2 updates ([#496](https://github.com/arcjet/arcjet-js/issues/496)) ([67031c3](https://github.com/arcjet/arcjet-js/commit/67031c3fd903cbd050b4fc5869ccf477f92a9d15))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-validate-email with 7 updates ([#466](https://github.com/arcjet/arcjet-js/issues/466)) ([3a45ae4](https://github.com/arcjet/arcjet-js/commit/3a45ae4c57960b575ab303c7bc99528fc27f520e))
* **example:** Bump the dependencies group in /examples/nextjs-14-authjs-5 with 4 updates ([#495](https://github.com/arcjet/arcjet-js/issues/495)) ([b9b3c3b](https://github.com/arcjet/arcjet-js/commit/b9b3c3b2ba340da0eadc7dda6f92c319df28eb8a))
* **example:** Bump the dependencies group in /examples/nextjs-14-clerk-rl with 8 updates ([#506](https://github.com/arcjet/arcjet-js/issues/506)) ([3635c13](https://github.com/arcjet/arcjet-js/commit/3635c13991ff3f7b1672c06136e32f1fd7b4ae19))
* **example:** Bump the dependencies group in /examples/nextjs-14-clerk-shield with 8 updates ([#507](https://github.com/arcjet/arcjet-js/issues/507)) ([f2c5c94](https://github.com/arcjet/arcjet-js/commit/f2c5c94c71e9f487b2a351b0e5235229f1736828))
* **example:** Bump the dependencies group in /examples/nextjs-14-decorate with 2 updates ([#500](https://github.com/arcjet/arcjet-js/issues/500)) ([8bb40cc](https://github.com/arcjet/arcjet-js/commit/8bb40cc4b58094f99a7278a7435b2544838cdce2))
* **example:** Bump the dependencies group in /examples/nextjs-14-decorate with 7 updates ([#465](https://github.com/arcjet/arcjet-js/issues/465)) ([b13a8e6](https://github.com/arcjet/arcjet-js/commit/b13a8e666108f270a56f850e7101c3e6953d5a57))
* **example:** Bump the dependencies group in /examples/nextjs-14-nextauth-4 with 2 updates ([#502](https://github.com/arcjet/arcjet-js/issues/502)) ([f4b24b5](https://github.com/arcjet/arcjet-js/commit/f4b24b5cccd8f8ba37e352af9386e229b0578856))
* **example:** Bump the dependencies group in /examples/nextjs-14-nextauth-4 with 7 updates ([#468](https://github.com/arcjet/arcjet-js/issues/468)) ([6ab6cdb](https://github.com/arcjet/arcjet-js/commit/6ab6cdb81f5866e0d5ae656ca9816dcc850db956))
* **example:** Bump the dependencies group in /examples/nextjs-14-openai with 4 updates ([#501](https://github.com/arcjet/arcjet-js/issues/501)) ([cde203b](https://github.com/arcjet/arcjet-js/commit/cde203b52230f5174c38c0f3c40f31496ca54d11))
* **example:** Bump the dependencies group in /examples/nextjs-14-openai with 9 updates ([#467](https://github.com/arcjet/arcjet-js/issues/467)) ([f3d785e](https://github.com/arcjet/arcjet-js/commit/f3d785e1de81d078e3685560d6944855a8df31ec))
* **example:** Bump the dependencies group in /examples/nextjs-14-pages-wrap with 7 updates ([#503](https://github.com/arcjet/arcjet-js/issues/503)) ([cfb84e1](https://github.com/arcjet/arcjet-js/commit/cfb84e1a7e18c93ebb7b9fa66b9cf2a612c1ca68))
* **example:** Bump the dependencies group in /examples/nextjs-example with 1 update ([#402](https://github.com/arcjet/arcjet-js/issues/402)) ([79911af](https://github.com/arcjet/arcjet-js/commit/79911affe2f18cbdadff0dc45b717ad48acd2aee))
* **example:** Bump the dependencies group in /examples/nodejs-express-rl with 1 update ([#438](https://github.com/arcjet/arcjet-js/issues/438)) ([da12423](https://github.com/arcjet/arcjet-js/commit/da124235d74abd62b18113e40042e95d7d3b95e8))


### 📝 Documentation

* **examples:** Added Auth.js 5 example app ([#432](https://github.com/arcjet/arcjet-js/issues/432)) ([b7a1901](https://github.com/arcjet/arcjet-js/commit/b7a1901876507a792a088c74395b7b323969e429))
* **examples:** Added NextAuth 4 example app ([#423](https://github.com/arcjet/arcjet-js/issues/423)) ([b218ebd](https://github.com/arcjet/arcjet-js/commit/b218ebd4d13eeb2705ead070aff2775a9093c847))


### 🧹 Miscellaneous Chores

* **ci:** Add the NextAuth 4 example to CI ([#471](https://github.com/arcjet/arcjet-js/issues/471)) ([a3ad83a](https://github.com/arcjet/arcjet-js/commit/a3ad83a4bc6a145cb546f385746e6fc778180353))
* Refresh root README + LICENSE ([#494](https://github.com/arcjet/arcjet-js/issues/494)) ([6f6da30](https://github.com/arcjet/arcjet-js/commit/6f6da3041cfb7feb80867d68cd93629093f372f8))

## [1.0.0-alpha.10](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.9...v1.0.0-alpha.10) (2024-03-13)


### ⚠ BREAKING CHANGES

* Switch Next.js to peer dependency ([#339](https://github.com/arcjet/arcjet-js/issues/339))

### 🚀 New Features

* **analyze:** Replace wasm-bindgen with jco generated bindings ([#334](https://github.com/arcjet/arcjet-js/issues/334)) ([48359ff](https://github.com/arcjet/arcjet-js/commit/48359ff986cc0ff4888fc2df6a89e9b6f9a5b697))


### 📦 Dependencies

* Bump eslint-config-next from 14.1.1 to 14.1.3 ([#322](https://github.com/arcjet/arcjet-js/issues/322)) ([9b99345](https://github.com/arcjet/arcjet-js/commit/9b99345dc8bf9511e991746d3e9e7e3e9fb1c9bc))
* Bump eslint-config-turbo from 1.12.4 to 1.12.5 ([#340](https://github.com/arcjet/arcjet-js/issues/340)) ([3d28dd9](https://github.com/arcjet/arcjet-js/commit/3d28dd9f2aef87bd7aba64a06413f543a21e45b0))
* Bump next from 14.1.1 to 14.1.3 ([#323](https://github.com/arcjet/arcjet-js/issues/323)) ([0bad5fe](https://github.com/arcjet/arcjet-js/commit/0bad5fe427c30e5626a2888d2b9d25f507771e9d))
* **dev:** Bump @bytecodealliance/jco from 1.0.2 to 1.0.3 ([#365](https://github.com/arcjet/arcjet-js/issues/365)) ([bb1470e](https://github.com/arcjet/arcjet-js/commit/bb1470e2c4133501aafe685f76b65e09b19b4df2))
* **dev:** Bump @rollup/wasm-node from 4.12.0 to 4.12.1 ([#320](https://github.com/arcjet/arcjet-js/issues/320)) ([7f07a8f](https://github.com/arcjet/arcjet-js/commit/7f07a8f78e2f2bf67ab0eba032eeb311704c4eee))
* **dev:** Bump @rollup/wasm-node from 4.12.1 to 4.13.0 ([#359](https://github.com/arcjet/arcjet-js/issues/359)) ([8658316](https://github.com/arcjet/arcjet-js/commit/8658316b252f9224069d5c11b8fc6acb6681c90e))
* **dev:** Bump typescript from 5.3.3 to 5.4.2 ([#321](https://github.com/arcjet/arcjet-js/issues/321)) ([e0c2914](https://github.com/arcjet/arcjet-js/commit/e0c2914ab868d4a3e571c959f4b00284bbbc3050))
* **example:** Bump the dependencies group in /examples/nextjs-13-pages-wrap with 1 update ([#366](https://github.com/arcjet/arcjet-js/issues/366)) ([62a3e7f](https://github.com/arcjet/arcjet-js/commit/62a3e7f7d1251df43f554e070dc24ebae75519d6))
* **example:** Bump the dependencies group in /examples/nextjs-13-pages-wrap with 3 updates ([#332](https://github.com/arcjet/arcjet-js/issues/332)) ([5083415](https://github.com/arcjet/arcjet-js/commit/50834153059746fae88d2cc99e00734470d15440))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-rl with 1 update ([#348](https://github.com/arcjet/arcjet-js/issues/348)) ([29b2259](https://github.com/arcjet/arcjet-js/commit/29b2259116c52fbba4be06b1b04a0f1edff292d5))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-rl with 1 update ([#361](https://github.com/arcjet/arcjet-js/issues/361)) ([291ad58](https://github.com/arcjet/arcjet-js/commit/291ad582d26bdd5e56fce430da815494b80b4ace))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-rl with 3 updates ([#330](https://github.com/arcjet/arcjet-js/issues/330)) ([505c886](https://github.com/arcjet/arcjet-js/commit/505c886261c08d1b711a4d28db4eaca13c221bba))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-validate-email with 1 update ([#352](https://github.com/arcjet/arcjet-js/issues/352)) ([ce76dcb](https://github.com/arcjet/arcjet-js/commit/ce76dcb0600005eb19dd8a75df6d1a941d0a1cb0))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-validate-email with 1 update ([#358](https://github.com/arcjet/arcjet-js/issues/358)) ([71847b9](https://github.com/arcjet/arcjet-js/commit/71847b92a5d8fb2daf1abd57ab32c38f018e6ffa))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-validate-email with 3 updates ([#326](https://github.com/arcjet/arcjet-js/issues/326)) ([322311e](https://github.com/arcjet/arcjet-js/commit/322311efdb97f6f88d72e2a22ff062f1a0d343b2))
* **example:** Bump the dependencies group in /examples/nextjs-14-clerk-rl with 1 update ([#349](https://github.com/arcjet/arcjet-js/issues/349)) ([1f4e1d4](https://github.com/arcjet/arcjet-js/commit/1f4e1d46c51220ad1def198cdaab129ccf168b10))
* **example:** Bump the dependencies group in /examples/nextjs-14-clerk-rl with 1 update ([#362](https://github.com/arcjet/arcjet-js/issues/362)) ([2d3f8eb](https://github.com/arcjet/arcjet-js/commit/2d3f8eba90d0565faf21461ed6a6aba8446aaca8))
* **example:** Bump the dependencies group in /examples/nextjs-14-clerk-rl with 3 updates ([#329](https://github.com/arcjet/arcjet-js/issues/329)) ([3797b6b](https://github.com/arcjet/arcjet-js/commit/3797b6b9ac6d96736fef102c7a3d73713ae252d8))
* **example:** Bump the dependencies group in /examples/nextjs-14-clerk-shield with 1 update ([#357](https://github.com/arcjet/arcjet-js/issues/357)) ([e35d530](https://github.com/arcjet/arcjet-js/commit/e35d530065defc3de44e434479b03478d7fb8838))
* **example:** Bump the dependencies group in /examples/nextjs-14-clerk-shield with 3 updates ([#327](https://github.com/arcjet/arcjet-js/issues/327)) ([12cf78b](https://github.com/arcjet/arcjet-js/commit/12cf78bda2b3bd2425b7ca559f96fe49ab09eeaa))
* **example:** Bump the dependencies group in /examples/nextjs-14-decorate with 1 update ([#350](https://github.com/arcjet/arcjet-js/issues/350)) ([51a21cf](https://github.com/arcjet/arcjet-js/commit/51a21cfef69b6670fbe4d2be19cdba8ce2740090))
* **example:** Bump the dependencies group in /examples/nextjs-14-decorate with 1 update ([#354](https://github.com/arcjet/arcjet-js/issues/354)) ([4267d44](https://github.com/arcjet/arcjet-js/commit/4267d445d57eb3df4489db10277aaf7d52670796))
* **example:** Bump the dependencies group in /examples/nextjs-14-decorate with 3 updates ([#331](https://github.com/arcjet/arcjet-js/issues/331)) ([2641ffe](https://github.com/arcjet/arcjet-js/commit/2641ffe02f9059d5f79f09a3b2bfe8159cf1dcd0))
* **example:** Bump the dependencies group in /examples/nextjs-14-openai with 1 update ([#360](https://github.com/arcjet/arcjet-js/issues/360)) ([cc7f381](https://github.com/arcjet/arcjet-js/commit/cc7f381246122b8145734b4caacaa1f6c9660eac))
* **example:** Bump the dependencies group in /examples/nextjs-14-openai with 2 updates ([#346](https://github.com/arcjet/arcjet-js/issues/346)) ([a5db5a9](https://github.com/arcjet/arcjet-js/commit/a5db5a9ec35f0d96bed6a1aca5f70f1c251561eb))
* **example:** Bump the dependencies group in /examples/nextjs-14-openai with 4 updates ([#328](https://github.com/arcjet/arcjet-js/issues/328)) ([d927ecc](https://github.com/arcjet/arcjet-js/commit/d927eccb2637b03fe1d61eb766b137f9274aabc8))
* **example:** Bump the dependencies group in /examples/nextjs-14-pages-wrap with 1 update ([#347](https://github.com/arcjet/arcjet-js/issues/347)) ([adb1a83](https://github.com/arcjet/arcjet-js/commit/adb1a835bb46c1a3b6d0d8721f45604241e346ab))
* **example:** Bump the dependencies group in /examples/nextjs-14-pages-wrap with 1 update ([#355](https://github.com/arcjet/arcjet-js/issues/355)) ([aca306b](https://github.com/arcjet/arcjet-js/commit/aca306b2aaea52f8bf34fbc46b1d81621e1d5ff8))
* **example:** Bump the dependencies group in /examples/nextjs-14-pages-wrap with 3 updates ([#325](https://github.com/arcjet/arcjet-js/issues/325)) ([2bbf20d](https://github.com/arcjet/arcjet-js/commit/2bbf20d7f0df29a9997aa1f80e2ef9d2a8fa3592))
* **example:** Bump the dependencies group in /examples/nextjs-example with 1 update ([#324](https://github.com/arcjet/arcjet-js/issues/324)) ([4bf8997](https://github.com/arcjet/arcjet-js/commit/4bf899787e83e35dd1cf04d16119e7275c6a43bd))
* Update trunk and linter ([#363](https://github.com/arcjet/arcjet-js/issues/363)) ([b6ab8a6](https://github.com/arcjet/arcjet-js/commit/b6ab8a6a8da2b91314e15ca6e3b9ebfff4ab0a66))


### 📝 Documentation

* **examples:** Add Node.js express server validate email example ([#343](https://github.com/arcjet/arcjet-js/issues/343)) ([fc6c6a8](https://github.com/arcjet/arcjet-js/commit/fc6c6a8611a06a1efb2d45f54bea2a3128b4cc2e))
* **examples:** Added Node.js Express server example ([#333](https://github.com/arcjet/arcjet-js/issues/333)) ([f398c28](https://github.com/arcjet/arcjet-js/commit/f398c28795bc0f5fe88432bf51e83d2a3e9080c6))


### 🧹 Miscellaneous Chores

* **analyze:** Replace node import with crypto global ([#335](https://github.com/arcjet/arcjet-js/issues/335)) ([bcc27f2](https://github.com/arcjet/arcjet-js/commit/bcc27f26dc740914c15f7adc99c1ad845b9458ff))
* **ci:** Ensure dependabot doesn't update next to 14 in 13 example ([#364](https://github.com/arcjet/arcjet-js/issues/364)) ([32e4cc7](https://github.com/arcjet/arcjet-js/commit/32e4cc71ba2766d13bacb4e39afd9aba770523ab))
* **examples:** Leverage semver so next gets updated by dependabot ([#345](https://github.com/arcjet/arcjet-js/issues/345)) ([58b6d2e](https://github.com/arcjet/arcjet-js/commit/58b6d2eb9ad2413d8dc36a65d027596dfc6a54eb))
* Make next a peerDep in our eslint package ([#344](https://github.com/arcjet/arcjet-js/issues/344)) ([89de5a8](https://github.com/arcjet/arcjet-js/commit/89de5a8b7461a4bb94a8c624ae9aa766e2594c18))
* Switch Next.js to peer dependency ([#339](https://github.com/arcjet/arcjet-js/issues/339)) ([cb82883](https://github.com/arcjet/arcjet-js/commit/cb82883e31cc615748576d6a51fd351aa6522323))

## [1.0.0-alpha.9](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.8...v1.0.0-alpha.9) (2024-03-04)


### ⚠ BREAKING CHANGES

* Remove logger from context and leverage singleton logger instead ([#260](https://github.com/arcjet/arcjet-js/issues/260))
* Separate ArcjetRequest and ArcjetRequestDetails types to accept record of headers ([#228](https://github.com/arcjet/arcjet-js/issues/228))

### 🚀 New Features

* Add `withRule` API for adding adhoc rules ([#245](https://github.com/arcjet/arcjet-js/issues/245)) ([f8ebbdc](https://github.com/arcjet/arcjet-js/commit/f8ebbdc7198010c4aa942255a76e65537c73f807)), closes [#193](https://github.com/arcjet/arcjet-js/issues/193)
* Add decorate package to set rate limit headers ([#247](https://github.com/arcjet/arcjet-js/issues/247)) ([232750d](https://github.com/arcjet/arcjet-js/commit/232750df8cf99378407e9c88e9d64d4b7a9410a4))
* **decorate:** Allow decorating Headers object directly ([#266](https://github.com/arcjet/arcjet-js/issues/266)) ([0bfdcc7](https://github.com/arcjet/arcjet-js/commit/0bfdcc7a595ac8624df5229f38aa5056ab944722))
* Implement initial nodejs SDK ([#268](https://github.com/arcjet/arcjet-js/issues/268)) ([6273296](https://github.com/arcjet/arcjet-js/commit/627329633c1a4eb764cdb2ef61bcd58ce1cd016b))
* Separate ArcjetRequest and ArcjetRequestDetails types to accept record of headers ([#228](https://github.com/arcjet/arcjet-js/issues/228)) ([4950364](https://github.com/arcjet/arcjet-js/commit/4950364be1f895fc8bb782950b20623fc8324ceb)), closes [#33](https://github.com/arcjet/arcjet-js/issues/33)


### 📦 Dependencies

* Bump eslint-config-next from 14.1.0 to 14.1.1 ([#279](https://github.com/arcjet/arcjet-js/issues/279)) ([0e0e1ab](https://github.com/arcjet/arcjet-js/commit/0e0e1ab255df9ee5c63a507b0588a880e3b441ab))
* Bump eslint-config-turbo from 1.12.3 to 1.12.4 ([#231](https://github.com/arcjet/arcjet-js/issues/231)) ([f495f1b](https://github.com/arcjet/arcjet-js/commit/f495f1b24f0917f59d26eeb6450f71d151275b58))
* Bump eslint-plugin-react from 7.33.2 to 7.34.0 ([#280](https://github.com/arcjet/arcjet-js/issues/280)) ([97cf82b](https://github.com/arcjet/arcjet-js/commit/97cf82b8ca157cb264536cb44adb24bd3ea8199f))
* Bump next from 14.1.0 to 14.1.1 ([#281](https://github.com/arcjet/arcjet-js/issues/281)) ([c568890](https://github.com/arcjet/arcjet-js/commit/c5688900ae5fed526dce7956793628f8a1cdd9af))
* **dev:** Bump @edge-runtime/jest-environment from 2.3.9 to 2.3.10 ([#229](https://github.com/arcjet/arcjet-js/issues/229)) ([6f3a070](https://github.com/arcjet/arcjet-js/commit/6f3a0706ccd7cc9c3fd80f554b4229f4b11767cb))
* **dev:** Bump @rollup/wasm-node from 4.10.0 to 4.12.0 ([#235](https://github.com/arcjet/arcjet-js/issues/235)) ([cf7ffc2](https://github.com/arcjet/arcjet-js/commit/cf7ffc2ae35d75884a04c88818f8c780ca7af223))
* **dev:** Bump @rollup/wasm-node from 4.9.6 to 4.10.0 ([#223](https://github.com/arcjet/arcjet-js/issues/223)) ([47c24b4](https://github.com/arcjet/arcjet-js/commit/47c24b40a8419f1dabcf8607c90dfcb97f6a4195))
* **dev:** Bump eslint from 8.56.0 to 8.57.0 ([#249](https://github.com/arcjet/arcjet-js/issues/249)) ([49972a9](https://github.com/arcjet/arcjet-js/commit/49972a9c051c89fbd4f7456d841f4b7da4a0e31a))
* **example:** Bump the dependencies group in /examples/nextjs-13-pages-wrap with 1 update ([#243](https://github.com/arcjet/arcjet-js/issues/243)) ([7c5cb6f](https://github.com/arcjet/arcjet-js/commit/7c5cb6fb3f61b9839e4d187f6c97a34a0a8487f7))
* **example:** Bump the dependencies group in /examples/nextjs-13-pages-wrap with 2 updates ([#259](https://github.com/arcjet/arcjet-js/issues/259)) ([7aa9316](https://github.com/arcjet/arcjet-js/commit/7aa9316555d91fa22da761c959a5190bfe2b04bf))
* **example:** Bump the dependencies group in /examples/nextjs-13-pages-wrap with 3 updates ([#291](https://github.com/arcjet/arcjet-js/issues/291)) ([02c9312](https://github.com/arcjet/arcjet-js/commit/02c931248086540a2900698f5ce51fb7541a225d))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-rl with 1 update ([#241](https://github.com/arcjet/arcjet-js/issues/241)) ([17b57c5](https://github.com/arcjet/arcjet-js/commit/17b57c5d8e6f40e83f4870d30d51cfc9c3a9051c))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-rl with 2 updates ([#256](https://github.com/arcjet/arcjet-js/issues/256)) ([7a40bb7](https://github.com/arcjet/arcjet-js/commit/7a40bb7d9bc9cf03767ca1c19f2e5ffdf0737fe1))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-rl with 3 updates ([#286](https://github.com/arcjet/arcjet-js/issues/286)) ([6595327](https://github.com/arcjet/arcjet-js/commit/6595327b4b09ffd2866d3126ff61e2a5743610e5))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-validate-email with 1 update ([#239](https://github.com/arcjet/arcjet-js/issues/239)) ([dce121f](https://github.com/arcjet/arcjet-js/commit/dce121fdda0c26cca8dbb0c524db46e17bcdc7eb))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-validate-email with 2 updates ([#257](https://github.com/arcjet/arcjet-js/issues/257)) ([2d690a6](https://github.com/arcjet/arcjet-js/commit/2d690a6c31a3a8ecbd4a4cdcf1edd9135d0ae089))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-validate-email with 3 updates ([#288](https://github.com/arcjet/arcjet-js/issues/288)) ([94d4cd4](https://github.com/arcjet/arcjet-js/commit/94d4cd4c1731ebc03902b0697c4149dc6fbbbc03))
* **example:** Bump the dependencies group in /examples/nextjs-14-clerk-rl with 5 updates ([#295](https://github.com/arcjet/arcjet-js/issues/295)) ([4dc786b](https://github.com/arcjet/arcjet-js/commit/4dc786bc49361a99ec3ab9dcb167f395ae21ada7))
* **example:** Bump the dependencies group in /examples/nextjs-14-clerk-shield with 5 updates ([#293](https://github.com/arcjet/arcjet-js/issues/293)) ([8d46255](https://github.com/arcjet/arcjet-js/commit/8d46255c789cf30997c5a91fd46a05118d28bd62))
* **example:** Bump the dependencies group in /examples/nextjs-14-decorate with 4 updates ([#292](https://github.com/arcjet/arcjet-js/issues/292)) ([b9bde97](https://github.com/arcjet/arcjet-js/commit/b9bde97dd34f74b265015b2a5d3dbaf7fc1afed2))
* **example:** Bump the dependencies group in /examples/nextjs-14-openai with 3 updates ([#240](https://github.com/arcjet/arcjet-js/issues/240)) ([b6c2257](https://github.com/arcjet/arcjet-js/commit/b6c2257a8f5bb2b1f72dbf2c0ed9479217058c3d))
* **example:** Bump the dependencies group in /examples/nextjs-14-openai with 3 updates ([#255](https://github.com/arcjet/arcjet-js/issues/255)) ([08612b5](https://github.com/arcjet/arcjet-js/commit/08612b52881da63294e59827e78ae875a850f489))
* **example:** Bump the dependencies group in /examples/nextjs-14-openai with 5 updates ([#289](https://github.com/arcjet/arcjet-js/issues/289)) ([aa68d70](https://github.com/arcjet/arcjet-js/commit/aa68d70e0a2ee60919381574554aaa302b461642))
* **example:** Bump the dependencies group in /examples/nextjs-14-pages-wrap with 1 update ([#242](https://github.com/arcjet/arcjet-js/issues/242)) ([45e7999](https://github.com/arcjet/arcjet-js/commit/45e79992d51429fdf23e2c1ab075be18cd99e933))
* **example:** Bump the dependencies group in /examples/nextjs-14-pages-wrap with 2 updates ([#258](https://github.com/arcjet/arcjet-js/issues/258)) ([7dfdd1e](https://github.com/arcjet/arcjet-js/commit/7dfdd1ee15cecb7eaef11d004a538bb02349ffdf))
* **example:** Bump the dependencies group in /examples/nextjs-14-pages-wrap with 3 updates ([#287](https://github.com/arcjet/arcjet-js/issues/287)) ([183bccf](https://github.com/arcjet/arcjet-js/commit/183bccf25531ea59da8291cf7da8c6999edc3123))
* **example:** Bump the dependencies group in /examples/nextjs-example with 1 update ([#294](https://github.com/arcjet/arcjet-js/issues/294)) ([f3e857f](https://github.com/arcjet/arcjet-js/commit/f3e857f5549c0ebc19e762f15cf8f47e3ddef570))


### 📝 Documentation

* Add node SDK and move core to utility section ([#290](https://github.com/arcjet/arcjet-js/issues/290)) ([b6683a5](https://github.com/arcjet/arcjet-js/commit/b6683a594edfaed17e675bc26bec51f735769b55))
* **examples:** Added example apps for Clerk integration ([#244](https://github.com/arcjet/arcjet-js/issues/244)) ([95c7abd](https://github.com/arcjet/arcjet-js/commit/95c7abddc038a2d47a71f9470a45cc4256d990e3))
* **examples:** Expanded AI example with rate limit by user ID ([#221](https://github.com/arcjet/arcjet-js/issues/221)) ([915d3fc](https://github.com/arcjet/arcjet-js/commit/915d3fcdd03c6b2e8a125239fae8b2a1d0474d1a))
* Update HTTP version ([#227](https://github.com/arcjet/arcjet-js/issues/227)) ([c102c64](https://github.com/arcjet/arcjet-js/commit/c102c64246020cfa247327fe646c62e36a43a62f))


### 🧹 Miscellaneous Chores

* Add bugs and author info & update readme ([#254](https://github.com/arcjet/arcjet-js/issues/254)) ([9b0d2fc](https://github.com/arcjet/arcjet-js/commit/9b0d2fc674fdc1ddf9952b9a2ef3f5f3c860d41a))
* **ci:** Add newer examples to required checks ([#299](https://github.com/arcjet/arcjet-js/issues/299)) ([43e61d2](https://github.com/arcjet/arcjet-js/commit/43e61d24cb0d7c4e7689f7d7405fd55986fd386a))
* **ci:** Disable next.js 13 required check ([#298](https://github.com/arcjet/arcjet-js/issues/298)) ([9b46606](https://github.com/arcjet/arcjet-js/commit/9b46606fc508e760f95ce9595df6d939ca6addaa))
* **ci:** Update dependabot to check all examples ([#284](https://github.com/arcjet/arcjet-js/issues/284)) ([e681904](https://github.com/arcjet/arcjet-js/commit/e681904b451b8d88f44578811864d0446923b43f))
* **ci:** Update harden-runner, set policy to block, restrict permissions ([#297](https://github.com/arcjet/arcjet-js/issues/297)) ([deaecaa](https://github.com/arcjet/arcjet-js/commit/deaecaa78cc593bf142f7aeb0a51c338e61c4042))
* **examples:** Disable telemetry to tighten harden-runner ([#296](https://github.com/arcjet/arcjet-js/issues/296)) ([cf9fe38](https://github.com/arcjet/arcjet-js/commit/cf9fe384df7f2b625548ff3069d9b425d1c41938))
* Remove logger from context and leverage singleton logger instead ([#260](https://github.com/arcjet/arcjet-js/issues/260)) ([c93a2e1](https://github.com/arcjet/arcjet-js/commit/c93a2e11d550651ddbc3d9256facba59d4d4d965))

## [1.0.0-alpha.8](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.7...v1.0.0-alpha.8) (2024-02-09)


### ⚠ BREAKING CHANGES

* Handle TTL as seconds instead of milliseconds ([#211](https://github.com/arcjet/arcjet-js/issues/211))
* Add fixedWindow, tokenBucket, and slidingWindow primitives ([#184](https://github.com/arcjet/arcjet-js/issues/184))
* Remove timeout property on ArcjetRateLimitRule ([#182](https://github.com/arcjet/arcjet-js/issues/182))
* Remove count property on ArcjetRateLimitReason ([#181](https://github.com/arcjet/arcjet-js/issues/181))
* Required of props should always be required ([#180](https://github.com/arcjet/arcjet-js/issues/180))
* Build extra field from unknown request properties ([#179](https://github.com/arcjet/arcjet-js/issues/179))
* **protocol:** Introduce Shield name ([#158](https://github.com/arcjet/arcjet-js/issues/158))
* Limit `ARCJET_BASE_URL` to small set of allowed URLs ([#83](https://github.com/arcjet/arcjet-js/issues/83))

### 🚀 New Features

* Add fixedWindow, tokenBucket, and slidingWindow primitives ([#184](https://github.com/arcjet/arcjet-js/issues/184)) ([6701b02](https://github.com/arcjet/arcjet-js/commit/6701b02e8425c25953f103add46d7e850aa7d0b4))
* Allow user-defined characteristics on rate limit options ([#203](https://github.com/arcjet/arcjet-js/issues/203)) ([dc5b001](https://github.com/arcjet/arcjet-js/commit/dc5b0010dd772207ec662062bfa6da5fe712f987))
* Build extra field from unknown request properties ([#179](https://github.com/arcjet/arcjet-js/issues/179)) ([2576341](https://github.com/arcjet/arcjet-js/commit/257634154328a96d47969a58b389c0e9aacf59bc))
* Limit `ARCJET_BASE_URL` to small set of allowed URLs ([#83](https://github.com/arcjet/arcjet-js/issues/83)) ([d9184ea](https://github.com/arcjet/arcjet-js/commit/d9184ea929cda015339aaafe8c6d3f5a5da39ef2))
* Support cookies and query via the protocol ([#214](https://github.com/arcjet/arcjet-js/issues/214)) ([ca0cd64](https://github.com/arcjet/arcjet-js/commit/ca0cd64ca2576eeec7f44dfe7e4f413427d5eea2))
* Support duration strings or integers on rate limit configuration ([#192](https://github.com/arcjet/arcjet-js/issues/192)) ([b173d83](https://github.com/arcjet/arcjet-js/commit/b173d83bb5c80c78fd5c08dfa2aae5885d099620))


### 🪲 Bug Fixes

* Handle TTL as seconds instead of milliseconds ([#211](https://github.com/arcjet/arcjet-js/issues/211)) ([c2d3dd0](https://github.com/arcjet/arcjet-js/commit/c2d3dd095affee68bb661f90d1195f114baa4017))
* Required of props should always be required ([#180](https://github.com/arcjet/arcjet-js/issues/180)) ([1f92885](https://github.com/arcjet/arcjet-js/commit/1f92885daeed2c1cda65fce65ace042a9589282d))


### 📦 Dependencies

* bump @bufbuild/protobuf from 1.6.0 to 1.7.2 ([#167](https://github.com/arcjet/arcjet-js/issues/167)) ([c7dbdba](https://github.com/arcjet/arcjet-js/commit/c7dbdba85e57be93a816064ed56dadccd18e24af))
* bump @connectrpc/connect from 1.2.1 to 1.3.0 ([#126](https://github.com/arcjet/arcjet-js/issues/126)) ([40db7f3](https://github.com/arcjet/arcjet-js/commit/40db7f3340ddf0e820b7b587211969300772314a))
* bump @rollup/plugin-typescript from 11.1.5 to 11.1.6 ([#127](https://github.com/arcjet/arcjet-js/issues/127)) ([8f9e34a](https://github.com/arcjet/arcjet-js/commit/8f9e34abb44d51c0d746081c6c148621f13c73f6))
* Bump `@connectrpc/connect-web` from 1.2.0 to 1.2.1 ([#101](https://github.com/arcjet/arcjet-js/issues/101)) ([28f4a50](https://github.com/arcjet/arcjet-js/commit/28f4a50f4f951cf33c21365ed11d8aa40d5ce0ad))
* Bump `@connectrpc/connect-web` from 1.2.1 to 1.3.0 ([#120](https://github.com/arcjet/arcjet-js/issues/120)) ([289446d](https://github.com/arcjet/arcjet-js/commit/289446d482cc9521572b076d329964bb1ec253cc))
* Bump `@connectrpc/connect` from 1.2.0 to 1.2.1 ([#100](https://github.com/arcjet/arcjet-js/issues/100)) ([74013ef](https://github.com/arcjet/arcjet-js/commit/74013efc4ce7b310d5dc70d11af7df284b12c018))
* Bump `ai` from 2.2.30 to 2.2.31 in /examples/nextjs-14-openai ([#99](https://github.com/arcjet/arcjet-js/issues/99)) ([be8c23b](https://github.com/arcjet/arcjet-js/commit/be8c23bd56db5077263db87266c0476dfd760f3f))
* Bump `eslint-config-turbo` from 1.11.2 to 1.11.3 ([#107](https://github.com/arcjet/arcjet-js/issues/107)) ([b01f418](https://github.com/arcjet/arcjet-js/commit/b01f418f9776761f3af3de1d1af6860e42c6a0c3))
* Bump `openai` from 4.24.1 to 4.24.2 in /examples/nextjs-14-openai ([#121](https://github.com/arcjet/arcjet-js/issues/121)) ([705f871](https://github.com/arcjet/arcjet-js/commit/705f871cf4b5574cc402de6be691fe1f617b310e))
* bump eslint-config-next from 14.0.4 to 14.1.0 ([#147](https://github.com/arcjet/arcjet-js/issues/147)) ([a44b3f6](https://github.com/arcjet/arcjet-js/commit/a44b3f6af47722d37e799a54e5e9b847717b0ed2))
* bump eslint-config-turbo from 1.11.3 to 1.12.3 ([#198](https://github.com/arcjet/arcjet-js/issues/198)) ([4bd458c](https://github.com/arcjet/arcjet-js/commit/4bd458ce52ad16f1bb78c94f2fd49a75b3e5edc0))
* bump next from 14.0.4 to 14.1.0 ([#148](https://github.com/arcjet/arcjet-js/issues/148)) ([6753117](https://github.com/arcjet/arcjet-js/commit/6753117c3f5900513b083fec4ec80e56d0c3de41))
* bump typeid-js from 0.3.0 to 0.5.0 ([#176](https://github.com/arcjet/arcjet-js/issues/176)) ([fadf89f](https://github.com/arcjet/arcjet-js/commit/fadf89ff98b50ac12254c912d0631c01a5d3e279))
* **dev:** bump @edge-runtime/jest-environment from 2.3.7 to 2.3.8 ([#154](https://github.com/arcjet/arcjet-js/issues/154)) ([9c4ed39](https://github.com/arcjet/arcjet-js/commit/9c4ed39bd017e8a0b692e13edfd2d754b549e8aa))
* **dev:** bump @edge-runtime/jest-environment from 2.3.8 to 2.3.9 ([#196](https://github.com/arcjet/arcjet-js/issues/196)) ([8bc0a8f](https://github.com/arcjet/arcjet-js/commit/8bc0a8f995403797a2cb9dbaa56e0ed6062b941f))
* **dev:** bump @rollup/wasm-node from 4.9.1 to 4.9.2 ([#97](https://github.com/arcjet/arcjet-js/issues/97)) ([eff4226](https://github.com/arcjet/arcjet-js/commit/eff4226ad0581dd7c5dff69bd3f259f058679f6e))
* **dev:** bump @rollup/wasm-node from 4.9.2 to 4.9.4 ([#119](https://github.com/arcjet/arcjet-js/issues/119)) ([ec50b96](https://github.com/arcjet/arcjet-js/commit/ec50b96ed3e96735d80a8f556d5a1cd8a68287c5))
* **dev:** bump @rollup/wasm-node from 4.9.4 to 4.9.5 ([#131](https://github.com/arcjet/arcjet-js/issues/131)) ([9fff856](https://github.com/arcjet/arcjet-js/commit/9fff856af1291bd05f7d5b6a02e007f5619e73c9))
* **dev:** bump @rollup/wasm-node from 4.9.5 to 4.9.6 ([#152](https://github.com/arcjet/arcjet-js/issues/152)) ([3e54cff](https://github.com/arcjet/arcjet-js/commit/3e54cffa4419470fdfc52712a34a20b919189fc5))
* **dev:** Bump `@types/react` from 18.2.45 to 18.2.46 ([#96](https://github.com/arcjet/arcjet-js/issues/96)) ([fe666c6](https://github.com/arcjet/arcjet-js/commit/fe666c6985907c95bd3c03b0f636aed14c86b67f))
* **dev:** Bump `@types/react` from 18.2.45 to 18.2.46 in /examples/nextjs-13-pages-wrap ([#94](https://github.com/arcjet/arcjet-js/issues/94)) ([c21a5e6](https://github.com/arcjet/arcjet-js/commit/c21a5e6be4586e976b3420a3a197ea80808e290a))
* **dev:** Bump `@types/react` from 18.2.45 to 18.2.46 in /examples/nextjs-14-app-dir-validate-email ([#93](https://github.com/arcjet/arcjet-js/issues/93)) ([90e1965](https://github.com/arcjet/arcjet-js/commit/90e196535a184b250b473ccac9b55174a787edd5))
* **dev:** Bump `@types/react` from 18.2.45 to 18.2.46 in /examples/nextjs-14-openai ([#98](https://github.com/arcjet/arcjet-js/issues/98)) ([8c63a63](https://github.com/arcjet/arcjet-js/commit/8c63a638d0ab42a29bd079b90afad753adf18a65))
* **dev:** Bump `@types/react` from 18.2.45 to 18.2.46 in /examples/nextjs-14-pages-wrap ([#95](https://github.com/arcjet/arcjet-js/issues/95)) ([3ffec0d](https://github.com/arcjet/arcjet-js/commit/3ffec0df6bc3a216a2808cd5fe9f2fc7dabb8969))
* **dev:** Bump `@types/react` from 18.2.46 to 18.2.47 in /examples/nextjs-13-pages-wrap ([#116](https://github.com/arcjet/arcjet-js/issues/116)) ([1341acc](https://github.com/arcjet/arcjet-js/commit/1341acc157c819d4ad9cf7cd3d790f01445594ae))
* **dev:** Bump `@types/react` from 18.2.46 to 18.2.47 in /examples/nextjs-14-app-dir-rl ([#113](https://github.com/arcjet/arcjet-js/issues/113)) ([7e8ae3c](https://github.com/arcjet/arcjet-js/commit/7e8ae3c8b103a494b814bf5997fecee0f756b758))
* **dev:** Bump `@types/react` from 18.2.46 to 18.2.47 in /examples/nextjs-14-app-dir-validate-email ([#111](https://github.com/arcjet/arcjet-js/issues/111)) ([e160ce1](https://github.com/arcjet/arcjet-js/commit/e160ce181fa768dfc1045b49da42ce9130636bc2))
* **dev:** Bump `@types/react` from 18.2.46 to 18.2.47 in /examples/nextjs-14-openai ([#110](https://github.com/arcjet/arcjet-js/issues/110)) ([410d396](https://github.com/arcjet/arcjet-js/commit/410d39604aa55e1f2d4df0ddb904d03284b8c16d))
* **dev:** Bump `@types/react` from 18.2.46 to 18.2.47 in /examples/nextjs-14-pages-wrap ([#118](https://github.com/arcjet/arcjet-js/issues/118)) ([ab05d24](https://github.com/arcjet/arcjet-js/commit/ab05d24de509067ffe56d6629cc729185c82180e))
* **dev:** Bump `postcss` from 8.4.32 to 8.4.33 in /examples/nextjs-13-pages-wrap ([#103](https://github.com/arcjet/arcjet-js/issues/103)) ([a3cd7f0](https://github.com/arcjet/arcjet-js/commit/a3cd7f094ac52411131a385aae214a859e574e27))
* **dev:** Bump `postcss` from 8.4.32 to 8.4.33 in /examples/nextjs-14-app-dir-rl ([#105](https://github.com/arcjet/arcjet-js/issues/105)) ([e90fc74](https://github.com/arcjet/arcjet-js/commit/e90fc74e6dcc56e3e79cc1e31d9480c97f045d77))
* **dev:** Bump `postcss` from 8.4.32 to 8.4.33 in /examples/nextjs-14-app-dir-validate-email ([#102](https://github.com/arcjet/arcjet-js/issues/102)) ([b0df5a2](https://github.com/arcjet/arcjet-js/commit/b0df5a2a8057375435580463189d6047ccaa65a4))
* **dev:** Bump `postcss` from 8.4.32 to 8.4.33 in /examples/nextjs-14-openai ([#104](https://github.com/arcjet/arcjet-js/issues/104)) ([2192e3e](https://github.com/arcjet/arcjet-js/commit/2192e3ec419e1b7ecd952311bc30972ae493e738))
* **dev:** Bump `postcss` from 8.4.32 to 8.4.33 in /examples/nextjs-14-pages-wrap ([#108](https://github.com/arcjet/arcjet-js/issues/108)) ([916402d](https://github.com/arcjet/arcjet-js/commit/916402dec1eb3628aea08b4e3f77607cbe507307))
* **dev:** Bump `tailwindcss` from 3.4.0 to 3.4.1 in /examples/nextjs-13-pages-wrap ([#115](https://github.com/arcjet/arcjet-js/issues/115)) ([a9472c0](https://github.com/arcjet/arcjet-js/commit/a9472c0c5eaa1f5cf2fe7c0cb09bf6a7d00406e0))
* **dev:** Bump `tailwindcss` from 3.4.0 to 3.4.1 in /examples/nextjs-14-app-dir-rl ([#114](https://github.com/arcjet/arcjet-js/issues/114)) ([5066c6d](https://github.com/arcjet/arcjet-js/commit/5066c6d98be7c596747c3856029be471c4314b4a))
* **dev:** Bump `tailwindcss` from 3.4.0 to 3.4.1 in /examples/nextjs-14-app-dir-validate-email ([#112](https://github.com/arcjet/arcjet-js/issues/112)) ([d8173b3](https://github.com/arcjet/arcjet-js/commit/d8173b349c907ea95c373d20154b82a2f7828395))
* **dev:** Bump `tailwindcss` from 3.4.0 to 3.4.1 in /examples/nextjs-14-openai ([#109](https://github.com/arcjet/arcjet-js/issues/109)) ([e44f829](https://github.com/arcjet/arcjet-js/commit/e44f82944dc5236ce2c2d8b4d8e753b43eaf8afb))
* **dev:** Bump `tailwindcss` from 3.4.0 to 3.4.1 in /examples/nextjs-14-pages-wrap ([#117](https://github.com/arcjet/arcjet-js/issues/117)) ([6b65676](https://github.com/arcjet/arcjet-js/commit/6b6567669053eda67579c98bf1241885ca9ced2e))
* **dev:** bump postcss from 8.4.31 to 8.4.32 in /examples/nextjs-13-pages-wrap ([#87](https://github.com/arcjet/arcjet-js/issues/87)) ([01ac608](https://github.com/arcjet/arcjet-js/commit/01ac60863bbe933a67d48dc540af107afd074817))
* **dev:** bump postcss from 8.4.31 to 8.4.32 in /examples/nextjs-14-app-dir-rl ([#86](https://github.com/arcjet/arcjet-js/issues/86)) ([583f646](https://github.com/arcjet/arcjet-js/commit/583f646f472a3fad63409ca6f0d3966a6c8117db))
* **example:** bump the dependencies group in /examples/nextjs-13-pages-wrap with 1 update ([#135](https://github.com/arcjet/arcjet-js/issues/135)) ([cd67eaf](https://github.com/arcjet/arcjet-js/commit/cd67eaf0889537ec889dd0fb48c7cc2507688ff4))
* **example:** bump the dependencies group in /examples/nextjs-13-pages-wrap with 1 update ([#194](https://github.com/arcjet/arcjet-js/issues/194)) ([a945b2c](https://github.com/arcjet/arcjet-js/commit/a945b2c5c605e9ecf7bd6619bcf5e46ff8b02894))
* **example:** bump the dependencies group in /examples/nextjs-13-pages-wrap with 2 updates ([#185](https://github.com/arcjet/arcjet-js/issues/185)) ([dc7bc47](https://github.com/arcjet/arcjet-js/commit/dc7bc47107424b9a2c56cfc940910f4926d3de2a))
* **example:** Bump the dependencies group in /examples/nextjs-13-pages-wrap with 2 updates ([#210](https://github.com/arcjet/arcjet-js/issues/210)) ([402c2ad](https://github.com/arcjet/arcjet-js/commit/402c2add84c50c7c021725c6288435b3afa74f83))
* **example:** bump the dependencies group in /examples/nextjs-13-pages-wrap with 3 updates ([#169](https://github.com/arcjet/arcjet-js/issues/169)) ([f19680b](https://github.com/arcjet/arcjet-js/commit/f19680b5985a4a44a46b26acbf066a32423bb74f))
* **example:** bump the dependencies group in /examples/nextjs-14-app-dir-rl with 1 update ([#137](https://github.com/arcjet/arcjet-js/issues/137)) ([ab43b86](https://github.com/arcjet/arcjet-js/commit/ab43b86a5b5f4f57558d2b5a6060fa428d04bd53))
* **example:** bump the dependencies group in /examples/nextjs-14-app-dir-rl with 1 update ([#197](https://github.com/arcjet/arcjet-js/issues/197)) ([28a680c](https://github.com/arcjet/arcjet-js/commit/28a680c45b978ae53788ab473d95b967a490d87c))
* **example:** bump the dependencies group in /examples/nextjs-14-app-dir-rl with 2 updates ([#189](https://github.com/arcjet/arcjet-js/issues/189)) ([ab11b6d](https://github.com/arcjet/arcjet-js/commit/ab11b6db573df565237f1d16980fad7ab3df7c63))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-rl with 2 updates ([#207](https://github.com/arcjet/arcjet-js/issues/207)) ([1489fd7](https://github.com/arcjet/arcjet-js/commit/1489fd7a4c7c338438dd85532bf5b35f29787f1a))
* **example:** bump the dependencies group in /examples/nextjs-14-app-dir-rl with 3 updates ([#166](https://github.com/arcjet/arcjet-js/issues/166)) ([b7f4b07](https://github.com/arcjet/arcjet-js/commit/b7f4b07c006f32cb4dc4d0b0d749edcb63ad230d))
* **example:** bump the dependencies group in /examples/nextjs-14-app-dir-validate-email with 1 update ([#134](https://github.com/arcjet/arcjet-js/issues/134)) ([9b6015a](https://github.com/arcjet/arcjet-js/commit/9b6015a9062f0da9c557b43134b16b4115561f37))
* **example:** bump the dependencies group in /examples/nextjs-14-app-dir-validate-email with 1 update ([#200](https://github.com/arcjet/arcjet-js/issues/200)) ([59caff4](https://github.com/arcjet/arcjet-js/commit/59caff490f3f8cee9ca6cfbfcf95ee5c018554e9))
* **example:** bump the dependencies group in /examples/nextjs-14-app-dir-validate-email with 2 updates ([#188](https://github.com/arcjet/arcjet-js/issues/188)) ([9d42276](https://github.com/arcjet/arcjet-js/commit/9d422764508d79f23a5e5a9974963e858b2a8b91))
* **example:** Bump the dependencies group in /examples/nextjs-14-app-dir-validate-email with 2 updates ([#208](https://github.com/arcjet/arcjet-js/issues/208)) ([467b385](https://github.com/arcjet/arcjet-js/commit/467b3851151dc411d40c028eb7a877d7eb578651))
* **example:** bump the dependencies group in /examples/nextjs-14-app-dir-validate-email with 3 updates ([#168](https://github.com/arcjet/arcjet-js/issues/168)) ([8779e2f](https://github.com/arcjet/arcjet-js/commit/8779e2f1b6f250b9f82bbefe7c92cea59a58aaae))
* **example:** Bump the dependencies group in /examples/nextjs-14-openai with 1 update ([#219](https://github.com/arcjet/arcjet-js/issues/219)) ([07952d5](https://github.com/arcjet/arcjet-js/commit/07952d53d8dfec7efc30eee127f0d42e3f1de270))
* **example:** bump the dependencies group in /examples/nextjs-14-openai with 2 updates ([#136](https://github.com/arcjet/arcjet-js/issues/136)) ([e99635b](https://github.com/arcjet/arcjet-js/commit/e99635b3d71a10b6a2cbdda38aaf313986d3d53e))
* **example:** Bump the dependencies group in /examples/nextjs-14-openai with 4 updates ([#209](https://github.com/arcjet/arcjet-js/issues/209)) ([7720a81](https://github.com/arcjet/arcjet-js/commit/7720a819539a467c51a19bd87c3ac0f3e1aa7460))
* **example:** bump the dependencies group in /examples/nextjs-14-openai with 5 updates ([#170](https://github.com/arcjet/arcjet-js/issues/170)) ([b57e8df](https://github.com/arcjet/arcjet-js/commit/b57e8df829fcb3ae6f3becfaba83f4af7a00d1e1))
* **example:** Bump the dependencies group in /examples/nextjs-14-pages-wrap with 1 update ([#133](https://github.com/arcjet/arcjet-js/issues/133)) ([51adb16](https://github.com/arcjet/arcjet-js/commit/51adb1618d6054fe2cdb4c939c9bda5a40915346))
* **example:** bump the dependencies group in /examples/nextjs-14-pages-wrap with 1 update ([#199](https://github.com/arcjet/arcjet-js/issues/199)) ([de36130](https://github.com/arcjet/arcjet-js/commit/de361304dbd64881ab5069569ebadbfdfb73313c))
* **example:** bump the dependencies group in /examples/nextjs-14-pages-wrap with 2 updates ([#187](https://github.com/arcjet/arcjet-js/issues/187)) ([2feef80](https://github.com/arcjet/arcjet-js/commit/2feef80f1042b15bdc778a2dec87ea5296ceeb10))
* **example:** Bump the dependencies group in /examples/nextjs-14-pages-wrap with 2 updates ([#206](https://github.com/arcjet/arcjet-js/issues/206)) ([abc72da](https://github.com/arcjet/arcjet-js/commit/abc72daf1d5bda118006900615bc3f23c905cebc))
* **example:** bump the dependencies group in /examples/nextjs-14-pages-wrap with 3 updates ([#165](https://github.com/arcjet/arcjet-js/issues/165)) ([82f6be5](https://github.com/arcjet/arcjet-js/commit/82f6be5c5bc6fa39475a4e198c750aad4b9e3b50))


### 📝 Documentation

* Add minimum required fields for request details example ([#220](https://github.com/arcjet/arcjet-js/issues/220)) ([83a3a8c](https://github.com/arcjet/arcjet-js/commit/83a3a8c6ddd186ff863545e68fac9b7d66434933))
* Rename AJ_KEY to ARCJET_KEY & switch to next.js app dir example ([#201](https://github.com/arcjet/arcjet-js/issues/201)) ([9c4da7b](https://github.com/arcjet/arcjet-js/commit/9c4da7bc53fe7803046a40531db4976c70cb0449))
* Update Arcjet description ([#122](https://github.com/arcjet/arcjet-js/issues/122)) ([c011bc2](https://github.com/arcjet/arcjet-js/commit/c011bc262159c8f09fadff381ea71f475fed0b16))


### 🧹 Miscellaneous Chores

* Add codeowners to project ([#91](https://github.com/arcjet/arcjet-js/issues/91)) ([a54f487](https://github.com/arcjet/arcjet-js/commit/a54f487fd695b02667af8fbb1f0acc35ec900421))
* Add devcontainer setup ([#124](https://github.com/arcjet/arcjet-js/issues/124)) ([29b1a2e](https://github.com/arcjet/arcjet-js/commit/29b1a2e0351dfd189c9d55303e2d2ba6fe55d4f1))
* **analyze:** Regenerate WebAssembly and bindings ([#92](https://github.com/arcjet/arcjet-js/issues/92)) ([b10ce31](https://github.com/arcjet/arcjet-js/commit/b10ce310c3a0170000c362510e785d81506e5b88))
* Change `ttl` argument to `expiresAt` in cache implementation ([#218](https://github.com/arcjet/arcjet-js/issues/218)) ([0414e10](https://github.com/arcjet/arcjet-js/commit/0414e10509d402571c38029a0cb7f0aedc3693a4))
* **examples:** Added Next.js 14 OpenAI rate limit example ([#88](https://github.com/arcjet/arcjet-js/issues/88)) ([482a472](https://github.com/arcjet/arcjet-js/commit/482a472eda9f95ece0c33cdbe870325a81ba8c2a))
* **examples:** Encourage use of environment variables for keys ([#139](https://github.com/arcjet/arcjet-js/issues/139)) ([290a1b2](https://github.com/arcjet/arcjet-js/commit/290a1b2b7eb0cd42fd7c7b979b6f7f5004cae918))
* **protocol:** Introduce Shield name ([#158](https://github.com/arcjet/arcjet-js/issues/158)) ([311713b](https://github.com/arcjet/arcjet-js/commit/311713b42e0958d7887c5709181522196efd2159))
* Regenerate the protobuf bindings ([#183](https://github.com/arcjet/arcjet-js/issues/183)) ([807e8de](https://github.com/arcjet/arcjet-js/commit/807e8de376d730fbf9e12c537f417fce96e78fea))
* Remove count property on ArcjetRateLimitReason ([#181](https://github.com/arcjet/arcjet-js/issues/181)) ([ff3e310](https://github.com/arcjet/arcjet-js/commit/ff3e310f47c554a27821b9b0f4060084968bd6c4))
* Remove timeout property on ArcjetRateLimitRule ([#182](https://github.com/arcjet/arcjet-js/issues/182)) ([255a4a7](https://github.com/arcjet/arcjet-js/commit/255a4a7636e8e7bb0b274a73d1d1eee90393b74c))
* **rollup:** Externalize all imports that end with `.wasm?module` ([#217](https://github.com/arcjet/arcjet-js/issues/217)) ([ee6f387](https://github.com/arcjet/arcjet-js/commit/ee6f387d517eb78e974a92e7e39f60e7f1d3231c))
* Separate examples from SDK install and builds ([#85](https://github.com/arcjet/arcjet-js/issues/85)) ([c4c57c8](https://github.com/arcjet/arcjet-js/commit/c4c57c89987fdf3682a3b66661c8168eee63afd1))
* **trunk:** Avoid linting the release-please-manifest ([#138](https://github.com/arcjet/arcjet-js/issues/138)) ([ac69f70](https://github.com/arcjet/arcjet-js/commit/ac69f7059e8fb6682ca14da3e6756bc430ad31ee))
* Update trunk versions and configuration ([#125](https://github.com/arcjet/arcjet-js/issues/125)) ([2625ed4](https://github.com/arcjet/arcjet-js/commit/2625ed437ed8ddef7cbd5e106f3d9b7228b0c0da))


### ✅ Continuous Integration

* Add dependabot groups for our example apps ([#123](https://github.com/arcjet/arcjet-js/issues/123)) ([6f28934](https://github.com/arcjet/arcjet-js/commit/6f28934aeaf3db8748dfc4394a9057617ef0d702))
* Add merge queue workflow ([#128](https://github.com/arcjet/arcjet-js/issues/128)) ([4f5fa08](https://github.com/arcjet/arcjet-js/commit/4f5fa08896e4f0b921986f69765effb5feb09785))
* Remove dependabot groups ([#84](https://github.com/arcjet/arcjet-js/issues/84)) ([b2d75c2](https://github.com/arcjet/arcjet-js/commit/b2d75c25bb880fcf78eb8f92156dc601ec650100))

## [1.0.0-alpha.7](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.6...v1.0.0-alpha.7) (2023-12-21)


### ⚠ BREAKING CHANGES

* Reorganize SDK types to tighten helpers around custom props ([#18](https://github.com/arcjet/arcjet-js/issues/18))

### 🪲 Bug Fixes

* Reorganize SDK types to tighten helpers around custom props ([#18](https://github.com/arcjet/arcjet-js/issues/18)) ([3b0c1fb](https://github.com/arcjet/arcjet-js/commit/3b0c1fb5a19f5c6d15a0b83bdd24db0192aa9e49))


### 📦 Dependencies

* **dev:** Bump the dev-dependencies group with 5 updates ([#82](https://github.com/arcjet/arcjet-js/issues/82)) ([a67be47](https://github.com/arcjet/arcjet-js/commit/a67be47b76e623f1aef6687f9dcc87de8eb2f1da))


### ✅ Continuous Integration

* Switch to github token ([#81](https://github.com/arcjet/arcjet-js/issues/81)) ([cfc382a](https://github.com/arcjet/arcjet-js/commit/cfc382a1652358a2e8f1035f6baa78c509f846f4))

## [1.0.0-alpha.6](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.5...v1.0.0-alpha.6) (2023-12-18)


### ⚠ BREAKING CHANGES

* Pass ArcjetContext to rules ([#65](https://github.com/arcjet/arcjet-js/issues/65))

### 🚀 New Features

* Pass ArcjetContext to rules ([#65](https://github.com/arcjet/arcjet-js/issues/65)) ([c043f15](https://github.com/arcjet/arcjet-js/commit/c043f15342ec87a2b15e41ada05f90527daf0879))


### 🪲 Bug Fixes

* **next:** Avoid appending `?` if querystring is empty ([#71](https://github.com/arcjet/arcjet-js/issues/71)) ([16ca958](https://github.com/arcjet/arcjet-js/commit/16ca9583f806a11c23e2378be64fa9b1054feb50))
* **next:** Stop using NextUrl to avoid type conflict across version ([#62](https://github.com/arcjet/arcjet-js/issues/62)) ([294540a](https://github.com/arcjet/arcjet-js/commit/294540abda21dec4c4f054cea796fef9af091247))
* Wrap timeout default ternary so timeout option takes effect ([#66](https://github.com/arcjet/arcjet-js/issues/66)) ([d49ebd2](https://github.com/arcjet/arcjet-js/commit/d49ebd2a5581804b988161f2850e909f414effa3))


### 🧹 Miscellaneous Chores

* Add pre and post logging to remote client ([#70](https://github.com/arcjet/arcjet-js/issues/70)) ([46fd6b3](https://github.com/arcjet/arcjet-js/commit/46fd6b3797fc4ba27e96d7846f22aa67a91e9a5f))
* **deps-dev:** Bump the dev-dependencies group with 2 updates ([#55](https://github.com/arcjet/arcjet-js/issues/55)) ([94839f3](https://github.com/arcjet/arcjet-js/commit/94839f3105ab2be5f1e5cdf02278ca7cc24850c1))
* **deps:** Bump the dependencies group with 2 updates ([#54](https://github.com/arcjet/arcjet-js/issues/54)) ([9c68aa2](https://github.com/arcjet/arcjet-js/commit/9c68aa20b04b037bd8b32755251201188c899d6b))
* Disallow configuring timeout for report ([#67](https://github.com/arcjet/arcjet-js/issues/67)) ([ae8f1b7](https://github.com/arcjet/arcjet-js/commit/ae8f1b7c1814b694cb959c613ccf1e75bcc0158f))
* **examples:** Add Next 13 wrap example ([294540a](https://github.com/arcjet/arcjet-js/commit/294540abda21dec4c4f054cea796fef9af091247))
* **rollup:** Fail compilation on type check failure ([#68](https://github.com/arcjet/arcjet-js/issues/68)) ([b9a373b](https://github.com/arcjet/arcjet-js/commit/b9a373b48833a46fd1a9b5568dac6e6d9a3f5bbd))


### ✅ Continuous Integration

* Setup release workflow ([#74](https://github.com/arcjet/arcjet-js/issues/74)) ([53b5b63](https://github.com/arcjet/arcjet-js/commit/53b5b638b94370e27bb3550a50d36e89f45d261e))
