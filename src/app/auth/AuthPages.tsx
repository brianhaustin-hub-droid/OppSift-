import { useEffect, useState, type FormEvent } from "react";
import { RouteLink, useNavigate } from "../routing/router";
import { useAuth } from "./AuthProvider";
import {
  neonClient,
  neonConfigurationError,
  neonSignUpEnabled,
} from "./neon-client";
import { OAuthButton } from "./OAuthButtons";
import { OtpInput } from "./OtpInput";
import { BrandLogo } from "../../shared/ui/BrandLogo";
import { supportedCountries } from "../../features/opportunities/country-registry";
import { validateNewPassword } from "./password-policy";
import {
  RESEND_COOLDOWN_MS,
  clearResendCooldown,
  cooldownSeconds,
  getResendRemainingMs,
  startResendCooldown,
} from "./otp-resend-cooldown";

type AuthPageProps = {
  page: "login" | "register" | "forgot-password" | "reset-password" | "verify-email";
};

type NeonEmailOtpClient = {
  sendVerificationOtp(input: {
    email: string;
    type: "email-verification";
  }): Promise<{ error: { message?: string } | null }>;
  verifyEmail(input: {
    email: string;
    otp: string;
  }): Promise<{ error: { message?: string } | null }>;
};

function isNeonEmailOtpClient(value: unknown): value is NeonEmailOtpClient {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof Reflect.get(value, "sendVerificationOtp") === "function" &&
    typeof Reflect.get(value, "verifyEmail") === "function"
  );
}

function getEmailOtpClient(auth: NonNullable<typeof neonClient>["auth"]) {
  const emailOtp: unknown = Reflect.get(auth, "emailOtp");
  if (!isNeonEmailOtpClient(emailOtp)) {
    throw new Error("This Neon Managed Auth endpoint does not support email OTP verification.");
  }
  return emailOtp;
}

function authErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message.trim() : "";
  if (/user_already_exists|already exists|already registered|duplicate/i.test(message)) {
    return "An account with this email already exists. Sign in or reset your password.";
  }
  if (/too many|rate.?limit|too_many_attempts|429|wait before trying/i.test(message)) {
    return "Too many attempts. Wait a moment, then try again.";
  }
  return message || "The request could not be completed. Please try again.";
}

function verificationErrorMessage(error: unknown) {
  const message = authErrorMessage(error);
  if (/expired|timeout|too late|has been used|already (been )?used|invalid or used/i.test(message)) {
    return "That verification code has expired or was already used. Request a new code.";
  }
  if (/invalid|incorrect|not valid|wrong|no such|not found/i.test(message)) {
    return "That verification code is incorrect. Check it, or request a new code if it has expired.";
  }
  return message;
}

function resetErrorMessage(error: unknown) {
  const message = authErrorMessage(error);
  if (/expired|invalid.*(token|link)|token.*(invalid|expired)/i.test(message)) {
    return "This password reset link is invalid or expired. Request a new one.";
  }
  return message;
}

