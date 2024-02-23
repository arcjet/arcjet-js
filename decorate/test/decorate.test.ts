/**
 * @jest-environment node
 */
import { describe, expect, test, afterEach, jest } from "@jest/globals";
import { setRateLimitHeaders } from "../index";

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe("setRateLimitHeaders", () => {
  // TODO: Test it
});
