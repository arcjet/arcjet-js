# Changelog

## [1.0.0-alpha.19](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.18...@arcjet/analyze-v1.0.0-alpha.19) (2024-07-15)


### 🚀 New Features

* detect common free/disposable email providers locally ([#1096](https://github.com/arcjet/arcjet-js/issues/1096)) ([115d016](https://github.com/arcjet/arcjet-js/commit/115d01662d4ff456cf4d81825338ef1099626fdf)), closes [#1095](https://github.com/arcjet/arcjet-js/issues/1095)


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.18.0 to 4.18.1 ([#1092](https://github.com/arcjet/arcjet-js/issues/1092)) ([ffc298a](https://github.com/arcjet/arcjet-js/commit/ffc298ad030721519af02c6c2da26fd2bd3fbdbd))
* **dev:** Bump typescript from 5.5.2 to 5.5.3 ([#1065](https://github.com/arcjet/arcjet-js/issues/1065)) ([ef05395](https://github.com/arcjet/arcjet-js/commit/ef053953cf4a6cba621b778cba2e0dd4e114b626))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/protocol bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * @arcjet/rollup-config bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * @arcjet/tsconfig bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19

## [1.0.0-alpha.18](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.17...@arcjet/analyze-v1.0.0-alpha.18) (2024-07-01)


### 🚀 New Features

* Allow characteristics to be specified on the SDK for fingerprint generation & propagate to rate limit rule ([#1016](https://github.com/arcjet/arcjet-js/issues/1016)) ([6b692da](https://github.com/arcjet/arcjet-js/commit/6b692da8e6da506a977ec5617a223b6512035a19)), closes [#1015](https://github.com/arcjet/arcjet-js/issues/1015)


### 📦 Dependencies

* **dev:** Bump typescript from 5.4.5 to 5.5.2 ([#1011](https://github.com/arcjet/arcjet-js/issues/1011)) ([c17a101](https://github.com/arcjet/arcjet-js/commit/c17a101c5729db44ddf8a7e14d5e4184dcf38949))


### 🧹 Miscellaneous Chores

* **analyze:** Regenerate WebAssembly ([#1041](https://github.com/arcjet/arcjet-js/issues/1041)) ([a45faa3](https://github.com/arcjet/arcjet-js/commit/a45faa3e39005bf089b7c37c7a5a15f1951c6529))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/protocol bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * @arcjet/rollup-config bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * @arcjet/tsconfig bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18

## [1.0.0-alpha.17](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.16...@arcjet/analyze-v1.0.0-alpha.17) (2024-06-17)


### 🧹 Miscellaneous Chores

* **@arcjet/analyze:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/protocol bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * @arcjet/rollup-config bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * @arcjet/tsconfig bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17

## [1.0.0-alpha.16](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.15...@arcjet/analyze-v1.0.0-alpha.16) (2024-06-14)


### 🧹 Miscellaneous Chores

* **@arcjet/analyze:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/protocol bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/rollup-config bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/tsconfig bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16

## [1.0.0-alpha.15](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.14...@arcjet/analyze-v1.0.0-alpha.15) (2024-06-12)


### 🧹 Miscellaneous Chores

* **@arcjet/analyze:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/protocol bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/rollup-config bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/tsconfig bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15

## [1.0.0-alpha.14](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.13...@arcjet/analyze-v1.0.0-alpha.14) (2024-06-10)


### ⚠ BREAKING CHANGES

* **analyze:** Leverage conditional exports to load Wasm appropriately ([#887](https://github.com/arcjet/arcjet-js/issues/887))
* **logger:** Align logger with Pino API ([#858](https://github.com/arcjet/arcjet-js/issues/858))

### 🚀 New Features

* **logger:** Align logger with Pino API ([#858](https://github.com/arcjet/arcjet-js/issues/858)) ([1806b94](https://github.com/arcjet/arcjet-js/commit/1806b94d7f7d0a7fd052e3121892d4dc1fdb719b)), closes [#822](https://github.com/arcjet/arcjet-js/issues/822) [#855](https://github.com/arcjet/arcjet-js/issues/855)


### 🪲 Bug Fixes

* **analyze:** Disable cache during base64 decode ([#838](https://github.com/arcjet/arcjet-js/issues/838)) ([72fb961](https://github.com/arcjet/arcjet-js/commit/72fb9610aa2ead7bf26121bb793ec2086b8d4f70))


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.17.2 to 4.18.0 ([#803](https://github.com/arcjet/arcjet-js/issues/803)) ([e6321af](https://github.com/arcjet/arcjet-js/commit/e6321afbad7127442d78b9c760c0e4c1ef73a77c))


### 📝 Documentation

* Add quick start links & update Bun example ([#870](https://github.com/arcjet/arcjet-js/issues/870)) ([ee3079f](https://github.com/arcjet/arcjet-js/commit/ee3079f21484ed3b5cf67ae03a45cb9d07b3d911))
* Remove wording that implies is Shield is added by default ([#796](https://github.com/arcjet/arcjet-js/issues/796)) ([a85d18c](https://github.com/arcjet/arcjet-js/commit/a85d18ca6f6da589cfad58d3167b1c8a4b1edc55))


### 🧹 Miscellaneous Chores

* **analyze:** Leverage conditional exports to load Wasm appropriately ([#887](https://github.com/arcjet/arcjet-js/issues/887)) ([d7a698f](https://github.com/arcjet/arcjet-js/commit/d7a698f136e93dc927c0cb9a9a8c48d15ed48f83))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/protocol bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/rollup-config bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/tsconfig bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14

## [1.0.0-alpha.13](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.12...@arcjet/analyze-v1.0.0-alpha.13) (2024-05-20)


### 🪲 Bug Fixes

* **analyze:** Leverage string interpolation to import Wasm files on edge runtime ([#784](https://github.com/arcjet/arcjet-js/issues/784)) ([9b85908](https://github.com/arcjet/arcjet-js/commit/9b8590817091971581735c39406fe6cf40472e5b))


### 📦 Dependencies

* **dev:** Bump @bytecodealliance/jco from 1.1.1 to 1.2.2 ([#707](https://github.com/arcjet/arcjet-js/issues/707)) ([39989b8](https://github.com/arcjet/arcjet-js/commit/39989b8278fa9329b4e2a2a6d3326b5f37e573e4))
* **dev:** Bump @bytecodealliance/jco from 1.2.2 to 1.2.4 ([#725](https://github.com/arcjet/arcjet-js/issues/725)) ([7c43124](https://github.com/arcjet/arcjet-js/commit/7c431248ffc99e3a59688264ec4c2876ab113000))
* **dev:** Bump @rollup/wasm-node from 4.14.3 to 4.17.2 ([#708](https://github.com/arcjet/arcjet-js/issues/708)) ([6e548bf](https://github.com/arcjet/arcjet-js/commit/6e548bf30743d06615dc9a0b46b3cbdabd6a89e4))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/logger bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
    * @arcjet/rollup-config bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
    * @arcjet/tsconfig bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13

## [1.0.0-alpha.12](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.11...@arcjet/analyze-v1.0.0-alpha.12) (2024-04-18)


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.14.1 to 4.14.3 ([#597](https://github.com/arcjet/arcjet-js/issues/597)) ([598adf0](https://github.com/arcjet/arcjet-js/commit/598adf0b3d61b9e9bce046c7c3e8ddef2802a37c))
* **dev:** Bump typescript from 5.4.4 to 5.4.5 ([#557](https://github.com/arcjet/arcjet-js/issues/557)) ([16af391](https://github.com/arcjet/arcjet-js/commit/16af3914d66f05eb3b0d79a9623d2c5ade52bddd))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/logger bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12
    * @arcjet/rollup-config bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12
    * @arcjet/tsconfig bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12

## [1.0.0-alpha.11](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.10...@arcjet/analyze-v1.0.0-alpha.11) (2024-04-08)


### 📦 Dependencies

* **dev:** Bump @bytecodealliance/jco from 1.0.3 to 1.1.1 ([#473](https://github.com/arcjet/arcjet-js/issues/473)) ([4584fe4](https://github.com/arcjet/arcjet-js/commit/4584fe43af549d4ec42565276f2fcf64cfdf3e57))
* **dev:** Bump @rollup/wasm-node from 4.13.0 to 4.13.2 ([#472](https://github.com/arcjet/arcjet-js/issues/472)) ([0268e51](https://github.com/arcjet/arcjet-js/commit/0268e51eb8967b2379014c1d16c65d1fbca13186))
* **dev:** Bump @rollup/wasm-node from 4.13.2 to 4.14.0 ([#493](https://github.com/arcjet/arcjet-js/issues/493)) ([ac14f3f](https://github.com/arcjet/arcjet-js/commit/ac14f3fb12157f9b2306ce2e703f80c081dcd9bc))
* **dev:** Bump @rollup/wasm-node from 4.14.0 to 4.14.1 ([#519](https://github.com/arcjet/arcjet-js/issues/519)) ([f859c0e](https://github.com/arcjet/arcjet-js/commit/f859c0eb071fcd83c68c8c94b60071217a600b3a))
* **dev:** Bump typescript from 5.4.2 to 5.4.3 ([#412](https://github.com/arcjet/arcjet-js/issues/412)) ([a69b76b](https://github.com/arcjet/arcjet-js/commit/a69b76b011a58bad21dc0763661927003c6b2a2e))
* **dev:** Bump typescript from 5.4.3 to 5.4.4 ([#509](https://github.com/arcjet/arcjet-js/issues/509)) ([8976fb1](https://github.com/arcjet/arcjet-js/commit/8976fb1b49f06b50b2a1d52b8a4619548993c737))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/logger bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11
    * @arcjet/rollup-config bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11
    * @arcjet/tsconfig bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11

## [1.0.0-alpha.10](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.9...@arcjet/analyze-v1.0.0-alpha.10) (2024-03-13)


### 🚀 New Features

* **analyze:** Replace wasm-bindgen with jco generated bindings ([#334](https://github.com/arcjet/arcjet-js/issues/334)) ([48359ff](https://github.com/arcjet/arcjet-js/commit/48359ff986cc0ff4888fc2df6a89e9b6f9a5b697))


### 📦 Dependencies

* **dev:** Bump @bytecodealliance/jco from 1.0.2 to 1.0.3 ([#365](https://github.com/arcjet/arcjet-js/issues/365)) ([bb1470e](https://github.com/arcjet/arcjet-js/commit/bb1470e2c4133501aafe685f76b65e09b19b4df2))
* **dev:** Bump @rollup/wasm-node from 4.12.0 to 4.12.1 ([#320](https://github.com/arcjet/arcjet-js/issues/320)) ([7f07a8f](https://github.com/arcjet/arcjet-js/commit/7f07a8f78e2f2bf67ab0eba032eeb311704c4eee))
* **dev:** Bump @rollup/wasm-node from 4.12.1 to 4.13.0 ([#359](https://github.com/arcjet/arcjet-js/issues/359)) ([8658316](https://github.com/arcjet/arcjet-js/commit/8658316b252f9224069d5c11b8fc6acb6681c90e))
* **dev:** Bump typescript from 5.3.3 to 5.4.2 ([#321](https://github.com/arcjet/arcjet-js/issues/321)) ([e0c2914](https://github.com/arcjet/arcjet-js/commit/e0c2914ab868d4a3e571c959f4b00284bbbc3050))


### 🧹 Miscellaneous Chores

* **analyze:** Replace node import with crypto global ([#335](https://github.com/arcjet/arcjet-js/issues/335)) ([bcc27f2](https://github.com/arcjet/arcjet-js/commit/bcc27f26dc740914c15f7adc99c1ad845b9458ff))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/logger bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10
    * @arcjet/rollup-config bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10
    * @arcjet/tsconfig bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10

## [1.0.0-alpha.9](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.8...@arcjet/analyze-v1.0.0-alpha.9) (2024-03-04)


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.10.0 to 4.12.0 ([#235](https://github.com/arcjet/arcjet-js/issues/235)) ([cf7ffc2](https://github.com/arcjet/arcjet-js/commit/cf7ffc2ae35d75884a04c88818f8c780ca7af223))
* **dev:** Bump @rollup/wasm-node from 4.9.6 to 4.10.0 ([#223](https://github.com/arcjet/arcjet-js/issues/223)) ([47c24b4](https://github.com/arcjet/arcjet-js/commit/47c24b40a8419f1dabcf8607c90dfcb97f6a4195))


### 🧹 Miscellaneous Chores

* Add bugs and author info & update readme ([#254](https://github.com/arcjet/arcjet-js/issues/254)) ([9b0d2fc](https://github.com/arcjet/arcjet-js/commit/9b0d2fc674fdc1ddf9952b9a2ef3f5f3c860d41a))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/logger bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9
    * @arcjet/rollup-config bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9
    * @arcjet/tsconfig bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9

## [1.0.0-alpha.8](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.7...@arcjet/analyze-v1.0.0-alpha.8) (2024-02-09)


### 📦 Dependencies

* **dev:** bump @rollup/wasm-node from 4.9.1 to 4.9.2 ([#97](https://github.com/arcjet/arcjet-js/issues/97)) ([eff4226](https://github.com/arcjet/arcjet-js/commit/eff4226ad0581dd7c5dff69bd3f259f058679f6e))
* **dev:** bump @rollup/wasm-node from 4.9.2 to 4.9.4 ([#119](https://github.com/arcjet/arcjet-js/issues/119)) ([ec50b96](https://github.com/arcjet/arcjet-js/commit/ec50b96ed3e96735d80a8f556d5a1cd8a68287c5))
* **dev:** bump @rollup/wasm-node from 4.9.4 to 4.9.5 ([#131](https://github.com/arcjet/arcjet-js/issues/131)) ([9fff856](https://github.com/arcjet/arcjet-js/commit/9fff856af1291bd05f7d5b6a02e007f5619e73c9))
* **dev:** bump @rollup/wasm-node from 4.9.5 to 4.9.6 ([#152](https://github.com/arcjet/arcjet-js/issues/152)) ([3e54cff](https://github.com/arcjet/arcjet-js/commit/3e54cffa4419470fdfc52712a34a20b919189fc5))


### 📝 Documentation

* Update Arcjet description ([#122](https://github.com/arcjet/arcjet-js/issues/122)) ([c011bc2](https://github.com/arcjet/arcjet-js/commit/c011bc262159c8f09fadff381ea71f475fed0b16))


### 🧹 Miscellaneous Chores

* **analyze:** Regenerate WebAssembly and bindings ([#92](https://github.com/arcjet/arcjet-js/issues/92)) ([b10ce31](https://github.com/arcjet/arcjet-js/commit/b10ce310c3a0170000c362510e785d81506e5b88))
* **rollup:** Externalize all imports that end with `.wasm?module` ([#217](https://github.com/arcjet/arcjet-js/issues/217)) ([ee6f387](https://github.com/arcjet/arcjet-js/commit/ee6f387d517eb78e974a92e7e39f60e7f1d3231c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/logger bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8
    * @arcjet/rollup-config bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8
    * @arcjet/tsconfig bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8

## [1.0.0-alpha.7](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.6...@arcjet/analyze-v1.0.0-alpha.7) (2023-12-21)


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

## [1.0.0-alpha.6](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.5...@arcjet/analyze-v1.0.0-alpha.6) (2023-12-18)


### 🧹 Miscellaneous Chores

* **deps-dev:** Bump the dev-dependencies group with 2 updates ([#55](https://github.com/arcjet/arcjet-js/issues/55)) ([94839f3](https://github.com/arcjet/arcjet-js/commit/94839f3105ab2be5f1e5cdf02278ca7cc24850c1))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/logger bumped from 1.0.0-alpha.5 to 1.0.0-alpha.6
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.5 to 1.0.0-alpha.6
    * @arcjet/rollup-config bumped from 1.0.0-alpha.5 to 1.0.0-alpha.6
    * @arcjet/tsconfig bumped from 1.0.0-alpha.5 to 1.0.0-alpha.6
