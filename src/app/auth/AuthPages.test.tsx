import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouterProvider } from "../routing/router";
import { AuthPage } from "./AuthPages";
import {
  RESEND_COOLDOWN_MS,
  getResendRemainingMs,
  startResendCooldown,
} from "./otp-resend-cooldown";

type TestUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
};

const authMocks = vi.hoisted(() => ({
  refreshSession: vi.fn(async () => {}),
  sendVerificationOtp: vi.fn(),
  signInEmail: vi.fn(),
  signInSocial: vi.fn(),
  signUpEmail: vi.fn(),
  signUpEnabled: { current: true },
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  verifyEmail: vi.fn(),
  sessionUser: { current: null as null | TestUser },
}));

vi.mock("./AuthProvider", () => ({
  useAuth: () => ({
    configured: true,
    user: authMocks.sessionUser.current,
    refreshSession: authMocks.refreshSession,
  }),
}));

vi.mock("./neon-client", () => ({
  neonClient: {
    auth: {
      emailOtp: {
        sendVerificationOtp: authMocks.sendVerificationOtp,
        verifyEmail: authMocks.verifyEmail,
      },
      requestPasswordReset: authMocks.requestPasswordReset,
      resetPassword: authMocks.resetPassword,
      signIn: {
        email: authMocks.signInEmail,
        social: authMocks.signInSocial,
      },
      signUp: { email: authMocks.signUpEmail },
    },
  },
  neonConfigurationError: "",
  get neonSignUpEnabled() {
    return authMocks.signUpEnabled.current;
  },
}));

function renderAuthPage(
  page: "login" | "register" | "forgot-password" | "reset-password" | "verify-email",
) {
  return render(
    <RouterProvider>
      <AuthPage page={page} />
    </RouterProvider>,
  );
}

const CODE_LABEL = "6-Digit Verification Code";
const TEST_EMAIL = "person@example.test";

function otpField(index: number) {
  return screen.getByRole("textbox", {
    name: `${CODE_LABEL} digit ${index + 1} of 6`,
  });
}

function sessionWithVerifiedFlag(emailVerified: boolean): TestUser {
  return {
    id: "user-1",
    name: "Test User",
    email: TEST_EMAIL,
    emailVerified,
  };
}

function renderVerificationPage(query = `email=${encodeURIComponent(TEST_EMAIL)}`) {
  window.history.replaceState(null, "", `/verify-email${query ? `?${query}` : ""}`);
  return renderAuthPage("verify-email");
}

async function enterCode(user: UserEvent, code: string) {
  for (let index = 0; index < code.length; index += 1) {
    await user.type(otpField(index), code.charAt(index));
  }
}

async function fillRegisterForm(
  user: UserEvent,
  password: string,
  confirmation: string,
) {
  await user.type(screen.getByRole("textbox", { name: "Full Name" }), "Test User");
  await user.type(screen.getByRole("textbox", { name: "Work Email" }), TEST_EMAIL);
  await user.type(screen.getByLabelText("Password"), password);
  await user.type(screen.getByLabelText("Confirm password"), confirmation);
  await user.click(
    screen.getByRole("checkbox", {
      name: /I acknowledge the OppSift Terms of Service/,
    }),
  );
  await user.click(screen.getByRole("button", { name: "Create Free Account" }));
}

