# Changelog

## [1.0.0-beta.15](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.14...@arcjet/analyze-wasm-v1.0.0-beta.15) (2025-11-07)


### ⚠ BREAKING CHANGES

* handle phone numbers with paren groups while restricting groups ([#5362](https://github.com/arcjet/arcjet-js/issues/5362))

### 🪲 Bug Fixes

* handle phone numbers with paren groups while restricting groups ([#5362](https://github.com/arcjet/arcjet-js/issues/5362)) ([49658da](https://github.com/arcjet/arcjet-js/commit/49658da6f9c95e57ca5516f5a1669ffa353f9c03))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.14 to 1.0.0-beta.15
    * @arcjet/rollup-config bumped from 1.0.0-beta.14 to 1.0.0-beta.15

## [1.0.0-beta.14](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.13...@arcjet/analyze-wasm-v1.0.0-beta.14) (2025-11-04)


### ⚠ BREAKING CHANGES

* drop Node.js 18 ([#5364](https://github.com/arcjet/arcjet-js/issues/5364))

### 🧹 Miscellaneous Chores

* drop Node.js 18 ([#5364](https://github.com/arcjet/arcjet-js/issues/5364)) ([9e4db59](https://github.com/arcjet/arcjet-js/commit/9e4db591b22a4bbe223339fa820644259e65d409))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * @arcjet/rollup-config bumped from 1.0.0-beta.13 to 1.0.0-beta.14

## [1.0.0-beta.13](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.12...@arcjet/analyze-wasm-v1.0.0-beta.13) (2025-10-07)


### 🪲 Bug Fixes

* support ESM types in dependencies ([#5269](https://github.com/arcjet/arcjet-js/issues/5269)) ([ef67a15](https://github.com/arcjet/arcjet-js/commit/ef67a157e90c1f82c8f46edadb1f4b48cd6cfa52))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * @arcjet/rollup-config bumped from 1.0.0-beta.12 to 1.0.0-beta.13

## [1.0.0-beta.12](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.11...@arcjet/analyze-wasm-v1.0.0-beta.12) (2025-09-22)


### 🚀 New Features

* **analye-wasm, redact-wasm:** ignore dashes in card numbers ([#5210](https://github.com/arcjet/arcjet-js/issues/5210)) ([5c414d6](https://github.com/arcjet/arcjet-js/commit/5c414d605b48dd6c6054c18dc0d0b1d9a0bfbe07))
* **arcjet:** add IP-related fields to filters ([#5170](https://github.com/arcjet/arcjet-js/issues/5170)) ([d0aeb84](https://github.com/arcjet/arcjet-js/commit/d0aeb84ab1d545fd3e34b7ddc20a83c4121e479b))
* **filters:** add limit to 10 expressions, 1024 bytes ([#5212](https://github.com/arcjet/arcjet-js/issues/5212)) ([502288a](https://github.com/arcjet/arcjet-js/commit/502288aabd9b95a3905cf62d1e50e65f25fbfb61))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.11 to 1.0.0-beta.12
    * @arcjet/rollup-config bumped from 1.0.0-beta.11 to 1.0.0-beta.12

## [1.0.0-beta.11](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.10...@arcjet/analyze-wasm-v1.0.0-beta.11) (2025-09-03)


### 🚀 New Features

* add filter rule ([#4802](https://github.com/arcjet/arcjet-js/issues/4802)) ([40953e1](https://github.com/arcjet/arcjet-js/commit/40953e1c704eea2765a6cb8231a781df547af90c))


### 🪲 Bug Fixes

* **types:** remove need for `dom.iterable`, `dom`, lib ([#5047](https://github.com/arcjet/arcjet-js/issues/5047)) ([fba8564](https://github.com/arcjet/arcjet-js/commit/fba85640bd24f1ab2906b1e43159d9e8dc89fd37))


### 📝 Documentation

* **analyze-wasm:** add JSDocs ([#4996](https://github.com/arcjet/arcjet-js/issues/4996)) ([e7a4ba6](https://github.com/arcjet/arcjet-js/commit/e7a4ba6193d63a2b1d95e19eec22f264e86b7c18))


### 🧹 Miscellaneous Chores

* **tsconfig:** remove `@arcjet/tsconfig` ([#5022](https://github.com/arcjet/arcjet-js/issues/5022)) ([fdca6a9](https://github.com/arcjet/arcjet-js/commit/fdca6a9b052fa6711cc56f81b46b19bd6aa7acbb))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.10 to 1.0.0-beta.11
    * @arcjet/rollup-config bumped from 1.0.0-beta.10 to 1.0.0-beta.11

## [1.0.0-beta.10](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.9...@arcjet/analyze-wasm-v1.0.0-beta.10) (2025-08-04)


### 📝 Documentation

* add uniform install section to readmes ([#4633](https://github.com/arcjet/arcjet-js/issues/4633)) ([709ff1e](https://github.com/arcjet/arcjet-js/commit/709ff1e2e2c182dcafe1f15a630c026e97f59d76))
* add uniform license section to readmes ([#4634](https://github.com/arcjet/arcjet-js/issues/4634)) ([af1c322](https://github.com/arcjet/arcjet-js/commit/af1c322213daa016adb01ce9a26f96b7c546b107))
* add uniform use section to readmes ([#4655](https://github.com/arcjet/arcjet-js/issues/4655)) ([ac27256](https://github.com/arcjet/arcjet-js/commit/ac272568098e43ed70700625ed605ae76cb63fec))


### 🧹 Miscellaneous Chores

* **bindings:** regenerate WebAssembly bindings ([#4600](https://github.com/arcjet/arcjet-js/issues/4600)) ([4377b20](https://github.com/arcjet/arcjet-js/commit/4377b20c32130bf70d9e5273929ae8d766bcc40f))


### 📚 Tests

* add tests for public interface ([#4587](https://github.com/arcjet/arcjet-js/issues/4587)) ([f7aabec](https://github.com/arcjet/arcjet-js/commit/f7aabecbcd351b31fc2b94bc9c871a1123e2c7cd))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.9 to 1.0.0-beta.10
    * @arcjet/rollup-config bumped from 1.0.0-beta.9 to 1.0.0-beta.10
    * @arcjet/tsconfig bumped from 1.0.0-beta.9 to 1.0.0-beta.10

## [1.0.0-beta.9](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.8...@arcjet/analyze-wasm-v1.0.0-beta.9) (2025-07-09)


### 📝 Documentation

* Add relevant links to each package readme ([#4429](https://github.com/arcjet/arcjet-js/issues/4429)) ([2653ab0](https://github.com/arcjet/arcjet-js/commit/2653ab0ea93eee7a1b921e7cf3ab403a825bef3d))


### 🧹 Miscellaneous Chores

* Add `keywords` to `package.json`s ([#4408](https://github.com/arcjet/arcjet-js/issues/4408)) ([4f09478](https://github.com/arcjet/arcjet-js/commit/4f094781c3e2fb80df4186b92185cbc295880b5c))
* remove `expect`, references to `jest` ([#4415](https://github.com/arcjet/arcjet-js/issues/4415)) ([2c44c39](https://github.com/arcjet/arcjet-js/commit/2c44c39dfeccee74321a3425a3e5b2d5fa480c42))


### ⌨️ Code Refactoring

* Clean `files` fields in `package.json`s ([#4441](https://github.com/arcjet/arcjet-js/issues/4441)) ([fd7913b](https://github.com/arcjet/arcjet-js/commit/fd7913bf0c28d05740d94cf50f5939ee2b6f98fa))


### 📚 Tests

* add tests for `analyze` ([#4564](https://github.com/arcjet/arcjet-js/issues/4564)) ([7ef59bb](https://github.com/arcjet/arcjet-js/commit/7ef59bbaa9531d4b6802339b8f4f9e2a0e13228f))


### 🔨 Build System

* add separate core, coverage tests ([#4480](https://github.com/arcjet/arcjet-js/issues/4480)) ([61c2c50](https://github.com/arcjet/arcjet-js/commit/61c2c50a94ac9712dfebd1a972e067cc0788c44a))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.8 to 1.0.0-beta.9
    * @arcjet/rollup-config bumped from 1.0.0-beta.8 to 1.0.0-beta.9
    * @arcjet/tsconfig bumped from 1.0.0-beta.8 to 1.0.0-beta.9

## [1.0.0-beta.8](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.7...@arcjet/analyze-wasm-v1.0.0-beta.8) (2025-05-28)


### 🧹 Miscellaneous Chores

* **@arcjet/analyze-wasm:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * @arcjet/rollup-config bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * @arcjet/tsconfig bumped from 1.0.0-beta.7 to 1.0.0-beta.8

## [1.0.0-beta.7](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.6...@arcjet/analyze-wasm-v1.0.0-beta.7) (2025-05-06)


### 🧹 Miscellaneous Chores

* **@arcjet/analyze-wasm:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.6 to 1.0.0-beta.7
    * @arcjet/rollup-config bumped from 1.0.0-beta.6 to 1.0.0-beta.7
    * @arcjet/tsconfig bumped from 1.0.0-beta.6 to 1.0.0-beta.7

## [1.0.0-beta.6](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.5...@arcjet/analyze-wasm-v1.0.0-beta.6) (2025-04-17)


### 🧹 Miscellaneous Chores

* **@arcjet/analyze-wasm:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.5 to 1.0.0-beta.6
    * @arcjet/rollup-config bumped from 1.0.0-beta.5 to 1.0.0-beta.6
    * @arcjet/tsconfig bumped from 1.0.0-beta.5 to 1.0.0-beta.6

## [1.0.0-beta.5](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.4...@arcjet/analyze-wasm-v1.0.0-beta.5) (2025-03-27)


### 🚀 New Features

* Add more detected bots ([#3689](https://github.com/arcjet/arcjet-js/issues/3689)) ([0bf3260](https://github.com/arcjet/arcjet-js/commit/0bf32608749bb4beb8e19d250657217d707f7cc1))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.4 to 1.0.0-beta.5
    * @arcjet/rollup-config bumped from 1.0.0-beta.4 to 1.0.0-beta.5
    * @arcjet/tsconfig bumped from 1.0.0-beta.4 to 1.0.0-beta.5

## [1.0.0-beta.4](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.3...@arcjet/analyze-wasm-v1.0.0-beta.4) (2025-03-14)


### ⚠ BREAKING CHANGES

* Upgrade packages to eslint 9 ([#3531](https://github.com/arcjet/arcjet-js/issues/3531))

### deps

* Upgrade packages to eslint 9 ([#3531](https://github.com/arcjet/arcjet-js/issues/3531)) ([84826b5](https://github.com/arcjet/arcjet-js/commit/84826b51f0c7925ede7a889499bed3a188e48e65)), closes [#539](https://github.com/arcjet/arcjet-js/issues/539)


### 🚀 New Features

* regenerate webassembly with new bots ([#3570](https://github.com/arcjet/arcjet-js/issues/3570)) ([9db5e03](https://github.com/arcjet/arcjet-js/commit/9db5e033ba66cb0d5d03917b12f57aa1ddc0150b))


### 🧹 Miscellaneous Chores

* **analyze-wasm:** Exclude TypeScript files ([#3533](https://github.com/arcjet/arcjet-js/issues/3533)) ([82e78b9](https://github.com/arcjet/arcjet-js/commit/82e78b95e8b483322e70285dc51a01f64338bb8e))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.3 to 1.0.0-beta.4
    * @arcjet/rollup-config bumped from 1.0.0-beta.3 to 1.0.0-beta.4
    * @arcjet/tsconfig bumped from 1.0.0-beta.3 to 1.0.0-beta.4

## [1.0.0-beta.3](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.2...@arcjet/analyze-wasm-v1.0.0-beta.3) (2025-03-05)


### 🚀 New Features

* **analyze:** Add Hydrozen monitoring bot ([#3132](https://github.com/arcjet/arcjet-js/issues/3132)) ([211dbd0](https://github.com/arcjet/arcjet-js/commit/211dbd0fe35f3a72c267fd21cfeb083214f66372))


### 🧹 Miscellaneous Chores

* regen wasm with bot improvements ([#3378](https://github.com/arcjet/arcjet-js/issues/3378)) ([b882835](https://github.com/arcjet/arcjet-js/commit/b882835940a5b1d258e422a410c538c01f452daf))
* Regenerate analyze & redact WebAssembly files ([#3404](https://github.com/arcjet/arcjet-js/issues/3404)) ([97df114](https://github.com/arcjet/arcjet-js/commit/97df114bc1bd19f3ec358a574a9cce7c0f87e3bf))
* Regenerate jco bindings ([#3098](https://github.com/arcjet/arcjet-js/issues/3098)) ([8268d83](https://github.com/arcjet/arcjet-js/commit/8268d833d6a9bfd7849447a05ae5455f279ba19f))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.2 to 1.0.0-beta.3
    * @arcjet/rollup-config bumped from 1.0.0-beta.2 to 1.0.0-beta.3
    * @arcjet/tsconfig bumped from 1.0.0-beta.2 to 1.0.0-beta.3

## [1.0.0-beta.2](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.1...@arcjet/analyze-wasm-v1.0.0-beta.2) (2025-02-04)


### 🪲 Bug Fixes

* **analyze:** Always lowercase headers and iterate in insertion order ([#2865](https://github.com/arcjet/arcjet-js/issues/2865)) ([a9af1e4](https://github.com/arcjet/arcjet-js/commit/a9af1e49eff46aaab16522e38df9f2ce7888f7fa))


### 🧹 Miscellaneous Chores

* **rollup-config:** Consolidate wasmToModule plugin ([#3039](https://github.com/arcjet/arcjet-js/issues/3039)) ([c3b8e36](https://github.com/arcjet/arcjet-js/commit/c3b8e36dd59a0ca0c8a10946b0d76e4bc3766f40))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.1 to 1.0.0-beta.2
    * @arcjet/rollup-config bumped from 1.0.0-beta.1 to 1.0.0-beta.2
    * @arcjet/tsconfig bumped from 1.0.0-beta.1 to 1.0.0-beta.2

## [1.0.0-beta.1](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.34...@arcjet/analyze-wasm-v1.0.0-beta.1) (2025-01-15)


### ⚠ BREAKING CHANGES

* Correctly handle urlencoded data when tokenizing characters ([#2863](https://github.com/arcjet/arcjet-js/issues/2863))
* refactor wasm loading for analyze ([#1832](https://github.com/arcjet/arcjet-js/issues/1832))

### 🚀 New Features

* support `allow` or `deny` config in validateEmail & deprecate `block` config ([#2661](https://github.com/arcjet/arcjet-js/issues/2661)) ([890afcd](https://github.com/arcjet/arcjet-js/commit/890afcd2d1afef262b741a74521b82cb85711860)), closes [#1834](https://github.com/arcjet/arcjet-js/issues/1834)


### 🪲 Bug Fixes

* Correctly handle urlencoded data when tokenizing characters ([#2863](https://github.com/arcjet/arcjet-js/issues/2863)) ([fa93290](https://github.com/arcjet/arcjet-js/commit/fa93290b91ac1edc3acf44cd4f2a9ff324da3fbd))


### 🏎️ Performance Improvements

* **analyze:** Compile WebAssembly upon module load ([#2727](https://github.com/arcjet/arcjet-js/issues/2727)) ([489f1c6](https://github.com/arcjet/arcjet-js/commit/489f1c6b5248197ef170676992a9089a9bc46c6b))


### 🧹 Miscellaneous Chores

* refactor wasm loading for analyze ([#1832](https://github.com/arcjet/arcjet-js/issues/1832)) ([02e4435](https://github.com/arcjet/arcjet-js/commit/02e4435a86b6b40b97feb369f0402b2199a4bc12)), closes [#1448](https://github.com/arcjet/arcjet-js/issues/1448)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
    * @arcjet/rollup-config bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
    * @arcjet/tsconfig bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
