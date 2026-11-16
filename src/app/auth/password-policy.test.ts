import { describe, expect, it } from "vitest";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  validateNewPassword,
  validatePassword,
} from "./password-policy";

describe("password policy", () => {
  it("accepts an ordinary password inside the managed hashing window", () => {
    expect(validatePassword("correct-horse-7")).toBeNull();
  });

  it("states the minimum length", () => {
    expect(validatePassword("a".repeat(MIN_PASSWORD_LENGTH - 1))).toBe(
      "Your password must be at least 8 characters long.",
    );
  });

  it("rejects what bcrypt cannot hash", () => {
    expect(validatePassword("a".repeat(MAX_PASSWORD_LENGTH))).toBeNull();
    expect(validatePassword("a".repeat(MAX_PASSWORD_LENGTH + 1))).toContain(
      `${MAX_PASSWORD_LENGTH} characters or fewer`,
    );
  });

  it("rejects values that cannot be typed reliably", () => {
    expect(validatePassword("            ")).toContain("cannot be only spaces");
    expect(validatePassword(" padded password ")).toContain(
      "cannot start or end with a space",
    );
  });

  it("rejects breached passwords regardless of casing", () => {
    expect(validatePassword("password123")).toContain("too common");
    expect(validatePassword("Password123")).toContain("too common");
    expect(validatePassword("OppSift123")).toContain("too common");
  });

  it("rejects the email local part when it could stand alone as the password", () => {
    expect(
      validatePassword("policytester", { email: "PolicyTester@example.test" }),
    ).toContain("local part of your email address");
  });

  it("does not compare the local part when it is shorter than the minimum", () => {
    expect(validatePassword("person12", { email: "person@example.test" })).toBeNull();
  });

  it("lets callers name the field in the message", () => {
    expect(validatePassword("short", { label: "New password" })).toBe(
      "New password must be at least 8 characters long.",
    );
  });

  it("confirms the match only after the policy passes", () => {
    expect(validateNewPassword("correct-horse-7", "correct-horse-8")).toBe(
      "Passwords do not match.",
    );
    expect(validateNewPassword("password123", "password123")).toContain("too common");
    expect(validateNewPassword("correct-horse-7", "correct-horse-7")).toBeNull();
  });

  it("checks the email local part through the registration helper", () => {
    expect(
      validateNewPassword("policytester", "policytester", {
        email: "policytester@example.test",
      }),
    ).toContain("local part of your email address");
  });
});
