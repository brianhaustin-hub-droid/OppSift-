# Source integration priorities

> Status: three official candidate sources were identified in an initial
> evidence pass. They remain unapproved and inactive; the 30-country research
> and category coverage work is incomplete.

The source-integration backlog should proceed in a defensible order. The order is driven by source quality, regulatory clarity, and the need to establish at least one operational source in each required category before a country is marked live.

## Priority rules

1. Continue official government procurement research across the approved markets, then review SAM.gov and TED API terms.
2. Next, validate funding and grant sources with clear eligibility rules and governance.
3. Then assess private-sector commercial sources with explicit access terms and source integrity requirements.
4. Avoid building a connector for a source that has not passed permission and technical review.
5. Do not mark a country live without coverage in all three categories and a tested connector.

## Proposed delivery order

| Priority | Category | Entry type | Objective | Condition for progression |
| --- | --- | --- | --- | --- |
| 1 | Government | Official tender portal | Establish a verified government source for one approved launch market | Must pass license, access, and technical review |
| 2 | Grants | National funding register | Establish a verified funding source with evidence and clear eligibility rules | Requires reviewed terms and a tested feed or API |
| 3 | Commercial | Supplier or procurement portal | Establish a validated commercial opportunity source | Requires permission review and a tested connector |
| 4 | Multi-country sources | Multilateral or institutional funders | Extend proven patterns to development and grant agencies | Must maintain review and provenance requirements |
| 5 | Regional expansion | Additional launch markets | Add more markets only after first-country coverage is stable | Requires audit trail and regression checks |

## Backlog note

Any future connector should be implemented one source at a time and only after
deterministic tests, permission review, and evidence capture are complete. The
current repository contains reusable generic adapters but no source-specific
production connector or active source.
