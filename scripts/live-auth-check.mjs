#!/usr/bin/env node
// Real end-to-end check against Neon Managed Auth.
//
// This is NOT a mocked test. It creates an account, requests emails, and
// exercises provider enforcement. It refuses to run without an explicit
// disposable test address and a confirmation flag, and it never prints
// passwords, OTPs, reset tokens, cookies, or session data.
//
//   node scripts/live-auth-check.mjs \
//     --test-email=you+oppsift-e2e@example.com \
//     --confirm-live-email
//
// Endpoint paths come from API_ENDPOINTS in node_modules/@neon/auth/dist/types.d.ts.

import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const ENDPOINTS = {
  getSession: { path: "get-session", method: "GET" },
  signUpEmail: { path: "sign-up/email", method: "POST" },
  signInEmail: { path: "sign-in/email", method: "POST" },
  signOut: { path: "sign-out", method: "POST" },
  sendVerificationOtp: { path: "email-otp/send-verification-otp", method: "POST" },
  verifyEmailOtp: { path: "email-otp/verify-email", method: "POST" },
  requestPasswordReset: { path: "request-password-reset", method: "POST" },
  resetPassword: { path: "reset-password", method: "POST" },
};

const args = parseArgs(process.argv.slice(2));
const authUrl = args["auth-url"] ?? process.env.VITE_NEON_AUTH_URL ?? "";
const dataApiUrl = args["data-api-url"] ?? process.env.VITE_NEON_DATA_API_URL ?? "";
const testEmail = (args["test-email"] ?? "").trim().toLowerCase();
const displayName = args["name"] ?? "OppSift E2E Test";
const confirmed = Boolean(args["confirm-live-email"]);

const results = [];
const rl = createInterface({ input: stdin, output: stdout });

function parseArgs(argv) {
  const parsed = {};
  for (const entry of argv) {
    const match = entry.match(/^--([^=]+)(?:=(.*))?$/);
    if (!match) continue;
    parsed[match[1]] = match[2] === undefined ? true : match[2];
  }
  return parsed;
}

function record(name, status, detail) {
  results.push({ name, status, detail });
  const marker = { pass: "PASS", fail: "FAIL", skip: "SKIP", manual: "MANUAL" }[status];
  console.log(`\n[${marker}] ${name}\n     ${detail}`);
}

function newCredentials() {
  // Random per run so repeat runs exercise first-time registration.
  const suffix = randomBytes(3).toString("hex");
  const [local, domain] = testEmail.split("@");
  return {
    email: domain ? `${local}+e2e${suffix}@${domain}` : testEmail,
    password: `Op${randomBytes(12).toString("base64url")}!7`,
  };
}

const cookieJar = new Map();

function absorbCookies(response) {
  const cookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [];
  for (const cookie of cookies) {
    const [pair] = cookie.split(";");
    const separator = pair.indexOf("=");
    if (separator === -1) continue;
    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    if (value === "" || /Expires=Thu, 01 Jan 1970/i.test(cookie)) cookieJar.delete(name);
    else cookieJar.set(name, value);
  }
}

function cookieHeader() {
  return [...cookieJar].map(([name, value]) => `${name}=${value}`).join("; ");
}

let baseUrl = null;

