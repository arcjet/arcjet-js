/**
 * @jest-environment ./test/runtime-env
 * @jest-environment-options {"navigator": {"userAgent": "Cloudflare-Workers"}}
 */

// These tests are written in JS because otherwise the jest-environment pragma
// is moved by rollup. See also https://github.com/jestjs/jest/issues/12573

import { describe, expect, test } from "@jest/globals";
import { runtime } from "../index";

describe("workerd detection", () => {
  test("detects workerd if appropriate globals are available", () => {
    expect(runtime()).toEqual("workerd");
  });
});
