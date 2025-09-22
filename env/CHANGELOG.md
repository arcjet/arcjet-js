# Changelog

## [1.0.0-beta.12](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.11...@arcjet/env-v1.0.0-beta.12) (2025-09-22)


### 🧹 Miscellaneous Chores

* **@arcjet/env:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.11 to 1.0.0-beta.12
    * @arcjet/rollup-config bumped from 1.0.0-beta.11 to 1.0.0-beta.12

## [1.0.0-beta.11](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.10...@arcjet/env-v1.0.0-beta.11) (2025-09-03)


### ⚠ BREAKING CHANGES

* **env:** remove support for explicit port on orb ([#4988](https://github.com/arcjet/arcjet-js/issues/4988))

### 🚀 New Features

* **env:** Support trailing slashes on ARCJET_BASE_URL ([#5035](https://github.com/arcjet/arcjet-js/issues/5035)) ([db1a4ac](https://github.com/arcjet/arcjet-js/commit/db1a4ac2fd713db1f9b03825eb81ea1199fdaa4a))


### 🪲 Bug Fixes

* **env:** remove support for explicit port on orb ([#4988](https://github.com/arcjet/arcjet-js/issues/4988)) ([3e601d7](https://github.com/arcjet/arcjet-js/commit/3e601d7929c5e3a13160a9c61925465887a80a7b))


### 📝 Documentation

* add JSDocs to exposed API in 10 utilities ([#4741](https://github.com/arcjet/arcjet-js/issues/4741)) ([f836ea2](https://github.com/arcjet/arcjet-js/commit/f836ea2533cf4726a7cacd3462ea1770801e9889))


### 🧹 Miscellaneous Chores

* **tsconfig:** remove `@arcjet/tsconfig` ([#5022](https://github.com/arcjet/arcjet-js/issues/5022)) ([fdca6a9](https://github.com/arcjet/arcjet-js/commit/fdca6a9b052fa6711cc56f81b46b19bd6aa7acbb))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.10 to 1.0.0-beta.11
    * @arcjet/rollup-config bumped from 1.0.0-beta.10 to 1.0.0-beta.11

## [1.0.0-beta.10](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.9...@arcjet/env-v1.0.0-beta.10) (2025-08-04)


### ⚠ BREAKING CHANGES

* remove arbitrary base url from env in dev ([#4755](https://github.com/arcjet/arcjet-js/issues/4755))

### 🪲 Bug Fixes

* remove arbitrary base url from env in dev ([#4755](https://github.com/arcjet/arcjet-js/issues/4755)) ([49de60e](https://github.com/arcjet/arcjet-js/commit/49de60ef8e7cab77254079a19f76290c0066400e))


### 📝 Documentation

* add uniform install section to readmes ([#4633](https://github.com/arcjet/arcjet-js/issues/4633)) ([709ff1e](https://github.com/arcjet/arcjet-js/commit/709ff1e2e2c182dcafe1f15a630c026e97f59d76))
* add uniform license section to readmes ([#4634](https://github.com/arcjet/arcjet-js/issues/4634)) ([af1c322](https://github.com/arcjet/arcjet-js/commit/af1c322213daa016adb01ce9a26f96b7c546b107))
* add uniform use section to readmes ([#4655](https://github.com/arcjet/arcjet-js/issues/4655)) ([ac27256](https://github.com/arcjet/arcjet-js/commit/ac272568098e43ed70700625ed605ae76cb63fec))


### 📚 Tests

* add tests for public interface ([#4587](https://github.com/arcjet/arcjet-js/issues/4587)) ([f7aabec](https://github.com/arcjet/arcjet-js/commit/f7aabecbcd351b31fc2b94bc9c871a1123e2c7cd))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.9 to 1.0.0-beta.10
    * @arcjet/rollup-config bumped from 1.0.0-beta.9 to 1.0.0-beta.10
    * @arcjet/tsconfig bumped from 1.0.0-beta.9 to 1.0.0-beta.10

## [1.0.0-beta.9](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.8...@arcjet/env-v1.0.0-beta.9) (2025-07-09)


### 📝 Documentation

* Add relevant links to each package readme ([#4429](https://github.com/arcjet/arcjet-js/issues/4429)) ([2653ab0](https://github.com/arcjet/arcjet-js/commit/2653ab0ea93eee7a1b921e7cf3ab403a825bef3d))


### 🧹 Miscellaneous Chores

* Add `keywords` to `package.json`s ([#4408](https://github.com/arcjet/arcjet-js/issues/4408)) ([4f09478](https://github.com/arcjet/arcjet-js/commit/4f094781c3e2fb80df4186b92185cbc295880b5c))
* Fix missing file extension in test ([#4407](https://github.com/arcjet/arcjet-js/issues/4407)) ([b694dad](https://github.com/arcjet/arcjet-js/commit/b694dad98657acaebed4424d55b406ece954beff))
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

## [1.0.0-beta.8](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.7...@arcjet/env-v1.0.0-beta.8) (2025-05-28)


### 🧹 Miscellaneous Chores

* **@arcjet/env:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * @arcjet/rollup-config bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * @arcjet/tsconfig bumped from 1.0.0-beta.7 to 1.0.0-beta.8

## [1.0.0-beta.7](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.6...@arcjet/env-v1.0.0-beta.7) (2025-05-06)


### 🧹 Miscellaneous Chores

* **@arcjet/env:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.6 to 1.0.0-beta.7
    * @arcjet/rollup-config bumped from 1.0.0-beta.6 to 1.0.0-beta.7
    * @arcjet/tsconfig bumped from 1.0.0-beta.6 to 1.0.0-beta.7

## [1.0.0-beta.6](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.5...@arcjet/env-v1.0.0-beta.6) (2025-04-17)


### 🚀 New Features

* Support Render deployments ([#3904](https://github.com/arcjet/arcjet-js/issues/3904)) ([b586318](https://github.com/arcjet/arcjet-js/commit/b58631803d7c94d4e5f9ff32321d4a35fc33b976)), closes [#3899](https://github.com/arcjet/arcjet-js/issues/3899)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.5 to 1.0.0-beta.6
    * @arcjet/rollup-config bumped from 1.0.0-beta.5 to 1.0.0-beta.6
    * @arcjet/tsconfig bumped from 1.0.0-beta.5 to 1.0.0-beta.6

## [1.0.0-beta.5](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.4...@arcjet/env-v1.0.0-beta.5) (2025-03-27)


### 🧹 Miscellaneous Chores

* **@arcjet/env:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.4 to 1.0.0-beta.5
    * @arcjet/rollup-config bumped from 1.0.0-beta.4 to 1.0.0-beta.5
    * @arcjet/tsconfig bumped from 1.0.0-beta.4 to 1.0.0-beta.5

## [1.0.0-beta.4](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.3...@arcjet/env-v1.0.0-beta.4) (2025-03-14)


### ⚠ BREAKING CHANGES

* Upgrade packages to eslint 9 ([#3531](https://github.com/arcjet/arcjet-js/issues/3531))

### deps

* Upgrade packages to eslint 9 ([#3531](https://github.com/arcjet/arcjet-js/issues/3531)) ([84826b5](https://github.com/arcjet/arcjet-js/commit/84826b51f0c7925ede7a889499bed3a188e48e65)), closes [#539](https://github.com/arcjet/arcjet-js/issues/539)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.3 to 1.0.0-beta.4
    * @arcjet/rollup-config bumped from 1.0.0-beta.3 to 1.0.0-beta.4
    * @arcjet/tsconfig bumped from 1.0.0-beta.3 to 1.0.0-beta.4

## [1.0.0-beta.3](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.2...@arcjet/env-v1.0.0-beta.3) (2025-03-05)


### 🧹 Miscellaneous Chores

* **@arcjet/env:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.2 to 1.0.0-beta.3
    * @arcjet/rollup-config bumped from 1.0.0-beta.2 to 1.0.0-beta.3
    * @arcjet/tsconfig bumped from 1.0.0-beta.2 to 1.0.0-beta.3

## [1.0.0-beta.2](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.1...@arcjet/env-v1.0.0-beta.2) (2025-02-04)


### 🚀 New Features

* **env:** Support MODE environment variable for `isDevelopment` detection ([#3012](https://github.com/arcjet/arcjet-js/issues/3012)) ([f3a45a7](https://github.com/arcjet/arcjet-js/commit/f3a45a7d253c759d467e5ff2c1a52a924ea7496c))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.1 to 1.0.0-beta.2
    * @arcjet/rollup-config bumped from 1.0.0-beta.1 to 1.0.0-beta.2
    * @arcjet/tsconfig bumped from 1.0.0-beta.1 to 1.0.0-beta.2

## [1.0.0-beta.1](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.34...@arcjet/env-v1.0.0-beta.1) (2025-01-15)


### 🧹 Miscellaneous Chores

* Switch most test harnesses to node:test ([#2479](https://github.com/arcjet/arcjet-js/issues/2479)) ([8a71bbc](https://github.com/arcjet/arcjet-js/commit/8a71bbc3d1fa6b63586f1bae7fa6f0f8d4fbad66))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
    * @arcjet/rollup-config bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
    * @arcjet/tsconfig bumped from 1.0.0-alpha.34 to 1.0.0-beta.1

## [1.0.0-alpha.34](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.33...@arcjet/env-v1.0.0-alpha.34) (2024-12-03)


### 🧹 Miscellaneous Chores

* **@arcjet/env:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34
    * @arcjet/rollup-config bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34
    * @arcjet/tsconfig bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34

## [1.0.0-alpha.33](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.32...@arcjet/env-v1.0.0-alpha.33) (2024-11-29)


### 🧹 Miscellaneous Chores

* **@arcjet/env:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33
    * @arcjet/rollup-config bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33
    * @arcjet/tsconfig bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33

## [1.0.0-alpha.32](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.31...@arcjet/env-v1.0.0-alpha.32) (2024-11-26)


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

## [1.0.0-alpha.31](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.30...@arcjet/env-v1.0.0-alpha.31) (2024-11-22)


### 🧹 Miscellaneous Chores

* **@arcjet/env:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31
    * @arcjet/rollup-config bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31
    * @arcjet/tsconfig bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31

## [1.0.0-alpha.30](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.29...@arcjet/env-v1.0.0-alpha.30) (2024-11-20)


### 🧹 Miscellaneous Chores

* **@arcjet/env:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30
    * @arcjet/rollup-config bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30
    * @arcjet/tsconfig bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30

## [1.0.0-alpha.29](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.28...@arcjet/env-v1.0.0-alpha.29) (2024-11-19)


### 🧹 Miscellaneous Chores

* **@arcjet/env:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29
    * @arcjet/rollup-config bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29
    * @arcjet/tsconfig bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29

## [1.0.0-alpha.28](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.27...@arcjet/env-v1.0.0-alpha.28) (2024-10-23)


### 🚀 New Features

* **ip:** Add Vercel platform-specific IP header detection ([#2022](https://github.com/arcjet/arcjet-js/issues/2022)) ([d886c76](https://github.com/arcjet/arcjet-js/commit/d886c763983b2adcf50223a56f80ba0df2df078a))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28
    * @arcjet/rollup-config bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28
    * @arcjet/tsconfig bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28

## [1.0.0-alpha.27](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.26...@arcjet/env-v1.0.0-alpha.27) (2024-10-01)


### 🧹 Miscellaneous Chores

* **@arcjet/env:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27
    * @arcjet/rollup-config bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27
    * @arcjet/tsconfig bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27

## [1.0.0-alpha.26](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.25...@arcjet/env-v1.0.0-alpha.26) (2024-09-16)


### 🧹 Miscellaneous Chores

* **@arcjet/env:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26
    * @arcjet/rollup-config bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26
    * @arcjet/tsconfig bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26

## [1.0.0-alpha.25](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.24...@arcjet/env-v1.0.0-alpha.25) (2024-09-10)


### 🧹 Miscellaneous Chores

* **@arcjet/env:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25
    * @arcjet/rollup-config bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25
    * @arcjet/tsconfig bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25

## [1.0.0-alpha.24](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.23...@arcjet/env-v1.0.0-alpha.24) (2024-09-05)


### 🧹 Miscellaneous Chores

* **@arcjet/env:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24
    * @arcjet/rollup-config bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24
    * @arcjet/tsconfig bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24

## [1.0.0-alpha.23](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.22...@arcjet/env-v1.0.0-alpha.23) (2024-09-02)


### 🧹 Miscellaneous Chores

* **@arcjet/env:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23
    * @arcjet/rollup-config bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23
    * @arcjet/tsconfig bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23

## [1.0.0-alpha.22](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.21...@arcjet/env-v1.0.0-alpha.22) (2024-08-26)


### 🧹 Miscellaneous Chores

* **@arcjet/env:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22
    * @arcjet/rollup-config bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22
    * @arcjet/tsconfig bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22

## [1.0.0-alpha.21](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.20...@arcjet/env-v1.0.0-alpha.21) (2024-08-05)


### 🧹 Miscellaneous Chores

* **@arcjet/env:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.20 to 1.0.0-alpha.21
    * @arcjet/rollup-config bumped from 1.0.0-alpha.20 to 1.0.0-alpha.21
    * @arcjet/tsconfig bumped from 1.0.0-alpha.20 to 1.0.0-alpha.21

## [1.0.0-alpha.20](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.19...@arcjet/env-v1.0.0-alpha.20) (2024-07-24)


### 📦 Dependencies

* **dev:** bump @rollup/wasm-node from 4.18.1 to 4.19.0 ([#1160](https://github.com/arcjet/arcjet-js/issues/1160)) ([7062ca0](https://github.com/arcjet/arcjet-js/commit/7062ca00012dd73b2e80f0679609be6e45ec5f5d))
* **dev:** bump typescript from 5.5.3 to 5.5.4 ([#1166](https://github.com/arcjet/arcjet-js/issues/1166)) ([644e3a6](https://github.com/arcjet/arcjet-js/commit/644e3a6e69d092626fdf4f356aaa8e8f974ae46b))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.19 to 1.0.0-alpha.20
    * @arcjet/rollup-config bumped from 1.0.0-alpha.19 to 1.0.0-alpha.20
    * @arcjet/tsconfig bumped from 1.0.0-alpha.19 to 1.0.0-alpha.20

## [1.0.0-alpha.19](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.18...@arcjet/env-v1.0.0-alpha.19) (2024-07-15)


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.18.0 to 4.18.1 ([#1092](https://github.com/arcjet/arcjet-js/issues/1092)) ([ffc298a](https://github.com/arcjet/arcjet-js/commit/ffc298ad030721519af02c6c2da26fd2bd3fbdbd))
* **dev:** Bump typescript from 5.5.2 to 5.5.3 ([#1065](https://github.com/arcjet/arcjet-js/issues/1065)) ([ef05395](https://github.com/arcjet/arcjet-js/commit/ef053953cf4a6cba621b778cba2e0dd4e114b626))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * @arcjet/rollup-config bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * @arcjet/tsconfig bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19

## [1.0.0-alpha.18](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.17...@arcjet/env-v1.0.0-alpha.18) (2024-07-01)


### 🪲 Bug Fixes

* **env:** Always rely on isDevelopment & remove isProduction helper ([#998](https://github.com/arcjet/arcjet-js/issues/998)) ([43423c6](https://github.com/arcjet/arcjet-js/commit/43423c650cb5b6f2e992af961faad52a4fcdd24f))


### 📦 Dependencies

* **dev:** Bump typescript from 5.4.5 to 5.5.2 ([#1011](https://github.com/arcjet/arcjet-js/issues/1011)) ([c17a101](https://github.com/arcjet/arcjet-js/commit/c17a101c5729db44ddf8a7e14d5e4184dcf38949))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * @arcjet/rollup-config bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * @arcjet/tsconfig bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18

## [1.0.0-alpha.17](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.16...@arcjet/env-v1.0.0-alpha.17) (2024-06-17)


### 🧹 Miscellaneous Chores

* **@arcjet/env:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * @arcjet/rollup-config bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * @arcjet/tsconfig bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17

## [1.0.0-alpha.16](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.15...@arcjet/env-v1.0.0-alpha.16) (2024-06-14)


### 🧹 Miscellaneous Chores

* **@arcjet/env:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/rollup-config bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/tsconfig bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16

## [1.0.0-alpha.15](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.14...@arcjet/env-v1.0.0-alpha.15) (2024-06-12)


### 🧹 Miscellaneous Chores

* **@arcjet/env:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/rollup-config bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/tsconfig bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15

## [1.0.0-alpha.14](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.13...@arcjet/env-v1.0.0-alpha.14) (2024-06-10)


### ⚠ BREAKING CHANGES

* Move all environment lookup into separate package ([#897](https://github.com/arcjet/arcjet-js/issues/897))

### 🚀 New Features

* Move all environment lookup into separate package ([#897](https://github.com/arcjet/arcjet-js/issues/897)) ([a5bb8ca](https://github.com/arcjet/arcjet-js/commit/a5bb8ca6bad9d831b3f67f12b3ef87048ced25bb))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/rollup-config bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/tsconfig bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
