/**
 * Temporary route boundary used while the Google Stitch screens are integrated.
 * It intentionally contains no product UI, metrics or mock content — routing,
 * authentication guards, providers and data services remain fully active.
 */
export function ScreenPlaceholder({ path, title }: { path: string; title: string }) {
  return (
    <main className="integration-placeholder" id="platform-main" tabIndex={-1}>
      <p className="integration-placeholder__eyebrow">OppSift integration foundation</p>
      <h1>Temporary screen placeholder</h1>
      <p className="integration-placeholder__route">Route: {path}</p>
      <p className="integration-placeholder__note">
        This screen is being replaced by the OppSift design system. Routing,
        authentication, data services and database connections remain active.
      </p>
      <p className="integration-placeholder__status">Stitch integration pending · {title}</p>
    </main>
  );
}