describe("Neon authentication pages", () => {
  beforeEach(() => {
    authMocks.sessionUser.current = null;
    authMocks.signUpEnabled.current = true;
    authMocks.refreshSession.mockImplementation(async () => {});
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
    authMocks.sessionUser.current = null;
  });

  it("creates an account and sends the user to email verification", async () => {
    const user = userEvent.setup();
    authMocks.signUpEmail.mockResolvedValue({ error: null });
    renderAuthPage("register");

    await fillRegisterForm(user, "password-one", "password-one");

    await waitFor(() => expect(window.location.pathname).toBe("/verify-email"));
    expect(new URLSearchParams(window.location.search).get("email")).toBe(TEST_EMAIL);
    expect(authMocks.signUpEmail).toHaveBeenCalledWith({
      name: "Test User",
      email: TEST_EMAIL,
      password: "password-one",
    });
  });

  it("explains when account creation is disabled by the deployment", () => {
    authMocks.signUpEnabled.current = false;
    renderAuthPage("register");

    expect(screen.getByRole("heading", { name: "Sign-up is unavailable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: "Create Free Account" })).not.toBeInTheDocument();
    expect(authMocks.signUpEmail).not.toHaveBeenCalled();
  });

  it("arms the resend cooldown for the address created at sign-up", async () => {
    const user = userEvent.setup();
    authMocks.signUpEmail.mockResolvedValue({ error: null });
    const registerView = renderAuthPage("register");

    await fillRegisterForm(user, "password-one", "password-one");
    await waitFor(() => expect(window.location.pathname).toBe("/verify-email"));

    registerView.unmount();
    renderVerificationPage();
    expect(screen.getByRole("button", { name: "Resend code in 60s" })).toBeDisabled();
  });

  it("rejects mismatched signup passwords before calling Neon", async () => {
    const user = userEvent.setup();
    renderAuthPage("register");

    await fillRegisterForm(user, "password-one", "password-two");

    expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match.");
    expect(authMocks.signUpEmail).not.toHaveBeenCalled();
  });

  it("rejects a commonly leaked password before calling Neon", async () => {
    const user = userEvent.setup();
    renderAuthPage("register");

    await fillRegisterForm(user, "password123", "password123");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your password is too common. Choose something harder to guess.",
    );
    expect(authMocks.signUpEmail).not.toHaveBeenCalled();
  });

  it("tells a duplicate account to sign in or recover instead of retrying", async () => {
    const user = userEvent.setup();
    authMocks.signUpEmail.mockResolvedValue({
      error: { message: "User already exists" },
    });
    renderAuthPage("register");

    await fillRegisterForm(user, "password-one", "password-one");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "An account with this email already exists. Sign in or reset your password.",
    );
    expect(window.location.pathname).toBe("/");
  });

  it.each([
    ["Invalid OTP", "That verification code is incorrect."],
    ["Verification code expired", "That verification code has expired"],
  ])(
    "submits the complete code and explains “%s”",
    async (serverMessage, expectedMessage) => {
      const user = userEvent.setup();
      authMocks.verifyEmail.mockResolvedValue({ error: { message: serverMessage } });
      renderVerificationPage();

      await enterCode(user, "123456");

      expect(await screen.findByRole("alert")).toHaveTextContent(expectedMessage);
      expect(authMocks.verifyEmail).toHaveBeenCalledWith({
        email: TEST_EMAIL,
        otp: "123456",
      });
      expect(
        screen.getByRole("heading", { name: "Enter Verification Code" }),
      ).toBeVisible();
      expect(
        screen.getByRole("button", { name: "Resend Verification Code" }),
      ).toBeEnabled();
    },
  );

  it("withholds the code from Neon until all six digits are entered", async () => {
    const user = userEvent.setup();
    renderVerificationPage();

    await enterCode(user, "12345");

    expect(authMocks.verifyEmail).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Confirm Code" })).toBeDisabled();

    await user.type(otpField(5), "6");

    await waitFor(() =>
      expect(authMocks.verifyEmail).toHaveBeenCalledWith({
        email: TEST_EMAIL,
        otp: "123456",
      }),
    );
  });

  it("routes an unverified login to the verification flow and keeps the destination", async () => {
    const user = userEvent.setup();
    authMocks.signInEmail.mockResolvedValue({
      error: { message: "Email is not verified" },
    });
    window.history.replaceState(null, "", "/login?redirectTo=%2Fmy-opportunities");
    renderAuthPage("login");

    await user.type(screen.getByRole("textbox", { name: "Work Email" }), TEST_EMAIL);
    await user.type(screen.getByLabelText("Password"), "password-one");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => expect(window.location.pathname).toBe("/verify-email"));
    const params = new URLSearchParams(window.location.search);
    expect(params.get("email")).toBe(TEST_EMAIL);
    expect(params.get("redirectTo")).toBe("/my-opportunities");
  });

  it("shows a clear error for an incorrect password", async () => {
    const user = userEvent.setup();
    authMocks.signInEmail.mockResolvedValue({
      error: { message: "Invalid email or password" },
    });
    window.history.replaceState(null, "", "/login");
    renderAuthPage("login");

    await user.type(
      screen.getByRole("textbox", { name: "Work Email" }),
      "person@example.test",
    );
    await user.type(screen.getByLabelText("Password"), "incorrect-password");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid email or password",
    );
  });

  it("starts Google sign-in with a same-origin callback", async () => {
    vi.stubEnv("VITE_NEON_GOOGLE_OAUTH_ENABLED", "true");
    const user = userEvent.setup();
    authMocks.signInSocial.mockResolvedValue({ error: null });
    window.history.replaceState(null, "", "/login?redirectTo=%2Fsettings");
    renderAuthPage("login");

    await user.click(screen.getByRole("button", { name: "Continue with Google" }));

    expect(authMocks.signInSocial).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: `${window.location.origin}/settings`,
    });
  });

  it("requests password recovery without revealing account existence", async () => {
    const user = userEvent.setup();
    authMocks.requestPasswordReset.mockResolvedValue({ error: null });
    window.history.replaceState(null, "", "/forgot-password");
    renderAuthPage("forgot-password");

    await user.type(
      screen.getByRole("textbox", { name: "Work Email" }),
      "person@example.test",
    );
    await user.click(screen.getByRole("button", { name: "Send Reset Link" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "If the account is eligible, a password reset email will be sent.",
    );
    expect(authMocks.requestPasswordReset).toHaveBeenCalledWith({
      email: "person@example.test",
      redirectTo: `${window.location.origin}/reset-password`,
    });
  });

  it("requires matching passwords before submitting a reset token", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/reset-password?token=single-use-token");
    renderAuthPage("reset-password");

    await user.type(screen.getByLabelText("New password"), "new-password");
    await user.type(screen.getByLabelText("Confirm new password"), "different-password");
    await user.click(screen.getByRole("button", { name: "Update Password" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match.");
    expect(authMocks.resetPassword).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
  });

  it("updates the password through Managed Auth with a matching reset token", async () => {
    const user = userEvent.setup();
    authMocks.resetPassword.mockResolvedValue({ error: null });
    window.history.replaceState(null, "", "/reset-password?token=single-use-token");
    renderAuthPage("reset-password");

    await user.type(screen.getByLabelText("New password"), "new-password");
    await user.type(screen.getByLabelText("Confirm new password"), "new-password");
    await user.click(screen.getByRole("button", { name: "Update Password" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Your password has been updated. You can now sign in.",
    );
    expect(authMocks.resetPassword).toHaveBeenCalledWith({
      newPassword: "new-password",
      token: "single-use-token",
    });
  });

  it("verifies the email through Neon, refreshes the session and clears the cooldown", async () => {
    const user = userEvent.setup();
    authMocks.verifyEmail.mockResolvedValue({ error: null });
    startResendCooldown(TEST_EMAIL, RESEND_COOLDOWN_MS);
    renderVerificationPage();

    await enterCode(user, "123456");

    expect(await screen.findByRole("heading", { name: "Email Verified" }))
      .toBeInTheDocument();
    expect(authMocks.verifyEmail).toHaveBeenCalledWith({
      email: TEST_EMAIL,
      otp: "123456",
    });
    expect(authMocks.refreshSession).toHaveBeenCalledTimes(1);
    expect(getResendRemainingMs(TEST_EMAIL)).toBe(0);
    expect(
      screen.getByRole("link", { name: "Continue to Sign In →" }),
    ).toHaveAttribute("href", "/login");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Your email address is verified. You can now sign in.",
    );
  });

  it("continues to the intended page once the session reports a verified email", async () => {
    const user = userEvent.setup();
    authMocks.sessionUser.current = sessionWithVerifiedFlag(false);
    authMocks.verifyEmail.mockResolvedValue({ error: null });
    authMocks.refreshSession.mockImplementation(async () => {
      authMocks.sessionUser.current = sessionWithVerifiedFlag(true);
    });
    renderVerificationPage(
      `email=${encodeURIComponent(TEST_EMAIL)}&redirectTo=%2Fmy-opportunities`,
    );

    await enterCode(user, "123456");

    await waitFor(() => expect(window.location.pathname).toBe("/my-opportunities"));
    expect(authMocks.refreshSession).toHaveBeenCalledTimes(1);
  });

  it("holds the verification screen while the session still reports an unverified email", async () => {
    const user = userEvent.setup();
    authMocks.sessionUser.current = sessionWithVerifiedFlag(false);
    authMocks.verifyEmail.mockResolvedValue({ error: null });
    renderVerificationPage();

    await enterCode(user, "123456");

    expect(await screen.findByRole("heading", { name: "Email Verified" })).toBeVisible();
    expect(authMocks.refreshSession).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe("/verify-email");
    expect(
      screen.getByRole("link", { name: "Continue to your workspace →" }),
    ).toHaveAttribute("href", "/dashboard");
  });

  it("asks for an email address before resending a code", async () => {
    const user = userEvent.setup();
    renderVerificationPage("");

    await user.click(screen.getByRole("button", { name: "Resend Verification Code" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter the email address for this account first.",
    );
    expect(authMocks.sendVerificationOtp).not.toHaveBeenCalled();
  });

  it("enforces a resend cooldown and requests a fresh managed OTP", async () => {
    vi.useFakeTimers();
    authMocks.sendVerificationOtp.mockResolvedValue({ error: null });
    startResendCooldown(TEST_EMAIL, RESEND_COOLDOWN_MS);
    renderVerificationPage();

    const resend = screen.getByRole("button", { name: "Resend code in 60s" });
    expect(resend).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(RESEND_COOLDOWN_MS);
    });
    expect(resend).toBeEnabled();

    await act(async () => {
      fireEvent.click(resend);
      await Promise.resolve();
    });

    expect(authMocks.sendVerificationOtp).toHaveBeenCalledWith({
      email: TEST_EMAIL,
      type: "email-verification",
    });
    expect(screen.getByRole("button", { name: "Resend code in 60s" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "If the account is eligible, a new verification code will be sent.",
    );
  });

  it("keeps the resend cooldown locked after a page reload", () => {
    startResendCooldown(TEST_EMAIL, 45_000);
    const firstView = renderVerificationPage();
    expect(screen.getByRole("button", { name: /Resend code in \d+s/ })).toBeDisabled();

    firstView.unmount();
    renderVerificationPage();

    expect(screen.getByRole("button", { name: /Resend code in \d+s/ })).toBeDisabled();
  });
});