function isUnverifiedEmailError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /email.{0,40}(not verified|unverified)|verification.{0,40}(required|verify)/i.test(
    message,
  );
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function safeReturnPath() {
  const requested = new URLSearchParams(window.location.search).get("redirectTo");
  if (!requested?.startsWith("/") || requested.startsWith("//")) return "/dashboard";

  try {
    const target = new URL(requested, window.location.origin);
    return target.origin === window.location.origin
      ? `${target.pathname}${target.search}${target.hash}`
      : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

function verifyEmailHref(email: string) {
  const params = new URLSearchParams({ email });
  const requestedRedirect = new URLSearchParams(window.location.search).get("redirectTo");
  if (requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")) {
    params.set("redirectTo", requestedRedirect);
  }
  return `/verify-email?${params.toString()}`;
}

function AuthAside({ page }: { page: string }) {
  const isRegister = page === "register";

  return (
    <aside className="auth-layout-aside" aria-hidden="true">
      <div className="auth-aside__brand">
        <BrandLogo variant="light" size="sm" />
      </div>

      <div className="auth-aside__content">
        <div className="auth-aside__eyebrow">
          {isRegister ? "Join Global Leaders" : "Enterprise Access"}
        </div>
        <h2 className="auth-aside__title">
          {isRegister
            ? "Discover contracts and funding worldwide."
            : "Welcome back to your intelligence workspace."}
        </h2>
        <p className="auth-aside__desc">
          Preview the OppSift approach to researching tenders, grants, and
          commercial opportunities. Source integrations and live coverage are
          not yet connected.
        </p>

        <div className="auth-aside__features">
          <div className="auth-aside__feature">
            <span className="auth-aside__feature-check">✓</span>
            <span>
              {supportedCountries.length} markets in the approved research scope
            </span>
          </div>
          <div className="auth-aside__feature">
            <span className="auth-aside__feature-check">✓</span>
            <span>Planned standardized categories and CPV indexing</span>
          </div>
          <div className="auth-aside__feature">
            <span className="auth-aside__feature-check">✓</span>
            <span>Preview pursuit pipeline and task-preparation workspace</span>
          </div>
        </div>
      </div>

      <div className="auth-aside__footer">
        OppSift · Global Opportunity Intelligence
      </div>
    </aside>
  );
}

function AuthSetupNotice() {
  return (
    <div className="auth-layout-shell">
      <div className="auth-layout-main">
        <section className="auth-panel" aria-labelledby="auth-setup-title">
          <BrandLogo className="auth-panel__brand" size="sm" />
          <p className="page-heading__eyebrow">Account access</p>
          <h1 id="auth-setup-title">Authentication isn’t configured</h1>
          <p>
            Connect this deployment to Neon Managed Auth and the Neon Data API
            before enabling account access.
          </p>
          <p className="auth-panel__error" role="status">
            {neonConfigurationError}
          </p>
          <RouteLink className="ui-button ui-button--secondary" href="/dashboard">
            Return to overview
          </RouteLink>
        </section>
      </div>
      <AuthAside page="login" />
    </div>
  );
}

function AuthForm({
  page,
}: {
  page: Exclude<AuthPageProps["page"], "verify-email">;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [resetToken] = useState(
    () => new URLSearchParams(window.location.search).get("token") ?? "",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState(
    () => new URLSearchParams(window.location.search).get("email") ?? "",
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!resetToken) return;
    const params = new URLSearchParams(window.location.search);
    params.delete("token");
    const search = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`,
    );
  }, [resetToken]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    try {
      if (!neonClient) throw new Error(neonConfigurationError);
      if (page === "login") {
        const normalizedEmail = email.trim();
        if (!isValidEmail(normalizedEmail)) {
          throw new Error("Enter a valid email address.");
        }
        const result = await neonClient.auth.signIn.email({
          email: normalizedEmail,
          password,
        });
        if (result.error) throw new Error(result.error.message || "Sign-in failed.");
        navigate(safeReturnPath());
      } else if (page === "forgot-password") {
        const normalizedEmail = email.trim();
        if (!isValidEmail(normalizedEmail)) {
          throw new Error("Enter a valid email address.");
        }
        const result = await neonClient.auth.requestPasswordReset({
          email: normalizedEmail,
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (result.error) throw new Error(result.error.message || "Request failed.");
        setMessage("If the account is eligible, a password reset email will be sent.");
      } else {
        if (!resetToken) throw new Error("The password reset link is missing its token.");
        const policyError = validateNewPassword(password, confirmPassword);
        if (policyError) throw new Error(policyError);
        const result = await neonClient.auth.resetPassword({
          newPassword: password,
          token: resetToken,
        });
        if (result.error) throw new Error(result.error.message || "Password reset failed.");
        setMessage("Your password has been updated. You can now sign in.");
      }
    } catch (requestError) {
      if (page === "login" && isUnverifiedEmailError(requestError)) {
        navigate(verifyEmailHref(email.trim()));
      } else if (page === "reset-password") {
        setError(resetErrorMessage(requestError));
      } else {
        setError(authErrorMessage(requestError));
      }
    } finally {
      setBusy(false);
    }
  }

  async function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    try {
      if (!neonClient) throw new Error(neonConfigurationError);
      if (!agreeTerms) {
        throw new Error("Please agree to the OppSift Terms of Service and Privacy Policy.");
      }
      const normalizedName = name.trim();
      const normalizedEmail = email.trim();
      if (!normalizedName) throw new Error("Enter your full name.");
      if (!isValidEmail(normalizedEmail)) {
        throw new Error("Enter a valid email address.");
      }
      const policyError = validateNewPassword(password, confirmPassword, {
        email: normalizedEmail,
      });
      if (policyError) throw new Error(policyError);
      const result = await neonClient.auth.signUp.email({
        name: normalizedName,
        email: normalizedEmail,
        password,
      });
      if (result.error) throw new Error(result.error.message || "Account creation failed.");
      startResendCooldown(normalizedEmail, RESEND_COOLDOWN_MS);
      navigate(verifyEmailHref(normalizedEmail));
    } catch (requestError) {
      setError(authErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setBusy(true);
    setError("");
    try {
      if (!neonClient) throw new Error(neonConfigurationError);
      const result = await neonClient.auth.signIn.social({
        provider: "google",
        callbackURL: `${window.location.origin}${safeReturnPath()}`,
      });
      if (result.error) throw new Error(result.error.message || "Google sign-in failed.");
    } catch (requestError) {
      setError(authErrorMessage(requestError));
      setBusy(false);
    }
  }

  if (user) {
    return (
      <div className="auth-layout-shell">
        <div className="auth-layout-main">
          <section className="auth-panel" aria-labelledby="auth-signed-in-title">
            <BrandLogo className="auth-panel__brand" size="sm" />
            <p className="page-heading__eyebrow">Account access</p>
            <h1 id="auth-signed-in-title">You’re signed in</h1>
            <p>Signed in as {user.email}.</p>
            <RouteLink className="ui-button ui-button--primary" href={safeReturnPath()}>
              Continue to OppSift
            </RouteLink>
          </section>
        </div>
        <AuthAside page={page} />
      </div>
    );
  }

  const isLogin = page === "login";
  const isRegister = page === "register";
  const isForgot = page === "forgot-password";
  const isReset = page === "reset-password";
  if (isRegister && !neonSignUpEnabled) {
    return (
      <div className="auth-layout-shell">
        <div className="auth-layout-main">
          <section className="auth-panel" aria-labelledby="registration-disabled-title">
            <BrandLogo className="auth-panel__brand" size="sm" />
            <p className="page-heading__eyebrow">Account access</p>
            <h1 id="registration-disabled-title">Sign-up is unavailable</h1>
            <p>New accounts are not being accepted in this deployment.</p>
            <RouteLink className="ui-button ui-button--primary" href="/login">
              Back to sign in
            </RouteLink>
          </section>
        </div>
        <AuthAside page={page} />
      </div>
    );
  }

  const title = isLogin
    ? "Sign in to OppSift"
    : isForgot
      ? "Reset your password"
      : isReset
        ? "Choose a new password"
        : "Create your account";
  const googleOAuthEnabled = import.meta.env.VITE_NEON_GOOGLE_OAUTH_ENABLED === "true";

  return (
    <div className="auth-layout-shell">
      <div className="auth-layout-main">
        <section className="auth-panel" aria-labelledby="auth-title">
          <BrandLogo className="auth-panel__brand" size="sm" />
          <p className="page-heading__eyebrow">Global Opportunity Intelligence</p>
          <h1 id="auth-title">{title}</h1>
          <p>
            {isLogin
              ? "Sign in to your OppSift preview workspace."
              : isRegister
                ? "Create an account to explore the OppSift preview."
                : isReset
                  ? "Set a new password using your single-use reset link."
                  : "Enter your registered email to receive recovery instructions."}
          </p>

          {(isLogin || isRegister) && (
            <div className="auth-oauth-group">
              <OAuthButton
                provider="google"
                disabled={busy}
                notConfiguredMessage={
                  googleOAuthEnabled ? undefined : "Google OAuth provider not configured"
                }
                onClick={() => void signInWithGoogle()}
              />
            </div>
          )}

          {!isForgot && !isReset && (
            <div className="auth-panel__divider">or continue with email</div>
          )}

          <form
            className="auth-form"
            onSubmit={isLogin ? submit : isForgot || isReset ? submit : signUp}
          >
            {isRegister && (
              <label>
                Full Name
                <input
                  autoComplete="name"
                  maxLength={120}
                  onChange={(event) => setName(event.currentTarget.value)}
                  placeholder="e.g. Elena Rostova"
                  required
                  value={name}
                />
              </label>
            )}

            {!isReset && (
              <label>
                Work Email
                <input
                  autoComplete="email"
                  onChange={(event) => setEmail(event.currentTarget.value)}
                  placeholder="name@company.com"
                  required
                  type="email"
                  value={email}
                />
              </label>
            )}

            {!isForgot && (
              <label>
                {isReset ? "New password" : "Password"}
                <input
                  autoComplete={isReset || isRegister ? "new-password" : "current-password"}
                  maxLength={72}
                  minLength={isReset || isRegister ? 8 : undefined}
                  onChange={(event) => setPassword(event.currentTarget.value)}
                  placeholder={
                    isReset || isRegister
                      ? "At least 8 characters"
                      : "Your password"
                  }
                  required
                  type="password"
                  value={password}
                />
              </label>
            )}

            {isReset && (
              <label>
                Confirm new password
                <input
                  autoComplete="new-password"
                  maxLength={72}
                  minLength={8}
                  onChange={(event) => setConfirmPassword(event.currentTarget.value)}
                  placeholder="Re-enter your new password"
                  required
                  type="password"
                  value={confirmPassword}
                />
              </label>
            )}

            {isReset && (
              <p>
                Password reset links are single-use and expire according to the
                Managed Auth policy.
              </p>
            )}

            {isRegister && (
              <label>
                Confirm password
                <input
                  autoComplete="new-password"
                  maxLength={72}
                  onChange={(event) => setConfirmPassword(event.currentTarget.value)}
                  placeholder="Re-enter password"
                  required
                  type="password"
                  value={confirmPassword}
                />
              </label>
            )}

            {isRegister && (
              <label className="auth-form__checkbox-label">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  required
                />
                <span>
                  I acknowledge the OppSift Terms of Service and Privacy Policy,
                  and understand this workspace is in development preview.
                </span>
              </label>
            )}

            {error && <p className="auth-panel__error" role="alert">{error}</p>}
            {message && <p className="auth-panel__message" role="status">{message}</p>}

            <button
              className="ui-button ui-button--primary auth-form__submit"
              disabled={busy}
              type="submit"
            >
              {busy
                ? "Please wait…"
                : isLogin
                  ? "Sign In"
                  : isForgot
                    ? "Send Reset Link"
                    : isReset
                      ? "Update Password"
                      : "Create Free Account"}
            </button>
          </form>

          {isLogin && (
            <p className="auth-panel__links">
              <RouteLink href="/forgot-password">Forgot password?</RouteLink>
              {neonSignUpEnabled && (
                <RouteLink href="/register">Don't have an account? Sign up</RouteLink>
              )}
            </p>
          )}

          {isForgot && (
            <p className="auth-panel__links">
              <RouteLink href="/login">Back to sign in</RouteLink>
            </p>
          )}

          {isReset && (
            <p className="auth-panel__links">
              <RouteLink href="/login">Back to sign in</RouteLink>
            </p>
          )}

          {isRegister && (
            <p className="auth-panel__links">
              <RouteLink href="/login">Already have an account? Sign in</RouteLink>
            </p>
          )}
        </section>
      </div>

      <AuthAside page={page} />
    </div>
  );
}

function VerificationPage() {
  const navigate = useNavigate();
  const { refreshSession, user } = useAuth();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [digits, setDigits] = useState<string[]>(() => Array(6).fill(""));
  const [email, setEmail] = useState(
    () =>
      new URLSearchParams(window.location.search).get("email") ?? user?.email ?? "",
  );
  const [resendSeconds, setResendSeconds] = useState(() =>
    cooldownSeconds(getResendRemainingMs(email)),
  );

  const normalizedEmail = email.trim();
  const enteredCode = digits.join("");
  const isCodeComplete = digits.every((digit) => digit !== "");

  useEffect(() => {
    if (verified) return;
    const timer = window.setInterval(() => {
      setResendSeconds(cooldownSeconds(getResendRemainingMs(email)));
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [email, verified]);

  // Managed Auth flips the verified flag server-side, so the screen continues
  // only once the session read confirms it rather than trusting the submit.
  useEffect(() => {
    if (!verified || !user?.emailVerified) return;
    navigate(safeReturnPath(), true);
  }, [navigate, user?.emailVerified, verified]);

  function resetCooldownSeconds() {
    setResendSeconds(cooldownSeconds(getResendRemainingMs(normalizedEmail)));
  }

  async function resend() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!neonClient) throw new Error(neonConfigurationError);
      if (!normalizedEmail) {
        throw new Error("Enter the email address for this account first.");
      }
      if (!isValidEmail(normalizedEmail)) {
        throw new Error("Enter a valid email address to request another verification code.");
      }
      const result = await getEmailOtpClient(neonClient.auth).sendVerificationOtp({
        email: normalizedEmail,
        type: "email-verification",
      });
      if (result.error) throw new Error(result.error.message || "Unable to resend the verification code.");
      startResendCooldown(normalizedEmail, RESEND_COOLDOWN_MS);
      resetCooldownSeconds();
      setDigits(Array(6).fill(""));
      setMessage("If the account is eligible, a new verification code will be sent.");
    } catch (requestError) {
      setError(authErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function submitVerification(otp: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!neonClient) throw new Error(neonConfigurationError);
      if (!isValidEmail(normalizedEmail)) {
        throw new Error("Enter a valid email address for this account.");
      }
      if (!/^\d{6}$/.test(otp)) {
        throw new Error("Enter the 6-digit verification code.");
      }
      const result = await getEmailOtpClient(neonClient.auth).verifyEmail({
        email: normalizedEmail,
        otp,
      });
      if (result.error) throw new Error(result.error.message || "Unable to verify this email address.");
      clearResendCooldown(normalizedEmail);
      setDigits(Array(6).fill(""));
      setVerified(true);
      setMessage(
        user
          ? "Your email address is verified. Taking you to your workspace…"
          : "Your email address is verified. You can now sign in.",
      );
      await refreshSession();
    } catch (requestError) {
      setError(verificationErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout-shell">
      <div className="auth-layout-main">
        <section className="auth-panel" aria-labelledby="verify-email-title">
          <BrandLogo className="auth-panel__brand" size="sm" />
          <p className="page-heading__eyebrow">Account verification</p>
          <h1 id="verify-email-title">
            {verified ? "Email Verified" : "Enter Verification Code"}
          </h1>
          {!verified && (
            <p>
              Enter the code sent to <strong>{normalizedEmail || "your email address"}</strong>.
              Codes expire after the period set by Managed Auth and can only be used
              once. If yours has expired, request a new code.
            </p>
          )}

          {!verified && (
            <form
              className="auth-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submitVerification(enteredCode);
              }}
            >
              <label>
                Email Address
                <input
                  autoComplete="email"
                  onChange={(event) => {
                    setEmail(event.currentTarget.value);
                    setResendSeconds(
                      cooldownSeconds(getResendRemainingMs(event.currentTarget.value)),
                    );
                  }}
                  required
                  type="email"
                  value={email}
                />
              </label>

              <p className="auth-form__field-label">6-Digit Verification Code</p>
              <OtpInput
                digits={digits}
                disabled={busy}
                onComplete={(code) => void submitVerification(code)}
                onChange={setDigits}
              />

              <button
                className="ui-button ui-button--primary auth-form__submit"
                disabled={busy || !isCodeComplete}
                type="submit"
              >
                {busy ? "Verifying…" : "Confirm Code"}
              </button>

              <button
                className="ui-button ui-button--secondary"
                disabled={busy || resendSeconds > 0}
                onClick={() => void resend()}
                type="button"
              >
                {busy
                  ? "Please wait…"
                  : resendSeconds > 0
                    ? `Resend code in ${resendSeconds}s`
                    : "Resend Verification Code"}
              </button>
            </form>
          )}

          {error && <p className="auth-panel__error" role="alert">{error}</p>}
          {message && <p className="auth-panel__message" role="status">{message}</p>}

          <p className="auth-panel__links">
            {verified && user ? (
              <RouteLink href={safeReturnPath()}>Continue to your workspace →</RouteLink>
            ) : (
              <RouteLink href="/login">
                {verified ? "Continue to Sign In →" : "Back to Sign In"}
              </RouteLink>
            )}
          </p>
        </section>
      </div>

      <AuthAside page="verify-email" />
    </div>
  );
}

export function AuthPage({ page }: AuthPageProps) {
  const { configured } = useAuth();
  if (!configured) return <AuthSetupNotice />;
  if (page === "verify-email") return <VerificationPage />;
  return <AuthForm page={page} />;
}
