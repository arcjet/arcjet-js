# Changelog

## [1.0.0-alpha.8](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.7...@arcjet/protocol-v1.0.0-alpha.8) (2024-02-09)


### ⚠ BREAKING CHANGES

* Handle TTL as seconds instead of milliseconds ([#211](https://github.com/arcjet/arcjet-js/issues/211))
* Add fixedWindow, tokenBucket, and slidingWindow primitives ([#184](https://github.com/arcjet/arcjet-js/issues/184))
* Remove timeout property on ArcjetRateLimitRule ([#182](https://github.com/arcjet/arcjet-js/issues/182))
* Remove count property on ArcjetRateLimitReason ([#181](https://github.com/arcjet/arcjet-js/issues/181))
* Build extra field from unknown request properties ([#179](https://github.com/arcjet/arcjet-js/issues/179))
* **protocol:** Introduce Shield name ([#158](https://github.com/arcjet/arcjet-js/issues/158))

### 🚀 New Features

* Add fixedWindow, tokenBucket, and slidingWindow primitives ([#184](https://github.com/arcjet/arcjet-js/issues/184)) ([6701b02](https://github.com/arcjet/arcjet-js/commit/6701b02e8425c25953f103add46d7e850aa7d0b4))
* Build extra field from unknown request properties ([#179](https://github.com/arcjet/arcjet-js/issues/179)) ([2576341](https://github.com/arcjet/arcjet-js/commit/257634154328a96d47969a58b389c0e9aacf59bc))
* Support cookies and query via the protocol ([#214](https://github.com/arcjet/arcjet-js/issues/214)) ([ca0cd64](https://github.com/arcjet/arcjet-js/commit/ca0cd64ca2576eeec7f44dfe7e4f413427d5eea2))
* Support duration strings or integers on rate limit configuration ([#192](https://github.com/arcjet/arcjet-js/issues/192)) ([b173d83](https://github.com/arcjet/arcjet-js/commit/b173d83bb5c80c78fd5c08dfa2aae5885d099620))


### 🪲 Bug Fixes

* Handle TTL as seconds instead of milliseconds ([#211](https://github.com/arcjet/arcjet-js/issues/211)) ([c2d3dd0](https://github.com/arcjet/arcjet-js/commit/c2d3dd095affee68bb661f90d1195f114baa4017))


### 📦 Dependencies

* bump @bufbuild/protobuf from 1.6.0 to 1.7.2 ([#167](https://github.com/arcjet/arcjet-js/issues/167)) ([c7dbdba](https://github.com/arcjet/arcjet-js/commit/c7dbdba85e57be93a816064ed56dadccd18e24af))
* bump @connectrpc/connect from 1.2.1 to 1.3.0 ([#126](https://github.com/arcjet/arcjet-js/issues/126)) ([40db7f3](https://github.com/arcjet/arcjet-js/commit/40db7f3340ddf0e820b7b587211969300772314a))
* Bump `@connectrpc/connect` from 1.2.0 to 1.2.1 ([#100](https://github.com/arcjet/arcjet-js/issues/100)) ([74013ef](https://github.com/arcjet/arcjet-js/commit/74013efc4ce7b310d5dc70d11af7df284b12c018))
* bump typeid-js from 0.3.0 to 0.5.0 ([#176](https://github.com/arcjet/arcjet-js/issues/176)) ([fadf89f](https://github.com/arcjet/arcjet-js/commit/fadf89ff98b50ac12254c912d0631c01a5d3e279))
* **dev:** bump @rollup/wasm-node from 4.9.1 to 4.9.2 ([#97](https://github.com/arcjet/arcjet-js/issues/97)) ([eff4226](https://github.com/arcjet/arcjet-js/commit/eff4226ad0581dd7c5dff69bd3f259f058679f6e))
* **dev:** bump @rollup/wasm-node from 4.9.2 to 4.9.4 ([#119](https://github.com/arcjet/arcjet-js/issues/119)) ([ec50b96](https://github.com/arcjet/arcjet-js/commit/ec50b96ed3e96735d80a8f556d5a1cd8a68287c5))
* **dev:** bump @rollup/wasm-node from 4.9.4 to 4.9.5 ([#131](https://github.com/arcjet/arcjet-js/issues/131)) ([9fff856](https://github.com/arcjet/arcjet-js/commit/9fff856af1291bd05f7d5b6a02e007f5619e73c9))
* **dev:** bump @rollup/wasm-node from 4.9.5 to 4.9.6 ([#152](https://github.com/arcjet/arcjet-js/issues/152)) ([3e54cff](https://github.com/arcjet/arcjet-js/commit/3e54cffa4419470fdfc52712a34a20b919189fc5))


### 🧹 Miscellaneous Chores

* **protocol:** Introduce Shield name ([#158](https://github.com/arcjet/arcjet-js/issues/158)) ([311713b](https://github.com/arcjet/arcjet-js/commit/311713b42e0958d7887c5709181522196efd2159))
* Regenerate the protobuf bindings ([#183](https://github.com/arcjet/arcjet-js/issues/183)) ([807e8de](https://github.com/arcjet/arcjet-js/commit/807e8de376d730fbf9e12c537f417fce96e78fea))
* Remove count property on ArcjetRateLimitReason ([#181](https://github.com/arcjet/arcjet-js/issues/181)) ([ff3e310](https://github.com/arcjet/arcjet-js/commit/ff3e310f47c554a27821b9b0f4060084968bd6c4))
* Remove timeout property on ArcjetRateLimitRule ([#182](https://github.com/arcjet/arcjet-js/issues/182)) ([255a4a7](https://github.com/arcjet/arcjet-js/commit/255a4a7636e8e7bb0b274a73d1d1eee90393b74c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/logger bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8
    * @arcjet/rollup-config bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8
    * @arcjet/tsconfig bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8

## [1.0.0-alpha.7](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.6...@arcjet/protocol-v1.0.0-alpha.7) (2023-12-21)


### 📦 Dependencies

* **dev:** Bump the dev-dependencies group with 5 updates ([#82](https://github.com/arcjet/arcjet-js/issues/82)) ([a67be47](https://github.com/arcjet/arcjet-js/commit/a67be47b76e623f1aef6687f9dcc87de8eb2f1da))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/logger bumped from 1.0.0-alpha.6 to 1.0.0-alpha.7
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.6 to 1.0.0-alpha.7
    * @arcjet/rollup-config bumped from 1.0.0-alpha.6 to 1.0.0-alpha.7
    * @arcjet/tsconfig bumped from 1.0.0-alpha.6 to 1.0.0-alpha.7

## [1.0.0-alpha.6](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.5...@arcjet/protocol-v1.0.0-alpha.6) (2023-12-18)


### ⚠ BREAKING CHANGES

* Pass ArcjetContext to rules ([#65](https://github.com/arcjet/arcjet-js/issues/65))

### 🚀 New Features

* Pass ArcjetContext to rules ([#65](https://github.com/arcjet/arcjet-js/issues/65)) ([c043f15](https://github.com/arcjet/arcjet-js/commit/c043f15342ec87a2b15e41ada05f90527daf0879))


### 🧹 Miscellaneous Chores

* **deps-dev:** Bump the dev-dependencies group with 2 updates ([#55](https://github.com/arcjet/arcjet-js/issues/55)) ([94839f3](https://github.com/arcjet/arcjet-js/commit/94839f3105ab2be5f1e5cdf02278ca7cc24850c1))
* **deps:** Bump the dependencies group with 2 updates ([#54](https://github.com/arcjet/arcjet-js/issues/54)) ([9c68aa2](https://github.com/arcjet/arcjet-js/commit/9c68aa20b04b037bd8b32755251201188c899d6b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/logger bumped from 1.0.0-alpha.5 to 1.0.0-alpha.6
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.5 to 1.0.0-alpha.6
    * @arcjet/rollup-config bumped from 1.0.0-alpha.5 to 1.0.0-alpha.6
    * @arcjet/tsconfig bumped from 1.0.0-alpha.5 to 1.0.0-alpha.6
