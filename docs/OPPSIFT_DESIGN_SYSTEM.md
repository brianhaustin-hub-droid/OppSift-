# OppSift design system

## Brand foundation

- **Product:** OppSift — Global Opportunity Intelligence.
- **Tagline:** Find the right opportunity. Know what to do next.
- **Audience:** Business leaders, suppliers, contractors, consultants, SMEs,
  enterprises, and organizations evaluating global business opportunities.
- **Personality:** Precise, trustworthy, strategically minded, globally aware.
- **Avoid:** Social, travel, hotel, consumer marketplace, generic AI-chat, or
  government-portal visual tropes.

## Art direction

The supplied OppSift wordmark and app mark are the canonical logo assets in
`public/assets/`. Use the shared `BrandLogo` component across public navigation,
the authenticated sidebar, footer, and authentication surfaces rather than
reconstructing the logo with text or generic icons. Use the transparent logo
variants so the mark sits naturally on each surface without a rectangular
backdrop.

The supplied Earth-from-orbit image is approved brand artwork. Use it as a
full-bleed local background on public hero sections, including the homepage,
product, opportunities, markets, and about pages. Use restrained Ken-Burns
motion, readable navy overlays, and a soft fade into the page background
instead of a hard section boundary. Disable motion when the user requests
reduced motion. The image is atmospheric brand art, not a data visualization.

Do not use interactive or decorative country maps, pins, or map zoom controls.
Communicate the intended 30-market scope with editorial copy and regional
typography instead. Never imply operating coverage from launch intent.

## Color tokens

The CSS variables in `src/app/theme.css` remain the canonical application
tokens. Consolidate screens around:

| Token | Value | Use |
|---|---|---|
| Midnight navy | `#101B2D` | Brand, dark chrome, hero overlays |
| Charcoal navy | `#0B1220` | Deep dark canvas |
| Warm cloud | `#F6F8FB` | Light application canvas |
| White | `#FFFFFF` | Raised light surfaces |
| Slate | `#64748B` | Secondary labels and copy |
| Muted teal | `#0D9488` | Primary action, restrained active state |
| Electric blue | `#2563EB` | Focus and selected state when needed |
| Champagne | `#F2B84B` | Rare emphasis only |

Use semantic success, warning, error, and information colors only for those
states. Avoid applying every accent to one screen or layering gratuitous
gradients, borders, and shadows.

## Typography and layout

- Use the existing system sans-serif stack and shared type scale.
- Major headings are editorial, medium-weight, and constrained in line length;
  avoid oversized all-bold dashboard copy.
- Use consistent spacing tokens, a shared content width, and predictable page
  title/description/action placement.
- Favor whitespace, typography, and alignment over enclosing each element in a
  rounded card. App cards are open, borderless text surfaces; group content
  with spacing, dividers, and clear headings instead of individual boxes.
- Preserve visible keyboard focus and the existing reduced-motion support.

## Components and interaction

Reuse shared button, input, card, badge, table, dialog, and feedback
components. Keep navigation, form validation, loading, empty, error, and
restricted states consistent. Controls must be keyboard accessible and have
clear labels.

Auth routes render as a separate, full-viewport experience with no dashboard
navigation. Use deep navy surfaces, the supplied Earth artwork, and bright,
high-contrast form controls on every theme and device. OAuth availability must
reflect actual provider configuration; do not make unsupported authentication
actions appear operational.

On desktop, keep the platform sidebar compact by default and expand it on
pointer hover or keyboard focus. Touch layouts retain an explicit expand
control, and the narrow-screen drawer remains tap-operated.

## Responsive behavior

Use the existing page-gutter and breakpoint tokens. Design mobile navigation,
tables, filters, and multi-column layouts intentionally; do not rely on fixed
desktop widths. Verify at 320px, tablet, and desktop sizes and respect safe-area
insets.

## Trust and provenance

- The 30 markets are an approved research scope, not live coverage.
- Sample opportunities must remain identified as illustrative where shown.
- Do not invent counts, official publishers, verification, eligibility,
  deadlines, alerts, AI analysis, or persistence.
- Neon RLS/server authorization, not frontend visibility, is the security
  boundary for customer and administrative data.