async function call(endpoint, body, options = {}) {
  const url = `${baseUrl}/${endpoint.path}`;
  const headers = { Accept: "application/json", ...(options.headers ?? {}) };
  const cookies = cookieHeader();
  if (cookies) headers.Cookie = cookies;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(url, {
    method: endpoint.method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  absorbCookies(response);

  let payload = null;
  const text = await response.text().catch(() => "");
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  return { ok: response.ok, status: response.status, payload };
}

function failureReason(response) {
  const code = response.payload?.code ?? response.payload?.body?.code;
  const message = response.payload?.message ?? response.payload?.error?.message;
  return [code, message, `HTTP ${response.status}`].filter(Boolean).join(" · ");
}

async function resolveBaseUrl() {
  const candidates = [];
  if (authUrl) {
    candidates.push(authUrl.replace(/\/+$/, ""));
    try {
      candidates.push(`${new URL(authUrl).origin}/api/auth`);
    } catch {
      // Handled by the empty-result check below.
    }
  }

  for (const candidate of candidates) {
    baseUrl = candidate;
    try {
      const response = await call(ENDPOINTS.getSession);
      // A live Better Auth deployment answers get-session; a wrong base 404s
      // without a JSON body.
      if (response.status !== 404 || response.payload) {
        console.log(`Managed Auth base resolved: ${candidate}`);
        return true;
      }
    } catch {
      // Try the next candidate.
    }
  }
  baseUrl = null;
  return false;
}

function requireOperatorConfirmation() {
  if (!testEmail) {
    console.error(
      "Refusing to run: pass --test-email=<disposable address you control>.",
    );
    return false;
  }
  if (!confirmed) {
    console.error(
      "Refusing to run: this creates a real account and sends real email.\n" +
        "Add --confirm-live-email once you are ready to use the test mailbox.",
    );
    return false;
  }
  if (!authUrl) {
    console.error("Refusing to run: set VITE_NEON_AUTH_URL or pass --auth-url.");
    return false;
  }
  return true;
}

async function askForCode(question) {
  const answer = (await rl.question(question)).trim();
  return answer;
}

async function main() {
  if (!requireOperatorConfirmation()) process.exitCode = 2;
  else process.exitCode = await runChecks();
}

async function runChecks() {
  const credentials = newCredentials();
  console.log(`Test address: ${credentials.email}`);
  console.log("Passwords, OTPs, tokens and cookies are never printed.\n");

  if (!(await resolveBaseUrl())) {
    record("Managed Auth base reachable", "fail", "No candidate base answered get-session. Check VITE_NEON_AUTH_URL and trusted origins.");
    return summarise();
  }
  record("Managed Auth base reachable", "pass", "The configured endpoint answers the Auth API.");

  // 1. Register a new email account.
  const signUp = await call(ENDPOINTS.signUpEmail, {
    name: displayName,
    email: credentials.email,
    password: credentials.password,
  });
  const signUpState = {
    user: signUp.payload?.user ?? null,
    session: signUp.payload?.session ?? null,
  };
  record(
    "1. Register a new email account",
    signUp.ok ? "pass" : "fail",
    signUp.ok
      ? `Account created${signUpState.session ? " and a provisional session was issued" : ""}.`
      : `Registration rejected: ${failureReason(signUp)}`,
  );

  // 2. Attempt login before verification.
  const earlySignIn = await call(ENDPOINTS.signInEmail, {
    email: credentials.email,
    password: credentials.password,
  });
  const enforcementOn = !earlySignIn.ok;
  record(
    "2. Login attempt before verification",
    enforcementOn ? "pass" : "fail",
    enforcementOn
      ? `Provider denied the unverified sign-in: ${failureReason(earlySignIn)}`
      : "Provider ACCEPTED a sign-in for an unverified email. Enable mandatory email verification (requireEmailVerification) in Managed Auth before production.",
  );

  // 3. Verification email actually delivered.
  console.log("\nManaged Auth decides whether the sign-up already sent a code.");
  const resend = await call(ENDPOINTS.sendVerificationOtp, {
    email: credentials.email,
    type: "email-verification",
  });
  record(
    "3. Verification email delivered",
    resend.ok ? "manual" : "fail",
    resend.ok
      ? "The provider accepted the send request. Open the mailbox and answer below; a 2xx alone is not proof of delivery."
      : `Send request failed: ${failureReason(resend)}`,
  );

  let delivered = false;
  let otp = "";
  if (resend.ok) {
    const answer = await askForCode("Did the mailbox receive the OppSift verification email? [y/N] ");
    delivered = /^y(es)?$/i.test(answer);
    if (!delivered) {
      record("3. Verification email delivered", "fail", "No message arrived. Check the email provider configuration (SMTP/webhook), the sender domain, and spam placement.");
    } else {
      otp = await askForCode("Paste the verification code from the email (it is not logged): ");
    }
  }

  // 4. Incorrect code rejected, 5. correct code verifies.
  const invalid = await call(ENDPOINTS.verifyEmailOtp, {
    email: credentials.email,
    otp: "000000",
  });
  record(
    "4. Incorrect OTP rejected",
    !invalid.ok ? "pass" : "fail",
    !invalid.ok
      ? `Rejected: ${failureReason(invalid)}`
      : "Provider accepted a code that was almost certainly wrong. Review OTP attempt limits.",
  );

  let verified = false;
  if (/^\d{6}$/.test(otp)) {
    const verify = await call(ENDPOINTS.verifyEmailOtp, {
      email: credentials.email,
      otp,
    });
    verified = verify.ok;
    record(
      "5. Correct OTP verifies the account",
      verify.ok ? "pass" : "fail",
      verify.ok
        ? "The provider confirmed the code."
        : `Verification failed: ${failureReason(verify)}`,
    );

    // 6. Single-use behaviour: the same code must not work twice.
    const reuse = await call(ENDPOINTS.verifyEmailOtp, {
      email: credentials.email,
      otp,
    });
    record(
      "6. Verification code is single-use",
      verified && !reuse.ok ? "pass" : verified ? "fail" : "skip",
      verified
        ? reuse.ok
          ? "Provider ACCEPTED the same code twice. Treat this as a security finding."
          : `Replay rejected: ${failureReason(reuse)}`
        : "Skipped because the correct code did not verify.",
    );
  } else {
    record("5. Correct OTP verifies the account", "skip", otp ? "The code pasted was not 6 digits." : "No code was supplied.");
    record("6. Verification code is single-use", "skip", "Depends on a successful verification.");
  }

  // 7. Verified state visible on the session.
  const session = await call(ENDPOINTS.getSession);
  const sessionUser = session.payload?.user ?? null;
  record(
    "7. Verified account state on session",
    sessionUser?.emailVerified ? "pass" : "manual",
    sessionUser
      ? `Session reports emailVerified=${String(sessionUser.emailVerified)}. A signed-out run reports no session, which is expected after an unverified sign-up.`
      : "No session for this run. Confirm the verified flag after the successful sign-in below.",
  );

  // 8. Login after verification.
  const signIn = await call(ENDPOINTS.signInEmail, {
    email: credentials.email,
    password: credentials.password,
  });
  record(
    "8. Login after verification",
    signIn.ok ? "pass" : "fail",
    signIn.ok
      ? "Sign-in succeeded with the verified account."
      : `Sign-in failed: ${failureReason(signIn)}${verified ? "" : " (the account was never verified in this run)"}`,
  );

  // 9. Wrong password rejected.
  const wrongPassword = await call(ENDPOINTS.signInEmail, {
    email: credentials.email,
    password: `${credentials.password}-wrong`,
  });
  record(
    "9. Incorrect password rejected",
    !wrongPassword.ok ? "pass" : "fail",
    !wrongPassword.ok
      ? `Rejected: ${failureReason(wrongPassword)}`
      : "Provider accepted a wrong password. This is a critical finding.",
  );

  // 10. Duplicate registration handling.
  const duplicate = await call(ENDPOINTS.signUpEmail, {
    name: displayName,
    email: credentials.email,
    password: credentials.password,
  });
  record(
    "10. Duplicate account handling",
    !duplicate.ok ? "pass" : "fail",
    !duplicate.ok
      ? `Second registration rejected: ${failureReason(duplicate)}`
      : "Provider allowed a duplicate registration.",
  );

  // 11. Expired code behaviour.
  const staleOtp = (args["stale-otp"] ?? "").trim();
  if (/^\d{6}$/.test(staleOtp)) {
    const stale = await call(ENDPOINTS.verifyEmailOtp, {
      email: credentials.email,
      otp: staleOtp,
    });
    record(
      "11. Expired OTP rejected",
      !stale.ok ? "pass" : "fail",
      !stale.ok
        ? `Provider rejected the aged code: ${failureReason(stale)}`
        : "Provider ACCEPTED a code that was expected to have expired. Shorten the OTP TTL before production.",
    );
  } else {
    record(
      "11. Expired OTP rejected",
      "skip",
      "Pass --stale-otp=<a code older than the provider TTL> after waiting, or shorten the OTP expiry in Managed Auth and re-run.",
    );
  }

  // 12. Google OAuth.
  record(
    "12. Google OAuth sign-in",
    "skip",
    "Browser-only flow. Run it from the deployed app after configuring the provider in Neon; verify the callback origin and the new/existing account cases.",
  );

  // 13. Password recovery.
  if (signUp.ok) {
    const reset = await call(ENDPOINTS.requestPasswordReset, {
      email: credentials.email,
      redirectTo: "http://localhost:5173/reset-password",
    });
    record(
      "13. Password reset request",
      reset.ok ? "manual" : "fail",
      reset.ok
        ? "The provider accepted the request. Delivery and single-use must be confirmed from the mailbox."
        : `Request failed: ${failureReason(reset)}`,
    );

    if (reset.ok) {
      const answer = await askForCode("Received the reset email? Paste only the token value from the link (it is not logged): ");
      if (answer) {
        const newPassword = `Op${randomBytes(12).toString("base64url")}!9`;
        const applied = await call(ENDPOINTS.resetPassword, {
          newPassword,
          token: answer,
        });
        record(
          "13. Password reset completes",
          applied.ok ? "pass" : "fail",
          applied.ok
            ? "The provider accepted the single-use token."
            : `Reset failed: ${failureReason(applied)}`,
        );

        if (applied.ok) {
          const oldPasswordSignIn = await call(ENDPOINTS.signInEmail, {
            email: credentials.email,
            password: credentials.password,
          });
          const newPasswordSignIn = await call(ENDPOINTS.signInEmail, {
            email: credentials.email,
            password: newPassword,
          });
          record(
            "13. New password works and the old one stops working",
            newPasswordSignIn.ok && !oldPasswordSignIn.ok
              ? "pass"
              : "fail",
            `old-password sign-in: ${oldPasswordSignIn.ok ? "ACCEPTED (finding)" : "rejected"} · new-password sign-in: ${newPasswordSignIn.ok ? "accepted" : "rejected"}`,
          );
        }
      } else {
        record("13. Password reset completes", "skip", "No token supplied.");
      }
    }
  } else {
    record(
      "13. Password recovery",
      "skip",
      "Skipped because this run never created or reached an account. Resolve the registration failure above first.",
    );
  }

  // 14. Session restore, then sign-out.
  const restored = await call(ENDPOINTS.getSession);
  record(
    "14. Session restores for a signed-in browser",
    restored.ok && restored.payload?.user ? "pass" : "fail",
    restored.ok && restored.payload?.user
      ? "get-session returned the account."
      : `get-session returned ${failureReason(restored)}`,
  );

  const signedOut = await call(ENDPOINTS.signOut);
  const afterSignOut = await call(ENDPOINTS.getSession);
  record(
    "15. Sign-out ends the session",
    signedOut.ok && !afterSignOut.payload?.user ? "pass" : "fail",
    `sign-out ${signedOut.ok ? "succeeded" : `failed: ${failureReason(signedOut)}`} · post-sign-out session ${afterSignOut.payload?.user ? "STILL ACTIVE (finding)" : "cleared"}`,
  );

  // Protected backend endpoint without a session.
  if (dataApiUrl) {
    const endpoint = `${dataApiUrl.replace(/\/+$/, "")}/organization_saved_opportunities?select=id&limit=1`;
    let probe = null;
    try {
      probe = await fetch(endpoint, { headers: { Accept: "application/json" } });
    } catch (error) {
      record("16. Protected Data API denies anonymous reads", "skip", `Unreachable: ${error.message}`);
    }
    if (probe) {
      const denied = probe.status === 401 || probe.status === 403 || probe.status === 404;
      record(
        "16. Protected Data API denies anonymous reads",
        denied ? "pass" : probe.ok ? "fail" : "skip",
        probe.ok
          ? "Anonymous read RETURNED DATA. Fix RLS/grants before any deployment."
          : `HTTP ${probe.status}${denied ? " — denied as expected" : " — review grants and schema cache"}`,
      );
    }
  } else {
    record("16. Protected Data API denies anonymous reads", "skip", "Set VITE_NEON_DATA_API_URL or pass --data-api-url.");
  }

  await rl.close();
  return summarise();
}

function summarise() {
  const counts = results.reduce(
    (accumulator, item) => {
      accumulator[item.status] = (accumulator[item.status] ?? 0) + 1;
      return accumulator;
    },
    {},
  );

  console.log("\n──────────────────────────────────────────────");
  console.log("Live Managed Auth summary");
  for (const item of results) {
    const marker = { pass: "PASS", fail: "FAIL", skip: "SKIP", manual: "MANUAL" }[item.status];
    console.log(`  ${marker.padEnd(7)} ${item.name}`);
  }
  console.log(
    `\n  pass ${counts.pass ?? 0} · fail ${counts.fail ?? 0} · manual ${counts.manual ?? 0} · skip ${counts.skip ?? 0}`,
  );
  console.log("  Manual items still need the mailbox; skipped items need the Neon dashboard.");
  console.log("  A mocked Vitest suite is NOT equivalent evidence for any line above.");
  console.log("──────────────────────────────────────────────");

  return (counts.fail ?? 0) > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error(`\nLive check aborted: ${error.message}`);
  console.error("No result above this line should be treated as a pass.");
  process.exitCode = 1;
});
