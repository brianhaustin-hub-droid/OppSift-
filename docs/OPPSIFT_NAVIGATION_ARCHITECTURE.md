# OppSift navigation architecture

## Public navigation

- Home: `/`
- Product: `/product` (existing `/platform` remains a compatibility alias)
- Opportunities: `/opportunities`
- Markets: `/markets`
- Solutions: `/solutions`
- How it works: `/how-it-works`
- Company: `/about`, `/contact`
- Account: `/login`, `/register`

Public links must have real destinations. Footer social links should only be
rendered when their URLs are configured; do not ship `#` links.

## Application navigation

| Group | Routes |
|---|---|
| Overview | `/dashboard` |
| Discover | `/discover`, `/discover/government`, `/discover/grants`, `/discover/commercial` |
| My work | `/saved`, `/my-opportunities`, `/saved-searches`, `/alerts`, `/analytics` |
| Organization | `/teams` and organization member/settings flows |
| Account | `/settings`, authentication/security preferences |
| Platform operations | `/admin*`, permission-restricted and separate from customer navigation |

`/backend-status` remains a development diagnostic, not a customer product
destination. Country/category filters live in discovery state rather than a
world map.

## Main user flows

1. Home → Register → Email verification → (onboarding after a persistence
   contract exists) → Dashboard.
2. Home → Sign in → Dashboard.
3. Dashboard → Discover → Search/filter → Opportunity detail.
4. Opportunity detail → Save → Saved opportunities.
5. Opportunity detail → Track → My opportunities → Preparation workspace.
6. Discover → Save search → Saved searches → Run search → Results.
7. Alerts → Related opportunity detail (live alert delivery remains unconnected).
8. Dashboard → Organization/team → Profile/settings.
9. Authorized platform operator → Admin route; otherwise restricted.

## Route integrity constraints

- `/platform` and the category aliases under `/opportunities/*` are legacy
  paths; preserve them while adding clearer canonical public routes.
- `/opportunity/:id` remains the current detail route; `/opportunities/:id`
  resolves as an alias. Preserve both forms for bookmark/share URLs.
- `/discover/country/:code` filters discovery and does not imply that a map is
  present.
- Current `routes.ts` intentionally includes planned and restricted
  destinations. Keep status copy explicit and do not simulate connected
  functionality.
- Onboarding, reports, and source administration require real data
  contracts/authorization before being made operational.
