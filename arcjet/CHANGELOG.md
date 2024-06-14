# Changelog

## [1.0.0-alpha.16](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.15...arcjet-v1.0.0-alpha.16) (2024-06-14)


### 🪲 Bug Fixes

* Ensure withRule always contains previous rules in the same chain ([#981](https://github.com/arcjet/arcjet-js/issues/981)) ([2ee6581](https://github.com/arcjet/arcjet-js/commit/2ee658188c8b423988c8e549f219c545103412d0))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/duration bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/headers bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/protocol bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/runtime bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/rollup-config bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/tsconfig bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16

## [1.0.0-alpha.15](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.14...arcjet-v1.0.0-alpha.15) (2024-06-12)


### ⚠ BREAKING CHANGES

* Remove rateLimit alias for fixedWindow rule ([#964](https://github.com/arcjet/arcjet-js/issues/964))
* Remove logger dependency from core ([#929](https://github.com/arcjet/arcjet-js/issues/929))
* Move client into protocol and rename builders in adapters ([#932](https://github.com/arcjet/arcjet-js/issues/932))
* Freeze the ArcjetContext before using it ([#934](https://github.com/arcjet/arcjet-js/issues/934))

### 🧹 Miscellaneous Chores

* Freeze the ArcjetContext before using it ([#934](https://github.com/arcjet/arcjet-js/issues/934)) ([6720504](https://github.com/arcjet/arcjet-js/commit/672050415e4c73027be44238abbd9c7312519978))
* Move client into protocol and rename builders in adapters ([#932](https://github.com/arcjet/arcjet-js/issues/932)) ([ea1c2b2](https://github.com/arcjet/arcjet-js/commit/ea1c2b25d146be10056cbc616180abeac75f9a01))
* Remove logger dependency from core ([#929](https://github.com/arcjet/arcjet-js/issues/929)) ([8c15961](https://github.com/arcjet/arcjet-js/commit/8c15961dfbb7f193f93a5036b26f181fc2ae7ec7))
* Remove rateLimit alias for fixedWindow rule ([#964](https://github.com/arcjet/arcjet-js/issues/964)) ([320d67c](https://github.com/arcjet/arcjet-js/commit/320d67c8c45ac381811615a10c86286057192291))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/duration bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/headers bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/protocol bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/runtime bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/rollup-config bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/tsconfig bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15

## [1.0.0-alpha.14](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.13...arcjet-v1.0.0-alpha.14) (2024-06-10)


### ⚠ BREAKING CHANGES

* Move all environment lookup into separate package ([#897](https://github.com/arcjet/arcjet-js/issues/897))
* **logger:** Align logger with Pino API ([#858](https://github.com/arcjet/arcjet-js/issues/858))
* Create runtime package and remove from SDK ([#871](https://github.com/arcjet/arcjet-js/issues/871))
* Allow ArcjetContext extension via new argument to core `protect()` ([#841](https://github.com/arcjet/arcjet-js/issues/841))
* Separate `@arcjet/headers` package from core ([#824](https://github.com/arcjet/arcjet-js/issues/824))

### 🚀 New Features

* Allow ArcjetContext extension via new argument to core `protect()` ([#841](https://github.com/arcjet/arcjet-js/issues/841)) ([96bbe94](https://github.com/arcjet/arcjet-js/commit/96bbe941b2f1613bc870e8f6073db919c1f41a7e))
* Create runtime package and remove from SDK ([#871](https://github.com/arcjet/arcjet-js/issues/871)) ([4e9e216](https://github.com/arcjet/arcjet-js/commit/4e9e2169e587ab010ff587a915ae8e1416c9b8f5))
* **logger:** Align logger with Pino API ([#858](https://github.com/arcjet/arcjet-js/issues/858)) ([1806b94](https://github.com/arcjet/arcjet-js/commit/1806b94d7f7d0a7fd052e3121892d4dc1fdb719b)), closes [#822](https://github.com/arcjet/arcjet-js/issues/822) [#855](https://github.com/arcjet/arcjet-js/issues/855)
* Move all environment lookup into separate package ([#897](https://github.com/arcjet/arcjet-js/issues/897)) ([a5bb8ca](https://github.com/arcjet/arcjet-js/commit/a5bb8ca6bad9d831b3f67f12b3ef87048ced25bb))
* Separate `@arcjet/headers` package from core ([#824](https://github.com/arcjet/arcjet-js/issues/824)) ([c8364f4](https://github.com/arcjet/arcjet-js/commit/c8364f464b99b5b66749ea776e29c728257a2d74))


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.17.2 to 4.18.0 ([#803](https://github.com/arcjet/arcjet-js/issues/803)) ([e6321af](https://github.com/arcjet/arcjet-js/commit/e6321afbad7127442d78b9c760c0e4c1ef73a77c))


### 📝 Documentation

* Add quick start links & update Bun example ([#870](https://github.com/arcjet/arcjet-js/issues/870)) ([ee3079f](https://github.com/arcjet/arcjet-js/commit/ee3079f21484ed3b5cf67ae03a45cb9d07b3d911))
* Remove wording that implies is Shield is added by default ([#796](https://github.com/arcjet/arcjet-js/issues/796)) ([a85d18c](https://github.com/arcjet/arcjet-js/commit/a85d18ca6f6da589cfad58d3167b1c8a4b1edc55))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/duration bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/headers bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/logger bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/protocol bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/runtime bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/rollup-config bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/tsconfig bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14

## [1.0.0-alpha.13](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.12...arcjet-v1.0.0-alpha.13) (2024-05-20)


### ⚠ BREAKING CHANGES

* **eslint-config:** Update linting rules ([#774](https://github.com/arcjet/arcjet-js/issues/774))

### 🚀 New Features

* Filter cookie headers when normalizing with ArcjetHeaders ([#773](https://github.com/arcjet/arcjet-js/issues/773)) ([99b3e1f](https://github.com/arcjet/arcjet-js/commit/99b3e1fd1f104824642817e2f22bc78d308e2fb1))


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.14.3 to 4.17.2 ([#708](https://github.com/arcjet/arcjet-js/issues/708)) ([6e548bf](https://github.com/arcjet/arcjet-js/commit/6e548bf30743d06615dc9a0b46b3cbdabd6a89e4))


### 🧹 Miscellaneous Chores

* **eslint-config:** Update linting rules ([#774](https://github.com/arcjet/arcjet-js/issues/774)) ([c223ba0](https://github.com/arcjet/arcjet-js/commit/c223ba061f27c786159fb6224341d162ef15bf0f)), closes [#337](https://github.com/arcjet/arcjet-js/issues/337)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
    * @arcjet/duration bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
    * @arcjet/logger bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
    * @arcjet/protocol bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
    * @arcjet/rollup-config bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
    * @arcjet/tsconfig bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13

## [1.0.0-alpha.12](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.11...arcjet-v1.0.0-alpha.12) (2024-04-18)


### ⚠ BREAKING CHANGES

* Deprecate calling `protect()` with no rules ([#608](https://github.com/arcjet/arcjet-js/issues/608))

### 🚀 New Features

* Add configurable shield rule ([#609](https://github.com/arcjet/arcjet-js/issues/609)) ([a5717a1](https://github.com/arcjet/arcjet-js/commit/a5717a1183945d0cf1b06450b813fcd154a367a3)), closes [#606](https://github.com/arcjet/arcjet-js/issues/606)
* Add urls for Arcjet fly.io deployments ([#554](https://github.com/arcjet/arcjet-js/issues/554)) ([27d946b](https://github.com/arcjet/arcjet-js/commit/27d946b1f4adf00ab2c3ac931381d003771758df))


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.14.1 to 4.14.3 ([#597](https://github.com/arcjet/arcjet-js/issues/597)) ([598adf0](https://github.com/arcjet/arcjet-js/commit/598adf0b3d61b9e9bce046c7c3e8ddef2802a37c))
* **dev:** Bump typescript from 5.4.4 to 5.4.5 ([#557](https://github.com/arcjet/arcjet-js/issues/557)) ([16af391](https://github.com/arcjet/arcjet-js/commit/16af3914d66f05eb3b0d79a9623d2c5ade52bddd))


### 🧹 Miscellaneous Chores

* Deprecate calling `protect()` with no rules ([#608](https://github.com/arcjet/arcjet-js/issues/608)) ([57a8f6b](https://github.com/arcjet/arcjet-js/commit/57a8f6ba933b769cf7531f27ca36c08ecf74ea80))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12
    * @arcjet/duration bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12
    * @arcjet/logger bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12
    * @arcjet/protocol bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12
    * @arcjet/rollup-config bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12
    * @arcjet/tsconfig bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12

## [1.0.0-alpha.11](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.10...arcjet-v1.0.0-alpha.11) (2024-04-08)


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.13.0 to 4.13.2 ([#472](https://github.com/arcjet/arcjet-js/issues/472)) ([0268e51](https://github.com/arcjet/arcjet-js/commit/0268e51eb8967b2379014c1d16c65d1fbca13186))
* **dev:** Bump @rollup/wasm-node from 4.13.2 to 4.14.0 ([#493](https://github.com/arcjet/arcjet-js/issues/493)) ([ac14f3f](https://github.com/arcjet/arcjet-js/commit/ac14f3fb12157f9b2306ce2e703f80c081dcd9bc))
* **dev:** Bump @rollup/wasm-node from 4.14.0 to 4.14.1 ([#519](https://github.com/arcjet/arcjet-js/issues/519)) ([f859c0e](https://github.com/arcjet/arcjet-js/commit/f859c0eb071fcd83c68c8c94b60071217a600b3a))
* **dev:** Bump typescript from 5.4.2 to 5.4.3 ([#412](https://github.com/arcjet/arcjet-js/issues/412)) ([a69b76b](https://github.com/arcjet/arcjet-js/commit/a69b76b011a58bad21dc0763661927003c6b2a2e))
* **dev:** Bump typescript from 5.4.3 to 5.4.4 ([#509](https://github.com/arcjet/arcjet-js/issues/509)) ([8976fb1](https://github.com/arcjet/arcjet-js/commit/8976fb1b49f06b50b2a1d52b8a4619548993c737))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11
    * @arcjet/duration bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11
    * @arcjet/logger bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11
    * @arcjet/protocol bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11
    * @arcjet/rollup-config bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11
    * @arcjet/tsconfig bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11

## [1.0.0-alpha.10](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.9...arcjet-v1.0.0-alpha.10) (2024-03-13)


### 🚀 New Features

* **analyze:** Replace wasm-bindgen with jco generated bindings ([#334](https://github.com/arcjet/arcjet-js/issues/334)) ([48359ff](https://github.com/arcjet/arcjet-js/commit/48359ff986cc0ff4888fc2df6a89e9b6f9a5b697))


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.12.0 to 4.12.1 ([#320](https://github.com/arcjet/arcjet-js/issues/320)) ([7f07a8f](https://github.com/arcjet/arcjet-js/commit/7f07a8f78e2f2bf67ab0eba032eeb311704c4eee))
* **dev:** Bump @rollup/wasm-node from 4.12.1 to 4.13.0 ([#359](https://github.com/arcjet/arcjet-js/issues/359)) ([8658316](https://github.com/arcjet/arcjet-js/commit/8658316b252f9224069d5c11b8fc6acb6681c90e))
* **dev:** Bump typescript from 5.3.3 to 5.4.2 ([#321](https://github.com/arcjet/arcjet-js/issues/321)) ([e0c2914](https://github.com/arcjet/arcjet-js/commit/e0c2914ab868d4a3e571c959f4b00284bbbc3050))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10
    * @arcjet/duration bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10
    * @arcjet/logger bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10
    * @arcjet/protocol bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10
    * @arcjet/rollup-config bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10
    * @arcjet/tsconfig bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10

## [1.0.0-alpha.9](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.8...arcjet-v1.0.0-alpha.9) (2024-03-04)


### ⚠ BREAKING CHANGES

* Remove logger from context and leverage singleton logger instead ([#260](https://github.com/arcjet/arcjet-js/issues/260))
* Separate ArcjetRequest and ArcjetRequestDetails types to accept record of headers ([#228](https://github.com/arcjet/arcjet-js/issues/228))

### 🚀 New Features

* Add `withRule` API for adding adhoc rules ([#245](https://github.com/arcjet/arcjet-js/issues/245)) ([f8ebbdc](https://github.com/arcjet/arcjet-js/commit/f8ebbdc7198010c4aa942255a76e65537c73f807)), closes [#193](https://github.com/arcjet/arcjet-js/issues/193)
* Add decorate package to set rate limit headers ([#247](https://github.com/arcjet/arcjet-js/issues/247)) ([232750d](https://github.com/arcjet/arcjet-js/commit/232750df8cf99378407e9c88e9d64d4b7a9410a4))
* Separate ArcjetRequest and ArcjetRequestDetails types to accept record of headers ([#228](https://github.com/arcjet/arcjet-js/issues/228)) ([4950364](https://github.com/arcjet/arcjet-js/commit/4950364be1f895fc8bb782950b20623fc8324ceb)), closes [#33](https://github.com/arcjet/arcjet-js/issues/33)


### 📦 Dependencies

* **dev:** Bump @edge-runtime/jest-environment from 2.3.9 to 2.3.10 ([#229](https://github.com/arcjet/arcjet-js/issues/229)) ([6f3a070](https://github.com/arcjet/arcjet-js/commit/6f3a0706ccd7cc9c3fd80f554b4229f4b11767cb))
* **dev:** Bump @rollup/wasm-node from 4.10.0 to 4.12.0 ([#235](https://github.com/arcjet/arcjet-js/issues/235)) ([cf7ffc2](https://github.com/arcjet/arcjet-js/commit/cf7ffc2ae35d75884a04c88818f8c780ca7af223))
* **dev:** Bump @rollup/wasm-node from 4.9.6 to 4.10.0 ([#223](https://github.com/arcjet/arcjet-js/issues/223)) ([47c24b4](https://github.com/arcjet/arcjet-js/commit/47c24b40a8419f1dabcf8607c90dfcb97f6a4195))


### 📝 Documentation

* Update HTTP version ([#227](https://github.com/arcjet/arcjet-js/issues/227)) ([c102c64](https://github.com/arcjet/arcjet-js/commit/c102c64246020cfa247327fe646c62e36a43a62f))


### 🧹 Miscellaneous Chores

* Add bugs and author info & update readme ([#254](https://github.com/arcjet/arcjet-js/issues/254)) ([9b0d2fc](https://github.com/arcjet/arcjet-js/commit/9b0d2fc674fdc1ddf9952b9a2ef3f5f3c860d41a))
* Remove logger from context and leverage singleton logger instead ([#260](https://github.com/arcjet/arcjet-js/issues/260)) ([c93a2e1](https://github.com/arcjet/arcjet-js/commit/c93a2e11d550651ddbc3d9256facba59d4d4d965))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9
    * @arcjet/duration bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9
    * @arcjet/logger bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9
    * @arcjet/protocol bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9
    * @arcjet/rollup-config bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9
    * @arcjet/tsconfig bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9

## [1.0.0-alpha.8](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.7...arcjet-v1.0.0-alpha.8) (2024-02-09)


### ⚠ BREAKING CHANGES

* Handle TTL as seconds instead of milliseconds ([#211](https://github.com/arcjet/arcjet-js/issues/211))
* Add fixedWindow, tokenBucket, and slidingWindow primitives ([#184](https://github.com/arcjet/arcjet-js/issues/184))
* Remove timeout property on ArcjetRateLimitRule ([#182](https://github.com/arcjet/arcjet-js/issues/182))
* Remove count property on ArcjetRateLimitReason ([#181](https://github.com/arcjet/arcjet-js/issues/181))
* Required of props should always be required ([#180](https://github.com/arcjet/arcjet-js/issues/180))
* Build extra field from unknown request properties ([#179](https://github.com/arcjet/arcjet-js/issues/179))
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

* **dev:** bump @edge-runtime/jest-environment from 2.3.7 to 2.3.8 ([#154](https://github.com/arcjet/arcjet-js/issues/154)) ([9c4ed39](https://github.com/arcjet/arcjet-js/commit/9c4ed39bd017e8a0b692e13edfd2d754b549e8aa))
* **dev:** bump @edge-runtime/jest-environment from 2.3.8 to 2.3.9 ([#196](https://github.com/arcjet/arcjet-js/issues/196)) ([8bc0a8f](https://github.com/arcjet/arcjet-js/commit/8bc0a8f995403797a2cb9dbaa56e0ed6062b941f))
* **dev:** bump @rollup/wasm-node from 4.9.1 to 4.9.2 ([#97](https://github.com/arcjet/arcjet-js/issues/97)) ([eff4226](https://github.com/arcjet/arcjet-js/commit/eff4226ad0581dd7c5dff69bd3f259f058679f6e))
* **dev:** bump @rollup/wasm-node from 4.9.2 to 4.9.4 ([#119](https://github.com/arcjet/arcjet-js/issues/119)) ([ec50b96](https://github.com/arcjet/arcjet-js/commit/ec50b96ed3e96735d80a8f556d5a1cd8a68287c5))
* **dev:** bump @rollup/wasm-node from 4.9.4 to 4.9.5 ([#131](https://github.com/arcjet/arcjet-js/issues/131)) ([9fff856](https://github.com/arcjet/arcjet-js/commit/9fff856af1291bd05f7d5b6a02e007f5619e73c9))
* **dev:** bump @rollup/wasm-node from 4.9.5 to 4.9.6 ([#152](https://github.com/arcjet/arcjet-js/issues/152)) ([3e54cff](https://github.com/arcjet/arcjet-js/commit/3e54cffa4419470fdfc52712a34a20b919189fc5))


### 📝 Documentation

* Add minimum required fields for request details example ([#220](https://github.com/arcjet/arcjet-js/issues/220)) ([83a3a8c](https://github.com/arcjet/arcjet-js/commit/83a3a8c6ddd186ff863545e68fac9b7d66434933))
* Rename AJ_KEY to ARCJET_KEY & switch to next.js app dir example ([#201](https://github.com/arcjet/arcjet-js/issues/201)) ([9c4da7b](https://github.com/arcjet/arcjet-js/commit/9c4da7bc53fe7803046a40531db4976c70cb0449))
* Update Arcjet description ([#122](https://github.com/arcjet/arcjet-js/issues/122)) ([c011bc2](https://github.com/arcjet/arcjet-js/commit/c011bc262159c8f09fadff381ea71f475fed0b16))


### 🧹 Miscellaneous Chores

* Change `ttl` argument to `expiresAt` in cache implementation ([#218](https://github.com/arcjet/arcjet-js/issues/218)) ([0414e10](https://github.com/arcjet/arcjet-js/commit/0414e10509d402571c38029a0cb7f0aedc3693a4))
* **examples:** Encourage use of environment variables for keys ([#139](https://github.com/arcjet/arcjet-js/issues/139)) ([290a1b2](https://github.com/arcjet/arcjet-js/commit/290a1b2b7eb0cd42fd7c7b979b6f7f5004cae918))
* Remove count property on ArcjetRateLimitReason ([#181](https://github.com/arcjet/arcjet-js/issues/181)) ([ff3e310](https://github.com/arcjet/arcjet-js/commit/ff3e310f47c554a27821b9b0f4060084968bd6c4))
* Remove timeout property on ArcjetRateLimitRule ([#182](https://github.com/arcjet/arcjet-js/issues/182)) ([255a4a7](https://github.com/arcjet/arcjet-js/commit/255a4a7636e8e7bb0b274a73d1d1eee90393b74c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8
    * @arcjet/duration bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8
    * @arcjet/logger bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8
    * @arcjet/protocol bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8
    * @arcjet/rollup-config bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8
    * @arcjet/tsconfig bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8

## [1.0.0-alpha.7](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.6...arcjet-v1.0.0-alpha.7) (2023-12-21)


### ⚠ BREAKING CHANGES

* Reorganize SDK types to tighten helpers around custom props ([#18](https://github.com/arcjet/arcjet-js/issues/18))

### 🪲 Bug Fixes

* Reorganize SDK types to tighten helpers around custom props ([#18](https://github.com/arcjet/arcjet-js/issues/18)) ([3b0c1fb](https://github.com/arcjet/arcjet-js/commit/3b0c1fb5a19f5c6d15a0b83bdd24db0192aa9e49))


### 📦 Dependencies

* **dev:** Bump the dev-dependencies group with 5 updates ([#82](https://github.com/arcjet/arcjet-js/issues/82)) ([a67be47](https://github.com/arcjet/arcjet-js/commit/a67be47b76e623f1aef6687f9dcc87de8eb2f1da))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.6 to 1.0.0-alpha.7
    * @arcjet/logger bumped from 1.0.0-alpha.6 to 1.0.0-alpha.7
    * @arcjet/protocol bumped from 1.0.0-alpha.6 to 1.0.0-alpha.7
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.6 to 1.0.0-alpha.7
    * @arcjet/rollup-config bumped from 1.0.0-alpha.6 to 1.0.0-alpha.7
    * @arcjet/tsconfig bumped from 1.0.0-alpha.6 to 1.0.0-alpha.7

## [1.0.0-alpha.6](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.5...arcjet-v1.0.0-alpha.6) (2023-12-18)


### ⚠ BREAKING CHANGES

* Pass ArcjetContext to rules ([#65](https://github.com/arcjet/arcjet-js/issues/65))

### 🚀 New Features

* Pass ArcjetContext to rules ([#65](https://github.com/arcjet/arcjet-js/issues/65)) ([c043f15](https://github.com/arcjet/arcjet-js/commit/c043f15342ec87a2b15e41ada05f90527daf0879))


### 🪲 Bug Fixes

* Wrap timeout default ternary so timeout option takes effect ([#66](https://github.com/arcjet/arcjet-js/issues/66)) ([d49ebd2](https://github.com/arcjet/arcjet-js/commit/d49ebd2a5581804b988161f2850e909f414effa3))


### 🧹 Miscellaneous Chores

* Add pre and post logging to remote client ([#70](https://github.com/arcjet/arcjet-js/issues/70)) ([46fd6b3](https://github.com/arcjet/arcjet-js/commit/46fd6b3797fc4ba27e96d7846f22aa67a91e9a5f))
* **deps-dev:** Bump the dev-dependencies group with 2 updates ([#55](https://github.com/arcjet/arcjet-js/issues/55)) ([94839f3](https://github.com/arcjet/arcjet-js/commit/94839f3105ab2be5f1e5cdf02278ca7cc24850c1))
* Disallow configuring timeout for report ([#67](https://github.com/arcjet/arcjet-js/issues/67)) ([ae8f1b7](https://github.com/arcjet/arcjet-js/commit/ae8f1b7c1814b694cb959c613ccf1e75bcc0158f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.5 to 1.0.0-alpha.6
    * @arcjet/logger bumped from 1.0.0-alpha.5 to 1.0.0-alpha.6
    * @arcjet/protocol bumped from 1.0.0-alpha.5 to 1.0.0-alpha.6
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.5 to 1.0.0-alpha.6
    * @arcjet/rollup-config bumped from 1.0.0-alpha.5 to 1.0.0-alpha.6
    * @arcjet/tsconfig bumped from 1.0.0-alpha.5 to 1.0.0-alpha.6
