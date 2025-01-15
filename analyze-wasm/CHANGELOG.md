# Changelog

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
