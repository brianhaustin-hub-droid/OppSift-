const STORAGE_PREFIX = "oppsift-otp-resend-until:";

export const RESEND_COOLDOWN_MS = 60_000;

function storageKey(email: string) {
  return `${STORAGE_PREFIX}${email.trim().toLowerCase()}`;
}

export function getResendRemainingMs(email: string, now = Date.now()): number {
  if (!email.trim()) return 0;
  try {
    const stored = window.localStorage.getItem(storageKey(email));
    if (!stored) return 0;
    const until = Number(stored);
    if (!Number.isFinite(until)) return 0;
    return Math.max(until - now, 0);
  } catch (error) {
    console.error("Unable to read the OTP resend cooldown.", error);
    return 0;
  }
}

export function startResendCooldown(
  email: string,
  durationMs = RESEND_COOLDOWN_MS,
  now = Date.now(),
): void {
  if (!email.trim()) return;
  try {
    window.localStorage.setItem(storageKey(email), String(now + durationMs));
  } catch (error) {
    // A missing cooldown only weakens repeat-send throttling, which the
    // provider enforces independently, so the flow must still continue.
    console.error("Unable to save the OTP resend cooldown.", error);
  }
}

export function clearResendCooldown(email: string): void {
  if (!email.trim()) return;
  try {
    window.localStorage.removeItem(storageKey(email));
  } catch (error) {
    console.error("Unable to clear the OTP resend cooldown.", error);
  }
}

export function cooldownSeconds(remainingMs: number): number {
  return Math.ceil(remainingMs / 1_000);
}
