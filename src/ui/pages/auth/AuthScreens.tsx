import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  MailCheck,
  RefreshCw,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { OppSiftLogo } from '../../components/brand/OppSiftLogo';
import { CinematicVideoBackdrop } from '../../components/media/CinematicVideoBackdrop';
import { useAppState } from '../../context/AppStateContext';
import { useRouter } from '../../context/RouterContext';
import { useTheme } from '../../context/ThemeContext';
import { AuthScreenMode } from '../../types/oppsift';
import { useAuth } from '../../../app/auth/AuthProvider';
import { neonClient, neonConfigurationError, neonSignUpEnabled } from '../../../app/auth/neon-client';
import { validateNewPassword } from '../../../app/auth/password-policy';
import { RESEND_COOLDOWN_MS, startResendCooldown } from '../../../app/auth/otp-resend-cooldown';

type NeonEmailOtpClient = {
  sendVerificationOtp(input: {
    email: string;
    type: 'email-verification';
  }): Promise<{ error: { message?: string } | null }>;
  verifyEmail(input: {
    email: string;
    otp: string;
  }): Promise<{ error: { message?: string } | null }>;
};

function isNeonEmailOtpClient(value: unknown): value is NeonEmailOtpClient {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'sendVerificationOtp') === 'function' &&
    typeof Reflect.get(value, 'verifyEmail') === 'function'
  );
}

function getEmailOtpClient(auth: NonNullable<typeof neonClient>['auth']) {
  const emailOtp: unknown = Reflect.get(auth, 'emailOtp');
  if (!isNeonEmailOtpClient(emailOtp)) {
    throw new Error('This Neon Managed Auth endpoint does not support email OTP verification.');
  }
  return emailOtp;
}

function authErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message.trim() : '';
  if (/user_already_exists|already exists|already registered|duplicate/i.test(message)) {
    return 'An account with this email already exists. Sign in or reset your password.';
  }
  if (/too many|rate.?limit|too_many_attempts|429|wait before trying/i.test(message)) {
    return 'Too many attempts. Wait a moment, then try again.';
  }
  return message || 'The request could not be completed. Please try again.';
}

function verificationErrorMessage(error: unknown) {
  const message = authErrorMessage(error);
  if (/expired|timeout|too late|has been used|already (been )?used|invalid or used/i.test(message)) {
    return 'That verification code has expired or was already used. Request a new code.';
  }
  if (/invalid|incorrect|not valid|wrong|no such|not found/i.test(message)) {
    return 'That verification code is incorrect. Check it, or request a new code if it has expired.';
  }
  return message;
}

function resetErrorMessage(error: unknown) {
  const message = authErrorMessage(error);
  if (/expired|invalid.*(token|link)|token.*(invalid|expired)/i.test(message)) {
    return 'This password reset link is invalid or expired. Request a new one.';
  }
  return message;
}

function isUnverifiedEmailError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  return /email.{0,40}(not verified|unverified)|verification.{0,40}(required|verify)/i.test(message);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function safeReturnPath() {
  const requested = new URLSearchParams(window.location.search).get('redirectTo');
  if (!requested?.startsWith('/') || requested.startsWith('//')) return '/dashboard';

  try {
    const target = new URL(requested, window.location.origin);
    return target.origin === window.location.origin
      ? `${target.pathname}${target.search}${target.hash}`
      : '/dashboard';
  } catch {
    return '/dashboard';
  }
}

function verifyEmailHref(email: string) {
  const params = new URLSearchParams({ email });
  const requestedRedirect = new URLSearchParams(window.location.search).get('redirectTo');
  if (requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//')) {
    params.set('redirectTo', requestedRedirect);
  }
  return `/verify-email?${params.toString()}`;
}

