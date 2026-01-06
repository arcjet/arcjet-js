# Changelog

## [1.0.0-beta.16](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.15...@arcjet/redact-wasm-v1.0.0-beta.16) (2026-01-06)


### 🧹 Miscellaneous Chores

* regenerate WebAssembly ([#5526](https://github.com/arcjet/arcjet-js/issues/5526)) ([c97076b](https://github.com/arcjet/arcjet-js/commit/c97076b4ef630e11640e51dfc7c74b10222496fe))
* Update WebAssembly for dependency upgrades ([c7b4d7e](https://github.com/arcjet/arcjet-js/commit/c7b4d7ef2224c8e82d3a7c8b8293e15bc214ba49))


### 🔨 Build System

* type check all TypeScript files ([#5582](https://github.com/arcjet/arcjet-js/issues/5582)) ([17769ee](https://github.com/arcjet/arcjet-js/commit/17769eeea65a2319c07d0a2dfdf9011283d2218f))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.15 to 1.0.0-beta.16
    * @arcjet/rollup-config bumped from 1.0.0-beta.15 to 1.0.0-beta.16

## [1.0.0-beta.15](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.14...@arcjet/redact-wasm-v1.0.0-beta.15) (2025-11-07)


### ⚠ BREAKING CHANGES

* handle phone numbers with paren groups while restricting groups ([#5362](https://github.com/arcjet/arcjet-js/issues/5362))

### 🪲 Bug Fixes

* handle phone numbers with paren groups while restricting groups ([#5362](https://github.com/arcjet/arcjet-js/issues/5362)) ([49658da](https://github.com/arcjet/arcjet-js/commit/49658da6f9c95e57ca5516f5a1669ffa353f9c03))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.14 to 1.0.0-beta.15
    * @arcjet/rollup-config bumped from 1.0.0-beta.14 to 1.0.0-beta.15

## [1.0.0-beta.14](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.13...@arcjet/redact-wasm-v1.0.0-beta.14) (2025-11-04)


### ⚠ BREAKING CHANGES

* drop Node.js 18 ([#5364](https://github.com/arcjet/arcjet-js/issues/5364))

### 🧹 Miscellaneous Chores

* drop Node.js 18 ([#5364](https://github.com/arcjet/arcjet-js/issues/5364)) ([9e4db59](https://github.com/arcjet/arcjet-js/commit/9e4db591b22a4bbe223339fa820644259e65d409))


### 📚 Tests

* **redact-wasm:** add some end to end tests ([#5309](https://github.com/arcjet/arcjet-js/issues/5309)) ([ee1b386](https://github.com/arcjet/arcjet-js/commit/ee1b38686a1265a489123a21781a1b4a4f935906)), closes [#5352](https://github.com/arcjet/arcjet-js/issues/5352)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * @arcjet/rollup-config bumped from 1.0.0-beta.13 to 1.0.0-beta.14

## [1.0.0-beta.13](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.12...@arcjet/redact-wasm-v1.0.0-beta.13) (2025-10-07)


### 🪲 Bug Fixes

* support ESM types in dependencies ([#5269](https://github.com/arcjet/arcjet-js/issues/5269)) ([ef67a15](https://github.com/arcjet/arcjet-js/commit/ef67a157e90c1f82c8f46edadb1f4b48cd6cfa52))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * @arcjet/rollup-config bumped from 1.0.0-beta.12 to 1.0.0-beta.13

## [1.0.0-beta.12](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.11...@arcjet/redact-wasm-v1.0.0-beta.12) (2025-09-22)


### 🚀 New Features

* **analye-wasm, redact-wasm:** ignore dashes in card numbers ([#5210](https://github.com/arcjet/arcjet-js/issues/5210)) ([5c414d6](https://github.com/arcjet/arcjet-js/commit/5c414d605b48dd6c6054c18dc0d0b1d9a0bfbe07))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.11 to 1.0.0-beta.12
    * @arcjet/rollup-config bumped from 1.0.0-beta.11 to 1.0.0-beta.12

## [1.0.0-beta.11](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.10...@arcjet/redact-wasm-v1.0.0-beta.11) (2025-09-03)


### 🪲 Bug Fixes

* **types:** remove need for `dom.iterable`, `dom`, lib ([#5047](https://github.com/arcjet/arcjet-js/issues/5047)) ([fba8564](https://github.com/arcjet/arcjet-js/commit/fba85640bd24f1ab2906b1e43159d9e8dc89fd37))


### 📝 Documentation

* **redact-wasm:** add JSDocs ([#4844](https://github.com/arcjet/arcjet-js/issues/4844)) ([e187ff8](https://github.com/arcjet/arcjet-js/commit/e187ff855e1f4873957b131f747bd7cb876ee25a))


### 🧹 Miscellaneous Chores

* **tsconfig:** remove `@arcjet/tsconfig` ([#5022](https://github.com/arcjet/arcjet-js/issues/5022)) ([fdca6a9](https://github.com/arcjet/arcjet-js/commit/fdca6a9b052fa6711cc56f81b46b19bd6aa7acbb))


### ⌨️ Code Refactoring

* **redact:** reuse exposed types ([#4856](https://github.com/arcjet/arcjet-js/issues/4856)) ([2380307](https://github.com/arcjet/arcjet-js/commit/2380307a7b82ed1a9dc4c3bb3167475a9cfe12eb))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.10 to 1.0.0-beta.11
    * @arcjet/rollup-config bumped from 1.0.0-beta.10 to 1.0.0-beta.11

## [1.0.0-beta.10](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.9...@arcjet/redact-wasm-v1.0.0-beta.10) (2025-08-04)


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

## [1.0.0-beta.9](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.8...@arcjet/redact-wasm-v1.0.0-beta.9) (2025-07-09)


### 📝 Documentation

* Add relevant links to each package readme ([#4429](https://github.com/arcjet/arcjet-js/issues/4429)) ([2653ab0](https://github.com/arcjet/arcjet-js/commit/2653ab0ea93eee7a1b921e7cf3ab403a825bef3d))


### 🧹 Miscellaneous Chores

* Add `keywords` to `package.json`s ([#4408](https://github.com/arcjet/arcjet-js/issues/4408)) ([4f09478](https://github.com/arcjet/arcjet-js/commit/4f094781c3e2fb80df4186b92185cbc295880b5c))
* remove `expect`, references to `jest` ([#4415](https://github.com/arcjet/arcjet-js/issues/4415)) ([2c44c39](https://github.com/arcjet/arcjet-js/commit/2c44c39dfeccee74321a3425a3e5b2d5fa480c42))


### ⌨️ Code Refactoring

* Clean `files` fields in `package.json`s ([#4441](https://github.com/arcjet/arcjet-js/issues/4441)) ([fd7913b](https://github.com/arcjet/arcjet-js/commit/fd7913bf0c28d05740d94cf50f5939ee2b6f98fa))


### 🔨 Build System

* add separate core, coverage tests ([#4480](https://github.com/arcjet/arcjet-js/issues/4480)) ([61c2c50](https://github.com/arcjet/arcjet-js/commit/61c2c50a94ac9712dfebd1a972e067cc0788c44a))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.8 to 1.0.0-beta.9
    * @arcjet/rollup-config bumped from 1.0.0-beta.8 to 1.0.0-beta.9
    * @arcjet/tsconfig bumped from 1.0.0-beta.8 to 1.0.0-beta.9

## [1.0.0-beta.8](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.7...@arcjet/redact-wasm-v1.0.0-beta.8) (2025-05-28)


### 🧹 Miscellaneous Chores

* **@arcjet/redact-wasm:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * @arcjet/rollup-config bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * @arcjet/tsconfig bumped from 1.0.0-beta.7 to 1.0.0-beta.8

## [1.0.0-beta.7](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.6...@arcjet/redact-wasm-v1.0.0-beta.7) (2025-05-06)


### 🧹 Miscellaneous Chores

* **@arcjet/redact-wasm:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.6 to 1.0.0-beta.7
    * @arcjet/rollup-config bumped from 1.0.0-beta.6 to 1.0.0-beta.7
    * @arcjet/tsconfig bumped from 1.0.0-beta.6 to 1.0.0-beta.7

## [1.0.0-beta.6](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.5...@arcjet/redact-wasm-v1.0.0-beta.6) (2025-04-17)


### 🚀 New Features

* add plaintext param to custom redact ([#3873](https://github.com/arcjet/arcjet-js/issues/3873)) ([dcff4a6](https://github.com/arcjet/arcjet-js/commit/dcff4a6d78d5824d23e5ddb5116afe26b51a3b68))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.5 to 1.0.0-beta.6
    * @arcjet/rollup-config bumped from 1.0.0-beta.5 to 1.0.0-beta.6
    * @arcjet/tsconfig bumped from 1.0.0-beta.5 to 1.0.0-beta.6

## [1.0.0-beta.5](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.4...@arcjet/redact-wasm-v1.0.0-beta.5) (2025-03-27)


### 🧹 Miscellaneous Chores

* **@arcjet/redact-wasm:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.4 to 1.0.0-beta.5
    * @arcjet/rollup-config bumped from 1.0.0-beta.4 to 1.0.0-beta.5
    * @arcjet/tsconfig bumped from 1.0.0-beta.4 to 1.0.0-beta.5

## [1.0.0-beta.4](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.3...@arcjet/redact-wasm-v1.0.0-beta.4) (2025-03-14)


### ⚠ BREAKING CHANGES

* Upgrade packages to eslint 9 ([#3531](https://github.com/arcjet/arcjet-js/issues/3531))

### deps

* Upgrade packages to eslint 9 ([#3531](https://github.com/arcjet/arcjet-js/issues/3531)) ([84826b5](https://github.com/arcjet/arcjet-js/commit/84826b51f0c7925ede7a889499bed3a188e48e65)), closes [#539](https://github.com/arcjet/arcjet-js/issues/539)


### 🚀 New Features

* regenerate webassembly with new bots ([#3570](https://github.com/arcjet/arcjet-js/issues/3570)) ([9db5e03](https://github.com/arcjet/arcjet-js/commit/9db5e033ba66cb0d5d03917b12f57aa1ddc0150b))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.3 to 1.0.0-beta.4
    * @arcjet/rollup-config bumped from 1.0.0-beta.3 to 1.0.0-beta.4
    * @arcjet/tsconfig bumped from 1.0.0-beta.3 to 1.0.0-beta.4

## [1.0.0-beta.3](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.2...@arcjet/redact-wasm-v1.0.0-beta.3) (2025-03-05)


### 🧹 Miscellaneous Chores

* Regenerate analyze & redact WebAssembly files ([#3404](https://github.com/arcjet/arcjet-js/issues/3404)) ([97df114](https://github.com/arcjet/arcjet-js/commit/97df114bc1bd19f3ec358a574a9cce7c0f87e3bf))
* Regenerate jco bindings ([#3098](https://github.com/arcjet/arcjet-js/issues/3098)) ([8268d83](https://github.com/arcjet/arcjet-js/commit/8268d833d6a9bfd7849447a05ae5455f279ba19f))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.2 to 1.0.0-beta.3
    * @arcjet/rollup-config bumped from 1.0.0-beta.2 to 1.0.0-beta.3
    * @arcjet/tsconfig bumped from 1.0.0-beta.2 to 1.0.0-beta.3

## [1.0.0-beta.2](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.1...@arcjet/redact-wasm-v1.0.0-beta.2) (2025-02-04)


### 🚀 New Features

* **redact:** Pre-compile WebAssembly on module load ([#3037](https://github.com/arcjet/arcjet-js/issues/3037)) ([c12bec5](https://github.com/arcjet/arcjet-js/commit/c12bec58ee0abd3becb1e978596fed9047702d3d))


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

## [1.0.0-beta.1](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.34...@arcjet/redact-wasm-v1.0.0-beta.1) (2025-01-15)


### ⚠ BREAKING CHANGES

* **redact:** Correctly handle urlencoded data when tokenizing characters ([#2864](https://github.com/arcjet/arcjet-js/issues/2864))

### 🪲 Bug Fixes

* **redact:** Correctly handle urlencoded data when tokenizing characters ([#2864](https://github.com/arcjet/arcjet-js/issues/2864)) ([fbed883](https://github.com/arcjet/arcjet-js/commit/fbed8835f7e2c4ee659bcfafecad1bfa7898c7a4))


### 🧹 Miscellaneous Chores

* Switch most test harnesses to node:test ([#2479](https://github.com/arcjet/arcjet-js/issues/2479)) ([8a71bbc](https://github.com/arcjet/arcjet-js/commit/8a71bbc3d1fa6b63586f1bae7fa6f0f8d4fbad66))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
    * @arcjet/rollup-config bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
    * @arcjet/tsconfig bumped from 1.0.0-alpha.34 to 1.0.0-beta.1

## [1.0.0-alpha.34](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.33...@arcjet/redact-wasm-v1.0.0-alpha.34) (2024-12-03)


### 🧹 Miscellaneous Chores

* **@arcjet/redact-wasm:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34
    * @arcjet/rollup-config bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34
    * @arcjet/tsconfig bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34

## [1.0.0-alpha.33](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.32...@arcjet/redact-wasm-v1.0.0-alpha.33) (2024-11-29)


### 🧹 Miscellaneous Chores

* **@arcjet/redact-wasm:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33
    * @arcjet/rollup-config bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33
    * @arcjet/tsconfig bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33

## [1.0.0-alpha.32](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.31...@arcjet/redact-wasm-v1.0.0-alpha.32) (2024-11-26)


### ⚠ BREAKING CHANGES

* Stop publishing TypeScript source files ([#2326](https://github.com/arcjet/arcjet-js/issues/2326))

### 🪲 Bug Fixes

* Stop publishing TypeScript source files ([#2326](https://github.com/arcjet/arcjet-js/issues/2326)) ([f8f6a2d](https://github.com/arcjet/arcjet-js/commit/f8f6a2d998220d9705ecda8f10d3c5e14b47cad6)), closes [#1836](https://github.com/arcjet/arcjet-js/issues/1836)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32
    * @arcjet/rollup-config bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32
    * @arcjet/tsconfig bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32

## [1.0.0-alpha.31](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.30...@arcjet/redact-wasm-v1.0.0-alpha.31) (2024-11-22)


### 🧹 Miscellaneous Chores

* **@arcjet/redact-wasm:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31
    * @arcjet/rollup-config bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31
    * @arcjet/tsconfig bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31

## [1.0.0-alpha.30](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.29...@arcjet/redact-wasm-v1.0.0-alpha.30) (2024-11-20)


### 🧹 Miscellaneous Chores

* **@arcjet/redact-wasm:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30
    * @arcjet/rollup-config bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30
    * @arcjet/tsconfig bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30

## [1.0.0-alpha.29](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.28...@arcjet/redact-wasm-v1.0.0-alpha.29) (2024-11-19)


### 🧹 Miscellaneous Chores

* Regenerate Wasm with updated dependencies ([#2168](https://github.com/arcjet/arcjet-js/issues/2168)) ([90b8350](https://github.com/arcjet/arcjet-js/commit/90b8350160d80f7d55416ae179fdd9ab85f8fdfe))
* Regenerate Wasm with updated dependencies ([#2258](https://github.com/arcjet/arcjet-js/issues/2258)) ([b82284b](https://github.com/arcjet/arcjet-js/commit/b82284bc08e5952656664f7056d2749da9286872))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29
    * @arcjet/rollup-config bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29
    * @arcjet/tsconfig bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29

## [1.0.0-alpha.28](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.27...@arcjet/redact-wasm-v1.0.0-alpha.28) (2024-10-23)


### ⚠ BREAKING CHANGES

* Return ERROR decision when fingerprint cannot be generated ([#1990](https://github.com/arcjet/arcjet-js/issues/1990))
* **analyze:** improve sensitive info string token accuracy ([#1962](https://github.com/arcjet/arcjet-js/issues/1962))
* Update Wasm with phone-number fix and tokenizer update ([#1854](https://github.com/arcjet/arcjet-js/issues/1854))

### 🚀 New Features

* **analyze:** improve sensitive info string token accuracy ([#1962](https://github.com/arcjet/arcjet-js/issues/1962)) ([abad1bd](https://github.com/arcjet/arcjet-js/commit/abad1bdbb13c9778d9724e29e97cddfadcf3ab02))


### 🪲 Bug Fixes

* Return ERROR decision when fingerprint cannot be generated ([#1990](https://github.com/arcjet/arcjet-js/issues/1990)) ([618a1ee](https://github.com/arcjet/arcjet-js/commit/618a1eef0bd70c827ce1c4911d991bfb55b0deb2)), closes [#1801](https://github.com/arcjet/arcjet-js/issues/1801)
* Update Wasm with phone-number fix and tokenizer update ([#1854](https://github.com/arcjet/arcjet-js/issues/1854)) ([f94f078](https://github.com/arcjet/arcjet-js/commit/f94f07825431dea7690bd82982047e2820971b72))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28
    * @arcjet/rollup-config bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28
    * @arcjet/tsconfig bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28

## [1.0.0-alpha.27](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.26...@arcjet/redact-wasm-v1.0.0-alpha.27) (2024-10-01)


### 🧹 Miscellaneous Chores

* Update WebAssembly modules ([#1721](https://github.com/arcjet/arcjet-js/issues/1721)) ([2dbb9eb](https://github.com/arcjet/arcjet-js/commit/2dbb9eb90755dca6dc99dc0092246304b98889f9))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27
    * @arcjet/rollup-config bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27
    * @arcjet/tsconfig bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27

## [1.0.0-alpha.26](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.25...@arcjet/redact-wasm-v1.0.0-alpha.26) (2024-09-16)


### 🧹 Miscellaneous Chores

* **@arcjet/redact-wasm:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26
    * @arcjet/rollup-config bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26
    * @arcjet/tsconfig bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26

## [1.0.0-alpha.25](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.24...@arcjet/redact-wasm-v1.0.0-alpha.25) (2024-09-10)


### 🧹 Miscellaneous Chores

* **@arcjet/redact-wasm:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25
    * @arcjet/rollup-config bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25
    * @arcjet/tsconfig bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25

## [1.0.0-alpha.24](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.23...@arcjet/redact-wasm-v1.0.0-alpha.24) (2024-09-05)


### 🧹 Miscellaneous Chores

* **@arcjet/redact-wasm:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24
    * @arcjet/rollup-config bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24
    * @arcjet/tsconfig bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24

## [1.0.0-alpha.23](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.22...@arcjet/redact-wasm-v1.0.0-alpha.23) (2024-09-02)


### 🚀 New Features

* add library to perform redaction of sensitive information ([#1358](https://github.com/arcjet/arcjet-js/issues/1358)) ([59d4a0d](https://github.com/arcjet/arcjet-js/commit/59d4a0de86ae8f6b44839566df49bb2cd391e51a))


### 🪲 Bug Fixes

* Ensure instantiation throws if WebAssembly is unavailable ([#1458](https://github.com/arcjet/arcjet-js/issues/1458)) ([0edfd45](https://github.com/arcjet/arcjet-js/commit/0edfd457d9f1428d360787e8c78dce3471abdee8))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23
    * @arcjet/rollup-config bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23
    * @arcjet/tsconfig bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23
