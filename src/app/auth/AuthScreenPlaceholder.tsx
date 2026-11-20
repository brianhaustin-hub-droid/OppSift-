/**
 * Authentication routes keep their guards and provider wiring, but the old
 * sign-in/registration/OTP visual implementation is removed until the Stitch
 * authentication screens are integrated.
 */
export function AuthScreenPlaceholder({ page }: { page: string }) {
  return (
    <main className="integration-placeholder integration-placeholder--auth" id="platform-main" tabIndex={-1}>
      <p className="integration-placeholder__eyebrow">OppSift integration foundation</p>
      <h1>Authentication screen placeholder</h1>
      <p className="integration-placeholder__route">Route: /{page}</p>
      <p className="integration-placeholder__note">
        Neon Managed Auth, Google OAuth, email OTP, password policy and session
        management remain configured. The authentication visual layer is being
        replaced by the OppSift design system.
      </p>
      <p className="integration-placeholder__status">Stitch authentication integration pending</p>
    </main>
  );
}