export function AuthScreensPage() {
  const { path, navigate } = useRouter();
  const { pushToast } = useAppState();
  const { user, loading: sessionLoading, configured: authConfigured, signOut, refreshSession } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  const [mode, setMode] = useState<AuthScreenMode>('login');
  const [resetToken] = useState(
    () => new URLSearchParams(window.location.search).get('token') ?? '',
  );
  const [email, setEmail] = useState(
    () => new URLSearchParams(window.location.search).get('email') ?? '',
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [formFeedback, setFormFeedback] = useState<string>('');

  useEffect(() => {
    const pathMode: AuthScreenMode =
      path === '/register' || path === '/auth/register'
        ? 'register'
        : path === '/verify-email' || path === '/auth/verify-email'
          ? 'verification-code'
          : path === '/auth/forgot-password'
            ? 'forgot-password'
            : path === '/auth/reset-password' || path === '/reset-password'
              ? 'reset-password'
              : path === '/auth/resend-verification'
                ? 'resend-verification'
                : path === '/auth/invitation'
                  ? 'invitation-sign-in'
                  : 'login';

    setFormFeedback('');
    setNotice('');

    if (!authConfigured) {
      setMode('auth-not-configured');
      return;
    }
    if (sessionLoading) {
      setMode('session-loading');
      return;
    }
    if (!neonSignUpEnabled && pathMode === 'register') {
      setMode('signup-unavailable');
      return;
    }
    if (user && (pathMode === 'login' || pathMode === 'register')) {
      setMode('already-signed-in');
      return;
    }
    setMode(pathMode);
  }, [authConfigured, sessionLoading, user, path]);

  const handleNeonLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback('');
    setNotice('');
    const normalizedEmail = email.trim();
    if (!isValidEmail(normalizedEmail) || !password) {
      setFormFeedback('Enter a valid work email and password.');
      return;
    }
    setBusy(true);
    try {
      if (!neonClient) throw new Error(neonConfigurationError);
      const result = await neonClient.auth.signIn.email({
        email: normalizedEmail,
        password,
      });
      if (result.error) throw new Error(result.error.message || 'Sign-in failed.');
      await refreshSession();
      pushToast('success', `Signed in as ${normalizedEmail}.`);
      navigate(safeReturnPath());
    } catch (requestError) {
      if (isUnverifiedEmailError(requestError)) {
        navigate(verifyEmailHref(normalizedEmail));
        return;
      }
      setFormFeedback(authErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback('');
    setNotice('');
    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim();
    if (!normalizedName) {
      setFormFeedback('Enter your full name.');
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setFormFeedback('Enter a valid work email address.');
      return;
    }
    if (!acceptedTerms) {
      setFormFeedback('Please accept the OppSift Terms of Service and Privacy Policy.');
      return;
    }
    const policyError = validateNewPassword(password, confirmPassword, { email: normalizedEmail });
    if (policyError) {
      setFormFeedback(policyError);
      return;
    }
    setBusy(true);
    try {
      if (!neonClient) throw new Error(neonConfigurationError);
      const result = await neonClient.auth.signUp.email({
        name: normalizedName,
        email: normalizedEmail,
        password,
      });
      if (result.error) throw new Error(result.error.message || 'Account creation failed.');
      startResendCooldown(normalizedEmail, RESEND_COOLDOWN_MS);
      navigate(verifyEmailHref(normalizedEmail));
    } catch (requestError) {
      setFormFeedback(authErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setFormFeedback('');
    setNotice('');
    setBusy(true);
    try {
      if (!neonClient) throw new Error(neonConfigurationError);
      const result = await neonClient.auth.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}${safeReturnPath()}`,
      });
      if (result.error) throw new Error(result.error.message || 'Google sign-in failed.');
    } catch (requestError) {
      setFormFeedback(authErrorMessage(requestError));
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    setFormFeedback('');
    setNotice('');
    const normalizedEmail = email.trim();
    if (!isValidEmail(normalizedEmail)) {
      setFormFeedback('Enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      if (!neonClient) throw new Error(neonConfigurationError);
      const result = await neonClient.auth.requestPasswordReset({
        email: normalizedEmail,
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (result.error) throw new Error(result.error.message || 'Request failed.');
      setNotice('If the account is eligible, a password reset email will be sent.');
    } catch (requestError) {
      setFormFeedback(authErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async () => {
    setFormFeedback('');
    setNotice('');
    if (!resetToken) {
      setFormFeedback('The password reset link is missing its token. Request a new one.');
      return;
    }
    const policyError = validateNewPassword(newPassword, confirmNewPassword, { email });
    if (policyError) {
      setFormFeedback(policyError);
      return;
    }
    setBusy(true);
    try {
      if (!neonClient) throw new Error(neonConfigurationError);
      const result = await neonClient.auth.resetPassword({
        newPassword,
        token: resetToken,
      });
      if (result.error) throw new Error(result.error.message || 'Password reset failed.');
      setNewPassword('');
      setConfirmNewPassword('');
      setNotice('Your password has been updated. You can now sign in.');
    } catch (requestError) {
      setFormFeedback(resetErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyCode = async () => {
    setFormFeedback('');
    setNotice('');
    const normalizedEmail = email.trim();
    if (!isValidEmail(normalizedEmail)) {
      setFormFeedback('Enter the email address for this account first.');
      return;
    }
    if (!/^\d{6}$/.test(otpCode)) {
      setFormFeedback('Enter the 6-digit verification code.');
      return;
    }
    setBusy(true);
    try {
      if (!neonClient) throw new Error(neonConfigurationError);
      const result = await getEmailOtpClient(neonClient.auth).verifyEmail({
        email: normalizedEmail,
        otp: otpCode,
      });
      if (result.error) throw new Error(result.error.message || 'Unable to verify this email address.');
      setOtpCode('');
      await refreshSession();
      setNotice(
        user
          ? 'Your email address is verified. Taking you to your workspace…'
          : 'Your email address is verified. You can now sign in.',
      );
      window.setTimeout(() => {
        navigate(user ? safeReturnPath() : '/login');
      }, 900);
    } catch (requestError) {
      setFormFeedback(verificationErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const handleResendVerification = async () => {
    setFormFeedback('');
    setNotice('');
    const normalizedEmail = email.trim();
    if (!isValidEmail(normalizedEmail)) {
      setFormFeedback('Enter a valid email address to request another verification code.');
      return;
    }
    setBusy(true);
    try {
      if (!neonClient) throw new Error(neonConfigurationError);
      const result = await getEmailOtpClient(neonClient.auth).sendVerificationOtp({
        email: normalizedEmail,
        type: 'email-verification',
      });
      if (result.error) throw new Error(result.error.message || 'Unable to resend the verification code.');
      startResendCooldown(normalizedEmail, RESEND_COOLDOWN_MS);
      setOtpCode('');
      setMode('verification-code');
      setNotice('If the account is eligible, a new verification code will be sent.');
    } catch (requestError) {
      setFormFeedback(authErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const GoogleOAuthButton = ({ label }: { label: string }) => (
    <button
      type="button"
      disabled={busy || !authConfigured}
      onClick={() => void handleGoogleSignIn()}
      className="w-full h-10 px-4 rounded-md border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#1C2433] hover:bg-[#F8FAFC] dark:hover:bg-[#263244]/70 text-sm font-medium text-[#172033] dark:text-[#F8FAFC] flex items-center justify-center gap-2.5 transition-colors"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
        <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
      </svg>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#101114] text-[#172033] dark:text-[#F8FAFC] overflow-x-hidden">
      <div className="border-b border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] dark:text-[#CBD5E1] hover:text-[#172033] dark:hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setFormFeedback('');
              setNotice('');
              navigate(mode === 'register' ? '/login' : '/register');
            }}
            className="px-3 py-1.5 rounded-md border border-[#E2E8F0] dark:border-[#263244] text-xs font-medium hover:border-[#A33B59]"
          >
            {mode === 'register' ? 'Sign In' : 'Create Account'}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="px-2.5 py-1.5 rounded-md border border-[#E2E8F0] dark:border-[#263244] text-xs font-medium"
          >
            {resolvedTheme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12">
        {/* Left Brand Panel with Cinematic Video Backdrop */}
        <CinematicVideoBackdrop
          playlistIds={['global-cities', 'international-business']}
          overlayTone="burgundy-navy"
          className="lg:col-span-5 flex flex-col justify-between"
          showControls={true}
        >
          <div className="p-8 sm:p-12 flex flex-col justify-between h-full">
            <div>
              <OppSiftLogo variant="dark-bg" size="lg" />
              <h1 className="mt-10 font-display text-3xl font-bold leading-tight text-balance text-white">
                Global opportunity intelligence, backed by verified source provenance.
              </h1>
              <p className="mt-4 text-sm text-[#FFF1F2]/85 leading-relaxed max-w-md">
                Authenticated via Neon Managed Auth and Google OAuth. Access personalised tender matching, eligibility analysis, and team preparation pipelines.
              </p>
            </div>
            <div className="mt-10 pt-6 border-t border-white/15 space-y-2 text-xs text-white/85">
              <p>Multi-jurisdiction currency &amp; timezone normalisation</p>
              <p>Clause-cited AI eligibility interpretation</p>
              <p>Role-based organisation workspaces</p>
            </div>
          </div>
        </CinematicVideoBackdrop>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] p-6 sm:p-8 shadow-sm">
            {notice && (
              <div className="mb-4 p-3 rounded-md border border-[#16A34A]/30 bg-[#16A34A]/8 text-xs text-[#16A34A] flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{notice}</span>
              </div>
            )}

            {formFeedback && (
              <div className="mb-4 p-3 rounded-md border border-[#DC2626]/30 bg-[#DC2626]/8 text-xs text-[#DC2626] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formFeedback}</span>
              </div>
            )}

            {mode === 'login' && authConfigured && (
              <form onSubmit={handleNeonLogin} className="space-y-4">
                <div>
                  <h2 className="font-display text-xl font-bold">Sign in to OppSift</h2>
                  <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-1">
                    Access your opportunity intelligence workspace.
                  </p>
                </div>
                <GoogleOAuthButton label="Continue with Google" />
                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-[#E2E8F0] dark:border-[#263244]" />
                  <span className="px-3 text-[11px] text-[#64748B] dark:text-[#CBD5E1]">or email</span>
                  <div className="flex-grow border-t border-[#E2E8F0] dark:border-[#263244]" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium">Password</label>
                    <button
                      type="button"
                      onClick={() => navigate('/auth/forgot-password')}
                      className="text-xs text-[#164E8B] dark:text-[#38BDF8] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full h-10 pl-3 pr-10 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#CBD5E1]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-[#E2E8F0]"
                  />
                  <span>Keep session active on this device</span>
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full h-10 rounded-lg bg-[#541B32] hover:bg-[#A33B59] disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                >
                  {busy ? 'Signing In…' : 'Sign In'}
                </button>
                <p className="text-xs text-center text-[#64748B] dark:text-[#CBD5E1]">
                  New to OppSift?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="font-semibold text-[#541B32] dark:text-[#E8A4B5] hover:underline"
                  >
                    Create an account
                  </button>
                </p>
                <p className="text-[11px] text-center text-[#64748B] dark:text-[#CBD5E1]">
                  By continuing you agree to the Terms of Service and Privacy Notice.
                </p>
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <h2 className="font-display text-xl font-bold">Create your OppSift account</h2>
                  <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-1">
                    Register with Neon Managed Auth or Google OAuth.
                  </p>
                </div>
                <GoogleOAuthButton label="Sign up with Google" />
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Elena Vance"
                      className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Work Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Password (min 8 characters)</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-10 pl-3 pr-10 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B]"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Confirm Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                    />
                  </div>
                  <label className="flex items-start gap-2 text-xs text-[#64748B] dark:text-[#CBD5E1]">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 rounded"
                    />
                    <span>I accept the OppSift Terms of Service and Privacy Policy.</span>
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full h-10 rounded-lg bg-[#541B32] hover:bg-[#A33B59] disabled:opacity-60 text-white text-sm font-semibold"
                >
                  {busy ? 'Creating Account…' : 'Create Account'}
                </button>
                <p className="text-xs text-center text-[#64748B] dark:text-[#CBD5E1]">
                  Already registered?{' '}
                  <button type="button" onClick={() => navigate('/login')} className="font-semibold text-[#541B32] dark:text-[#E8A4B5] hover:underline">
                    Sign in
                  </button>
                </p>
              </form>
            )}

            {mode === 'signup-unavailable' && (
              <div className="space-y-4 text-center py-4">
                <ShieldAlert className="w-10 h-10 mx-auto text-[#D97706]" />
                <h2 className="font-display text-xl font-bold">Public registration currently closed</h2>
                <p className="text-sm text-[#64748B] dark:text-[#CBD5E1]">
                  Self-service sign-ups are temporarily restricted for this deployment. Existing members and invited users can continue signing in.
                </p>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full h-10 rounded-lg bg-[#541B32] text-white text-sm font-semibold"
                >
                  Return to Sign In
                </button>
              </div>
            )}

            {mode === 'forgot-password' && (
              <div className="space-y-4">
                <KeyRound className="w-8 h-8 text-[#541B32] dark:text-[#E8A4B5]" />
                <h2 className="font-display text-xl font-bold">Forgot your password?</h2>
                <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
                  Enter your account email and Neon Managed Auth will send a reset link.
                </p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleForgotPassword()}
                  className="w-full h-10 rounded-lg bg-[#541B32] disabled:opacity-60 text-white text-sm font-semibold"
                >
                  {busy ? 'Sending…' : 'Send Recovery Instructions'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full text-xs text-[#64748B] hover:underline"
                >
                  Back to Login
                </button>
              </div>
            )}

            {mode === 'reset-password' && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-bold">Set a new password</h2>
                <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
                  Choose a strong password of at least 8 characters.
                </p>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                />
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleResetPassword()}
                  className="w-full h-10 rounded-lg bg-[#541B32] disabled:opacity-60 text-white text-sm font-semibold"
                >
                  {busy ? 'Updating…' : 'Update Password'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full text-xs text-[#64748B] hover:underline"
                >
                  Back to Login
                </button>
              </div>
            )}

            {mode === 'email-verification' && (
              <div className="space-y-4 text-center py-2">
                <MailCheck className="w-10 h-10 mx-auto text-[#164E8B] dark:text-[#38BDF8]" />
                <h2 className="font-display text-xl font-bold">Verify your email address</h2>
                <p className="text-sm text-[#64748B] dark:text-[#CBD5E1]">
                  We sent a verification link and 6-digit code to <span className="font-semibold text-[#172033] dark:text-[#F8FAFC]">{email}</span>.
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setMode('verification-code')}
                    className="w-full h-10 rounded-lg bg-[#541B32] text-white text-sm font-semibold"
                  >
                    Enter Verification Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('resend-verification')}
                    className="text-xs font-medium text-[#164E8B] dark:text-[#38BDF8] hover:underline"
                  >
                    Didn&apos;t receive the email? Resend
                  </button>
                </div>
              </div>
            )}

            {mode === 'verification-code' && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-bold">Enter 6-digit verification code</h2>
                <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
                  Confirm ownership of {email} to activate your session.
                </p>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="000000"
                  className="w-full h-12 px-4 text-center font-mono text-xl tracking-[0.4em] rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433]"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleVerifyCode()}
                  className="w-full h-10 rounded-lg bg-[#541B32] disabled:opacity-60 text-white text-sm font-semibold"
                >
                  {busy ? 'Verifying…' : 'Verify Email Address'}
                </button>
              </div>
            )}

            {mode === 'resend-verification' && (
              <div className="space-y-4 text-center py-2">
                <RefreshCw className="w-9 h-9 mx-auto text-[#541B32] dark:text-[#E8A4B5]" />
                <h2 className="font-display text-xl font-bold">Resend verification email</h2>
                <p className="text-sm text-[#64748B] dark:text-[#CBD5E1]">
                  Confirm the address below to trigger a fresh verification message from Neon Auth.
                </p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleResendVerification()}
                  className="w-full h-10 rounded-lg bg-[#541B32] disabled:opacity-60 text-white text-sm font-semibold"
                >
                  {busy ? 'Sending…' : 'Resend Verification'}
                </button>
              </div>
            )}

            {mode === 'already-signed-in' && (
              <div className="space-y-4 text-center py-2">
                <UserCheck className="w-10 h-10 mx-auto text-[#16A34A]" />
                <h2 className="font-display text-xl font-bold">Already signed in</h2>
                <p className="text-sm text-[#64748B] dark:text-[#CBD5E1]">
                  Active session detected for <span className="font-medium text-[#172033] dark:text-[#F8FAFC]">{user?.email ?? email}</span>.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="w-full h-10 rounded-lg bg-[#541B32] text-white text-sm font-semibold"
                  >
                    Continue to Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void signOut().catch(() => {
                        pushToast('warning', 'The Neon session could not be closed. Try again.');
                      });
                      setMode('login');
                    }}
                    className="w-full h-10 rounded-lg border border-[#E2E8F0] dark:border-[#263244] text-sm font-medium"
                  >
                    Sign out and switch account
                  </button>
                </div>
              </div>
            )}

            {mode === 'auth-not-configured' && (
              <div className="space-y-4 text-center py-2">
                <ShieldAlert className="w-10 h-10 mx-auto text-[#D97706]" />
                <h2 className="font-display text-xl font-bold">Authentication provider not configured</h2>
                <p className="text-sm text-[#64748B] dark:text-[#CBD5E1]">
                  Neon Managed Auth environment variables are not bound for this deployment. Contact your platform administrator to configure authentication.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full h-10 rounded-lg border border-[#E2E8F0] dark:border-[#263244] text-sm font-semibold"
                >
                  Return to Homepage
                </button>
              </div>
            )}

            {mode === 'session-loading' && (
              <div className="space-y-4 text-center py-6">
                <div className="w-8 h-8 mx-auto rounded-full border-2 border-[#541B32] border-t-transparent animate-spin" />
                <h2 className="font-display text-lg font-semibold">Checking authentication session…</h2>
                <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
                  Verifying Neon Managed Auth token status.
                </p>
              </div>
            )}

            {mode === 'sign-in-required' && (
              <div className="space-y-4 text-center py-2">
                <Lock className="w-10 h-10 mx-auto text-[#541B32] dark:text-[#E8A4B5]" />
                <h2 className="font-display text-xl font-bold">Sign-in required</h2>
                <p className="text-sm text-[#64748B] dark:text-[#CBD5E1]">
                  You must sign in to view protected opportunity pipelines, saved searches, or team settings.
                </p>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full h-10 rounded-lg bg-[#541B32] text-white text-sm font-semibold"
                >
                  Proceed to Sign In
                </button>
              </div>
            )}

            {mode === 'invitation-sign-in' && (
              <div className="space-y-4">
                <CheckCircle2 className="w-8 h-8 text-[#164E8B] dark:text-[#38BDF8]" />
                <h2 className="font-display text-xl font-bold">Join Meridian Civic &amp; Cloud Advisory</h2>
                <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
                  You have been invited as an <span className="font-semibold">Analyst</span>. Sign in with your invited email to accept.
                </p>
                <GoogleOAuthButton label="Accept via Google" />
                <button
                  type="button"
                  onClick={() => setMode('invitation-verification')}
                  className="w-full h-10 rounded-lg bg-[#541B32] text-white text-sm font-semibold"
                >
                  Continue with Invited Email
                </button>
              </div>
            )}

            {mode === 'invitation-verification' && (
              <div className="space-y-4 text-center py-2">
                <MailCheck className="w-10 h-10 mx-auto text-[#16A34A]" />
                <h2 className="font-display text-xl font-bold">Verifying organisation invitation</h2>
                <p className="text-sm text-[#64748B] dark:text-[#CBD5E1]">
                  Validating token for <span className="font-mono text-xs">{email}</span> before granting workspace role permissions.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/accept-invitation')}
                  className="w-full h-10 rounded-lg bg-[#541B32] text-white text-sm font-semibold"
                >
                  Review Invitation Details
                </button>
              </div>
            )}

            {mode === 'auth-error' && (
              <div className="space-y-4 text-center py-2">
                <AlertCircle className="w-10 h-10 mx-auto text-[#DC2626]" />
                <h2 className="font-display text-xl font-bold">Authentication failed</h2>
                <p className="text-sm text-[#64748B] dark:text-[#CBD5E1]">
                  The authentication callback returned an invalid or expired state parameter. No session was created.
                </p>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full h-10 rounded-lg bg-[#541B32] text-white text-sm font-semibold"
                >
                  Try Signing In Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
