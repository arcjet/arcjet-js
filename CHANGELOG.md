# Changelog

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
