# Changelog

## [1.0.0-alpha.19](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.18...@arcjet/bun-v1.0.0-alpha.19) (2024-07-15)


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.18.0 to 4.18.1 ([#1092](https://github.com/arcjet/arcjet-js/issues/1092)) ([ffc298a](https://github.com/arcjet/arcjet-js/commit/ffc298ad030721519af02c6c2da26fd2bd3fbdbd))
* **dev:** Bump bun-types from 1.1.17 to 1.1.18 ([#1080](https://github.com/arcjet/arcjet-js/issues/1080)) ([6bb3483](https://github.com/arcjet/arcjet-js/commit/6bb34832c80ec0ef1403e6836de693a1ff91973b))
* **dev:** bump bun-types from 1.1.18 to 1.1.20 ([#1118](https://github.com/arcjet/arcjet-js/issues/1118)) ([dbf3826](https://github.com/arcjet/arcjet-js/commit/dbf3826f68af03d5ae06c0302b1894e4facec9d6))
* **dev:** Bump typescript from 5.5.2 to 5.5.3 ([#1065](https://github.com/arcjet/arcjet-js/issues/1065)) ([ef05395](https://github.com/arcjet/arcjet-js/commit/ef053953cf4a6cba621b778cba2e0dd4e114b626))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * @arcjet/headers bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * @arcjet/ip bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * @arcjet/logger bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * @arcjet/protocol bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * arcjet bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * @arcjet/rollup-config bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * @arcjet/tsconfig bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19

## [1.0.0-alpha.18](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.17...@arcjet/bun-v1.0.0-alpha.18) (2024-07-01)


### 🪲 Bug Fixes

* **env:** Always rely on isDevelopment & remove isProduction helper ([#998](https://github.com/arcjet/arcjet-js/issues/998)) ([43423c6](https://github.com/arcjet/arcjet-js/commit/43423c650cb5b6f2e992af961faad52a4fcdd24f))
* **sdk:** Inform type signature of protect via global characteristics ([#1043](https://github.com/arcjet/arcjet-js/issues/1043)) ([1ae4a89](https://github.com/arcjet/arcjet-js/commit/1ae4a89637c02dffd7801becdf519ce4f911dc6d)), closes [#1042](https://github.com/arcjet/arcjet-js/issues/1042)


### 📦 Dependencies

* **dev:** Bump bun-types from 1.1.13 to 1.1.17 ([#1022](https://github.com/arcjet/arcjet-js/issues/1022)) ([3aa7181](https://github.com/arcjet/arcjet-js/commit/3aa718110537a5c26a267b4db2b57c5b50af6bf2))
* **dev:** Bump typescript from 5.4.5 to 5.5.2 ([#1011](https://github.com/arcjet/arcjet-js/issues/1011)) ([c17a101](https://github.com/arcjet/arcjet-js/commit/c17a101c5729db44ddf8a7e14d5e4184dcf38949))


### 🧹 Miscellaneous Chores

* Warn when IP is empty, even if we override it in development ([#1000](https://github.com/arcjet/arcjet-js/issues/1000)) ([da14bcb](https://github.com/arcjet/arcjet-js/commit/da14bcb67f3bd5ffff9cc17bdbac4d2217a1bf36)), closes [#987](https://github.com/arcjet/arcjet-js/issues/987) [#216](https://github.com/arcjet/arcjet-js/issues/216)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * @arcjet/headers bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * @arcjet/ip bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * @arcjet/logger bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * @arcjet/protocol bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * arcjet bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * @arcjet/rollup-config bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * @arcjet/tsconfig bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18

## [1.0.0-alpha.17](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.16...@arcjet/bun-v1.0.0-alpha.17) (2024-06-17)


### 🧹 Miscellaneous Chores

* **@arcjet/bun:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * @arcjet/headers bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * @arcjet/ip bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * @arcjet/logger bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * @arcjet/protocol bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * arcjet bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * @arcjet/rollup-config bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * @arcjet/tsconfig bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17

## [1.0.0-alpha.16](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.15...@arcjet/bun-v1.0.0-alpha.16) (2024-06-14)


### 🧹 Miscellaneous Chores

* **@arcjet/bun:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/headers bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/ip bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/logger bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/protocol bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * arcjet bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/rollup-config bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/tsconfig bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16

## [1.0.0-alpha.15](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.14...@arcjet/bun-v1.0.0-alpha.15) (2024-06-12)


### ⚠ BREAKING CHANGES

* Move client into protocol and rename builders in adapters ([#932](https://github.com/arcjet/arcjet-js/issues/932))

### 📦 Dependencies

* **dev:** Bump bun-types from 1.1.12 to 1.1.13 ([#947](https://github.com/arcjet/arcjet-js/issues/947)) ([bbf996d](https://github.com/arcjet/arcjet-js/commit/bbf996d6d2134fecee25eb218e9534b0550691fd))


### 🧹 Miscellaneous Chores

* Move client into protocol and rename builders in adapters ([#932](https://github.com/arcjet/arcjet-js/issues/932)) ([ea1c2b2](https://github.com/arcjet/arcjet-js/commit/ea1c2b25d146be10056cbc616180abeac75f9a01))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/headers bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/ip bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/logger bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/protocol bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * arcjet bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/rollup-config bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/tsconfig bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15

## [1.0.0-alpha.14](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.13...@arcjet/bun-v1.0.0-alpha.14) (2024-06-10)


### ⚠ BREAKING CHANGES

* Move all environment lookup into separate package ([#897](https://github.com/arcjet/arcjet-js/issues/897))
* **ip:** Allow platform to be specified when looking up IP ([#896](https://github.com/arcjet/arcjet-js/issues/896))
* Add fallback IP in each adapter ([#895](https://github.com/arcjet/arcjet-js/issues/895))
* Create runtime package and remove from SDK ([#871](https://github.com/arcjet/arcjet-js/issues/871))
* Allow ArcjetContext extension via new argument to core `protect()` ([#841](https://github.com/arcjet/arcjet-js/issues/841))
* Separate `@arcjet/headers` package from core ([#824](https://github.com/arcjet/arcjet-js/issues/824))

### 🚀 New Features

* Add fallback IP in each adapter ([#895](https://github.com/arcjet/arcjet-js/issues/895)) ([0f23cff](https://github.com/arcjet/arcjet-js/commit/0f23cff62214462504a21b84e00b258721e31ead)), closes [#51](https://github.com/arcjet/arcjet-js/issues/51) [#885](https://github.com/arcjet/arcjet-js/issues/885)
* Allow ArcjetContext extension via new argument to core `protect()` ([#841](https://github.com/arcjet/arcjet-js/issues/841)) ([96bbe94](https://github.com/arcjet/arcjet-js/commit/96bbe941b2f1613bc870e8f6073db919c1f41a7e))
* Create runtime package and remove from SDK ([#871](https://github.com/arcjet/arcjet-js/issues/871)) ([4e9e216](https://github.com/arcjet/arcjet-js/commit/4e9e2169e587ab010ff587a915ae8e1416c9b8f5))
* **ip:** Allow platform to be specified when looking up IP ([#896](https://github.com/arcjet/arcjet-js/issues/896)) ([c9f54bb](https://github.com/arcjet/arcjet-js/commit/c9f54bbe0561b13dbb2dbc6f58087a1b25218504))
* Move all environment lookup into separate package ([#897](https://github.com/arcjet/arcjet-js/issues/897)) ([a5bb8ca](https://github.com/arcjet/arcjet-js/commit/a5bb8ca6bad9d831b3f67f12b3ef87048ced25bb))
* Separate `@arcjet/headers` package from core ([#824](https://github.com/arcjet/arcjet-js/issues/824)) ([c8364f4](https://github.com/arcjet/arcjet-js/commit/c8364f464b99b5b66749ea776e29c728257a2d74))


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.17.2 to 4.18.0 ([#803](https://github.com/arcjet/arcjet-js/issues/803)) ([e6321af](https://github.com/arcjet/arcjet-js/commit/e6321afbad7127442d78b9c760c0e4c1ef73a77c))
* **dev:** Bump bun-types from 1.1.8 to 1.1.12 ([#853](https://github.com/arcjet/arcjet-js/issues/853)) ([a42fbd3](https://github.com/arcjet/arcjet-js/commit/a42fbd3c6c1e718343c579cbfd893f07a1859da3))


### 📝 Documentation

* Add quick start links & update Bun example ([#870](https://github.com/arcjet/arcjet-js/issues/870)) ([ee3079f](https://github.com/arcjet/arcjet-js/commit/ee3079f21484ed3b5cf67ae03a45cb9d07b3d911))
* Remove wording that implies is Shield is added by default ([#796](https://github.com/arcjet/arcjet-js/issues/796)) ([a85d18c](https://github.com/arcjet/arcjet-js/commit/a85d18ca6f6da589cfad58d3167b1c8a4b1edc55))


### 🧹 Miscellaneous Chores

* **docs:** Add live example app to READMEs ([#823](https://github.com/arcjet/arcjet-js/issues/823)) ([8b1c811](https://github.com/arcjet/arcjet-js/commit/8b1c81188b0035cfde810917239ea584e6ce3b3d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/headers bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/ip bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/logger bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * arcjet bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/rollup-config bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/tsconfig bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14

## [1.0.0-alpha.13](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.12...@arcjet/bun-v1.0.0-alpha.13) (2024-05-20)


### 🚀 New Features

* Create Bun.sh adapter ([#757](https://github.com/arcjet/arcjet-js/issues/757)) ([381dde5](https://github.com/arcjet/arcjet-js/commit/381dde59b2daae1599bf1d9b4106f1054aed8f99)), closes [#475](https://github.com/arcjet/arcjet-js/issues/475)


### 📝 Documentation

* **bun:** Update the request param on protect method ([#786](https://github.com/arcjet/arcjet-js/issues/786)) ([f51b8d9](https://github.com/arcjet/arcjet-js/commit/f51b8d9881aa2aaa3b958c3725c9e02053c531fb))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/ip bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
    * arcjet bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
    * @arcjet/rollup-config bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
    * @arcjet/tsconfig bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
