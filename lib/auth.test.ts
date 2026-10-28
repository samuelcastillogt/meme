import { describe, expect, it } from "vitest";
import { createSessionToken, isValidSessionToken } from "./auth-token";

describe("admin session token", () => {
  it("accepts a signed, unexpired token", () => {
    const token = createSessionToken("test-secret", Date.now() + 60_000);
    expect(isValidSessionToken(token, "test-secret")).toBe(true);
  });

  it("rejects expired or tampered tokens", () => {
    const expired = createSessionToken("test-secret", Date.now() - 1);
    const valid = createSessionToken("test-secret", Date.now() + 60_000);
    expect(isValidSessionToken(expired, "test-secret")).toBe(false);
    expect(isValidSessionToken(`${valid}x`, "test-secret")).toBe(false);
  });
});
