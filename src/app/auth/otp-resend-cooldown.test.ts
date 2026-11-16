import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  RESEND_COOLDOWN_MS,
  clearResendCooldown,
  cooldownSeconds,
  getResendRemainingMs,
  startResendCooldown,
} from "./otp-resend-cooldown";

const NOW = 1_730_000_000_000;

describe("OTP resend cooldown", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("keeps the window for the normalized address", () => {
    startResendCooldown("  Person@Example.TEST  ", RESEND_COOLDOWN_MS, NOW);

    expect(getResendRemainingMs("person@example.test", NOW)).toBe(RESEND_COOLDOWN_MS);
    expect(getResendRemainingMs("PERSON@EXAMPLE.TEST", NOW + 35_000)).toBe(25_000);
    expect(window.localStorage.length).toBe(1);
    expect(window.localStorage.key(0)).toContain("person@example.test");
  });

  it("reports no cooldown for another address or an unknown one", () => {
    startResendCooldown("person@example.test", RESEND_COOLDOWN_MS, NOW);

    expect(getResendRemainingMs("someone.else@example.test", NOW)).toBe(0);
  });

  it("never returns a negative window", () => {
    startResendCooldown("person@example.test", RESEND_COOLDOWN_MS, NOW);

    expect(getResendRemainingMs("person@example.test", NOW + RESEND_COOLDOWN_MS)).toBe(0);
    expect(getResendRemainingMs("person@example.test", NOW + RESEND_COOLDOWN_MS + 9_000))
      .toBe(0);
  });

  it("ignores a value it cannot read back", () => {
    startResendCooldown("person@example.test", RESEND_COOLDOWN_MS, NOW);
    window.localStorage.setItem(
      `oppsift-otp-resend-until:person@example.test`,
      "not-a-number",
    );

    expect(getResendRemainingMs("person@example.test", NOW)).toBe(0);
  });

  it("clears once the provider confirms the code", () => {
    startResendCooldown("person@example.test", RESEND_COOLDOWN_MS, NOW);
    clearResendCooldown("person@example.test");

    expect(getResendRemainingMs("person@example.test", NOW)).toBe(0);
    expect(window.localStorage.length).toBe(0);
  });

  it("ignores an empty address so no orphan key is written", () => {
    startResendCooldown("   ", RESEND_COOLDOWN_MS, NOW);

    expect(getResendRemainingMs("", NOW)).toBe(0);
    expect(window.localStorage.length).toBe(0);
  });

  it("rounds a partial second up so the countdown never lands on zero early", () => {
    expect(cooldownSeconds(0)).toBe(0);
    expect(cooldownSeconds(1)).toBe(1);
    expect(cooldownSeconds(RESEND_COOLDOWN_MS)).toBe(60);
    expect(cooldownSeconds(RESEND_COOLDOWN_MS + 1)).toBe(61);
  });
});
