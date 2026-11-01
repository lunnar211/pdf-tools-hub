import { describe, it, expect } from "vitest";
import { validateNext, DEFAULT_POST_LOGIN_PATH } from "@/lib/redirect";

describe("validateNext (open-redirect guard)", () => {
  it("accepts plain same-site paths", () => {
    expect(validateNext("/account")).toBe("/account");
    expect(validateNext("/admin/users")).toBe("/admin/users");
    expect(validateNext("/")).toBe("/");
    expect(validateNext("/onboarding?x=1")).toBe("/onboarding?x=1");
  });
  it("falls back for missing input", () => {
    expect(validateNext(null)).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(validateNext(undefined)).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(validateNext("")).toBe(DEFAULT_POST_LOGIN_PATH);
  });
  it("rejects absolute and protocol-relative URLs", () => {
    expect(validateNext("https://evil.example")).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(validateNext("http://evil.example/x")).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(validateNext("//evil.example")).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(validateNext("//evil.example/account")).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(validateNext("javascript:alert(1)")).toBe(DEFAULT_POST_LOGIN_PATH);
  });
  it("rejects backslash and scheme tricks", () => {
    expect(validateNext("/\\evil.example")).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(validateNext("/foo://evil.example")).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(validateNext("https:evil.example")).toBe(DEFAULT_POST_LOGIN_PATH);
  });
  it("rejects control characters", () => {
    expect(validateNext("/account\nhttps://evil.example")).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(validateNext("/account\r")).toBe(DEFAULT_POST_LOGIN_PATH);
  });
});
