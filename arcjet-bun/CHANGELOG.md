# Changelog

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
