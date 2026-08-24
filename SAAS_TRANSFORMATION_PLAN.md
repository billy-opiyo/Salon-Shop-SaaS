# Salon Shop to Multi-Tenant Salon SaaS Transformation Plan

## 1. Purpose and outcome

Transform the current Royal Braids Firebase salon website into a production-
grade, multi-tenant salon SaaS platform while preserving the current salon
store experience and behavior. Individual salon owners will be able to:

1. Visit the platform homepage.
2. Register and create a salon workspace/store.
3. Select Starter, Business, or Enterprise service entitlements.
4. Configure and publish a branded salon website.
5. Manage bookings, waitlists, schedule, gallery, blogs, reviews, messages,
   services, staff, and security from a protected management area.
6. Share a tenant store URL and, when enabled by plan, connect a custom domain.

The transformation is a staged Next.js SaaS rewrite. The existing Firebase
application remains intact while the new application is built and verified.
Moving existing Firebase data is optional and depends on whether the current
data is reference content or live business data. No Firebase production
cutover is implied by this plan.

## 1A. Implementation status — 24 August 2026

Completed in the isolated SaaS workspace:

- Next.js 16.3.2 App Router foundation with strict TypeScript and root-managed
  build commands.
- Platform homepage with Starter, Business, and Enterprise plan presentation,
  splash experience, onboarding CTA, and preserved demo tenant route.
- Typed tenant storefront contract with server-side tenant lookup and mobile
  action links.
- Prisma 6.12 schema covering tenants, memberships, plans, subscriptions,
  bookings, waitlists, reviews, media, notifications, security telemetry, and
  audit history. The booking/waitlist relationship is constrained as a true
  optional one-to-one link.
- Auth.js credentials foundation with database sessions, bcrypt password
  verification, verified-email gating, protected `/manage` and `/onboarding`
  routes, and server-side Turnstile verification boundary.
- Transactional tenant provisioning: owner membership, tenant settings, plan,
  trial subscription, and default service categories are created atomically.
- Root `package.json`, `.env.example`, project rules, and isolated-reference
  guardrails. The Firebase project remains unchanged.
- Production Next.js build and Prisma format/validate/generate checks pass with
  a non-secret pooled-Neon placeholder URL.

Still gated or in progress:

- Live Neon connection, migrations, seed execution, Auth.js secret, Turnstile,
  Resend, R2, WhatsApp, domain/DNS, Vercel, Cloudflare WAF, and production
  billing configuration require operator-owned credentials and approvals.
- Full salon storefront/admin feature parity remains the next implementation
  stream. Reference pages and CSS are preserved under `reference/` until each
  module has a typed Next.js parity implementation and acceptance test.

## 2. Audit baseline

The reference implementation is a static Firebase Hosting site with a
DOM-driven JavaScript frontend and Firebase Functions backend:

| Area | Current reference | Rewrite implication |
|---|---|---|
| Public site | `public/index.html`, `public/JS/script.js`, `public/CSS/style.css` | Rebuild as typed App Router components while preserving layout, copy, selectors, interactions, and responsive behavior. |
| Splash | `public/JS/splash.js` plus splash CSS/markup | Preserve the branded salon splash and its progress, reduced-motion, completion event, and reveal behavior for tenant stores. |
| Admin | `public/admin.html`, `public/JS/admin.js` | Split into protected merchant management routes with server-enforced membership permissions. |
| Configuration | `public/client-config.js`, `functions/client-config.js` | Replace per-copy configuration with tenant-scoped database settings and validated public configuration DTOs. |
| Data | Firestore collections and `firestore.rules` | Recreate the business model in Neon/PostgreSQL with Prisma, tenant foreign keys, constraints, indexes, and transactional workflows. Import existing data only if it must be preserved. |
| Backend | `functions/index.js` | Move callable, trigger, and scheduled behavior into server services, Route Handlers/Server Actions, and scheduled jobs. |
| Media | Cloudinary signed uploads | Replace with server-authorized, presigned Cloudflare R2 uploads and tenant-isolated object keys. |
| Email | Resend through Functions | Move to server-only Resend services with delivery records and retries. |
| WhatsApp | WhatsApp Cloud API through Functions | Move to a server-only integration with tenant/provider configuration and delivery tracking. |
| QA | Playwright, Vitest, rules emulator, Jest | Preserve behavioral coverage and add tenant isolation, API, Prisma, and entitlement tests. |

The authoritative feature inventory is `public/FEATURES.md`. Booking and slot
semantics are defined in `public/BOOKING_WAITLIST_SCHEDULE_LOGIC.md`. Admin
behavior is defined in `public/ADMIN_CONSOLE_USER_MANUAL.md`. These remain
reference documents until equivalent Next.js behavior is tested.

## 3. Non-negotiable parity contract

### Tenant storefront parity

Every published tenant store must preserve the current store layout and core
experience:

- splash screen, hero image, welcome copy, animated salon title, progress bar,
  reduced-motion behavior, and reveal event;
- rotating/logo treatment, header, navigation, dark/light mode, theme presets,
  mobile menu, smooth section navigation, counters, scroll animations, footer,
  SEO metadata, favicon, 404 recovery, and small-screen polish;
- the homepage sections and order: home, gallery, services, booking, client
  dashboard, reviews, blog, visit/contact information, contact form, footer;
- all service categories and service fields, including cosmetics products as
  WhatsApp-only order items that never create bookings or slot locks;
- gallery filters, sort modes, featured rails, before/after lightbox, favorites,
  empty states, and disabled-category behavior;
- booking validation, dynamic service/time/stylist choices, transactional slot
  lock, confirmation state, reschedule, cancellation, waitlist prompt, and
  race-condition handling;
- email/password authentication, verified-email gating, password reset,
  anonymous/guest flow where retained, profile, dashboard, favorites, login
  history, security preferences, and account deletion flow;
- approved reviews, review login gate, submission/edit/moderation states,
  ratings, sorting, feature/reply/report behavior, and profanity controls;
- realtime-equivalent updates for public content and merchant operations;
- contact form, service WhatsApp links, floating WhatsApp shortcut, phone,
  email, map, hours, social links, and all tenant-configurable content;
- mobile action icon links: preserve the existing floating contact/WhatsApp
  affordance and add a responsive icon action group for Book, WhatsApp, Call,
  Directions, and Menu/Account where the current viewport needs it. Every icon
  must have an accessible label, visible focus state, and tenant-aware URL.

### Merchant management parity

The protected merchant experience must retain the current admin capabilities:

- email verification and authorized access gate;
- role and permission-based tabs;
- bookings, statuses, lifecycle-safe actions, slot release metadata, filters,
  counters, detail views, and confirmations;
- waitlist queue positions, status transitions, action matrix, notifications,
  and linked booking synchronization;
- day/week schedule, navigation, time buckets, event selection, detail panel,
  and quick actions;
- gallery CRUD, category-specific fields, before/after media, featured flags,
  live preview, publish checklist, and uploads;
- blog CRUD, image upload, pagination/scroll controls, and public publishing;
- review moderation, editing, replies, statuses, feature/delete, sorting, and
  abuse/content controls;
- contact inbox statuses, filters, sorting, delete, and counters;
- service-category visibility controls consumed by the storefront;
- security telemetry, counters, filters, exports, sessions, alerts, account
  history, timeline, and incident response actions;
- delegated staff/admin access with active state, roles, permissions, and audit
  records.

Parity is measured by behavior and acceptance tests, not by retaining the
legacy DOM or copying insecure client-side data access.

## 4. New product model

### Platform surfaces

The new application has two clearly separated experiences:

1. **Platform home (`/`)**: opens after the platform splash screen and explains
   the SaaS value proposition, shows Starter/Business/Enterprise plans, feature
   comparison, onboarding steps, security/trust information, testimonials or
   examples, FAQs, and calls to create a store, sign in, or discover published
   salons.
2. **Tenant storefront (`/{tenantSlug}` or tenant subdomain)**: preserves the
   current salon homepage layout and tenant content. The tenant slug/domain is
   resolved on the server before data is read.

Platform branding must be separate from each salon's branding. The current
Royal Braids identity is a tenant seed/reference, not a hardcoded platform
identity.

### Tenant lifecycle

1. User creates an account and accepts platform terms/privacy policy.
2. User creates a tenant with business name, slug, country, currency, timezone,
   contact details, and owner membership.
3. The platform creates default categories, service catalog, settings, theme,
   legal configuration, and a draft storefront in one transaction.
4. User chooses a plan and completes plan-specific onboarding.
5. User configures content and previews the storefront.
6. User publishes only when required settings, legal acceptance, security
   checks, and plan entitlements are valid.
7. Customers use the published storefront; owners and staff use `/manage`.

### Plans and entitlements

Plan names are fixed as requested; prices, taxes, billing provider, trial
length, and currency remain configuration decisions and must not be invented in
code.

| Plan | Intended baseline entitlements |
|---|---|
| Starter | One salon store, core branding, services, gallery, blog, contact, booking, basic reviews, owner dashboard, basic notifications, platform subdomain, and capped usage. |
| Business | Starter plus expanded staff/admin permissions, advanced schedule/waitlist, richer gallery/blog/reviews, customer/security insights, additional media/usage, WhatsApp/email automation, and custom-domain readiness. |
| Enterprise | Business plus negotiated usage, multiple locations or workspaces if approved, advanced roles/security/audit, custom domains, priority support, data/export controls, and enterprise onboarding. |

Every feature is enforced by a server-side entitlement service. Hiding a UI
button is never the enforcement mechanism. Plan limits must be checked in
Server Actions, Route Handlers, background jobs, upload signing, and scheduled
notifications.

## 5. Target architecture

The new code lives only under `saas-nextjs` and follows
`PROJECT_RULES.md`.

### Request and data flow

```text
Browser
  -> Next.js Server Component or Client Component
  -> typed Server Action / Route Handler
  -> auth + Turnstile + rate limit + tenant membership + entitlement checks
  -> backend controller
  -> domain service
  -> Prisma transaction
  -> Neon PostgreSQL
  -> safe DTO returned to browser
```

Provider calls follow the same server path. Browser code never calls Prisma,
Neon, Resend, WhatsApp Cloud, or R2 with private credentials.

### Frontend structure

- App Router layouts for platform, tenant storefront, client account, and
  merchant management shells.
- Server Components for public content and data that does not require browser
  state.
- Client Components only for interaction-heavy UI such as splash controls,
  gallery lightbox, booking picker, theme switcher, mobile action bar, and
  realtime/polling views.
- Reusable typed components for cards, forms, modals, tabs, badges, tables,
  empty states, loading states, error states, and confirmations.
- Legacy CSS is copied/adapted into `frontend/styles` and imported through the
  new global stylesheet. CSS variables, theme presets, responsive breakpoints,
  splash animation rules, and small-screen chip/badge rules are preserved first;
  cleanup follows visual parity tests.
- Images use `next/image` only after dimensions, remote patterns, R2 URLs, and
  placeholder/fallback behavior are defined.

### Backend structure

- `backend/controllers`: converts validated requests into use-case calls.
- `backend/services`: tenant resolution, authorization, entitlements, booking
  locking, waitlist, notifications, media, content, security, and billing
  services.
- `backend/middleware`: session, tenant, permission, entitlement, Turnstile,
  CSRF/origin, rate-limit, and request-size checks.
- `frontend/app/api`: thin typed Route Handlers for web-service endpoints.
- Server Actions: only for same-application mutations where progressive
  enhancement and action semantics are useful.
- Scheduled jobs: Vercel Cron or an approved worker route with signed/internal
  authorization; jobs always iterate by tenant and enforce tenant scope.

## 6. Tenant isolation design

Every tenant-owned table has a non-null `tenantId` except global platform
tables. Tenant resolution is based on a verified host/slug mapping, never on an
untrusted client-supplied hidden field. Every repository query requires a
tenant context. Cross-tenant reads are denied by default.

Required safeguards:

- composite unique keys and indexes include `tenantId` where appropriate;
- membership and role checks run on the server for every protected operation;
- storage keys begin with an opaque tenant identifier, not only a human slug;
- cache and revalidation tags include tenant identity;
- logs and exports are tenant-scoped and redact personal data;
- platform support access is explicit, audited, time-limited, and not equivalent
  to normal merchant access;
- tenant deletion/export is a controlled, audited workflow;
- tests attempt horizontal privilege escalation for every major resource.

## 7. Prisma and Neon data model

The schema will be designed in phases, but the core entities are:

### Platform and identity

- `User`, `Account`, `Session`, `VerificationToken` for Auth.js;
- `Tenant`, `TenantDomain`, `TenantSettings`, `TenantPublication`;
- `Membership`, `Role`, `Permission` or typed role/permission policies;
- `Plan`, `Subscription`, `EntitlementSnapshot`, `UsageCounter`;
- `LegalAcceptance`, `Invitation`, `SupportAccessGrant`.

### Storefront and operations

- `ServiceCategory`, `Service`, `Stylist`, `GalleryStyle`, `BlogPost`;
- `Booking`, `BookingSlot`, `WaitlistEntry`;
- `Review`, `ReviewReport`, `ContactMessage`, `Favorite`;
- `MediaAsset`, `NotificationDelivery`, `RateLimitRecord`;
- `LoginActivity`, `SecurityAlert`, `AccountChangeHistory`,
  `ActivityTimeline`, `AdminAuditLog`.

The schema must use timestamps, enums or validated status values, foreign keys,
unique constraints, indexes for tenant and operational queries, soft-delete or
retention policy where required, and explicit audit fields. Booking slot locks,
waitlist conversion, cancellation/release, and reschedule must use Prisma
transactions and database constraints so two requests cannot claim the same
slot.

`DATABASE_URL` is configured with Neon pooled `-pooler` host syntax for runtime
connections. A separate direct/admin URL may be documented only for migration
tools if Neon requires it; it must never replace the pooled application URL.

## 8. Authentication and authorization

- Use Auth.js with secure, HTTP-only, same-site cookies and server session
  checks.
- Support email/password and the provider decisions approved for the platform;
  preserve guest booking only if the new legal and abuse model permits it.
- Hash passwords with Argon2id or bcrypt. Never import plaintext credentials.
- Require verified email before owner management access and before any retained
  client dashboard behavior that needs identity assurance.
- Separate platform roles, tenant membership roles, and support roles.
- Model merchant permissions equivalent to the current `canManageAdmins`,
  `canManageBookings`, `canManageContent`, and `canManageSecurity` flags.
- Enforce route and action authorization on the server; the client only mirrors
  the resulting UI state.
- Log authentication, role changes, security actions, and sensitive account
  changes without storing passwords or tokens.
- Use Turnstile and rate limits around login, registration, verification resend,
  password reset, contact, review, booking, and public tenant discovery.

## 9. Integrations

### Cloudflare R2

Implement server-authorized presigned uploads. Validate MIME type, size,
dimensions, extension, content, tenant ownership, and plan quota. Store only
R2 object metadata in PostgreSQL and serve through a controlled public or signed
URL strategy.

### Resend

Create a server-only email service for verification, booking confirmation,
reminders, waitlist notices, contact notifications, and account/security
messages. Record provider message ID, tenant, template, status, error, and
timestamps. Use idempotency keys for retries.

### WhatsApp Cloud API

Create a server-only message service with tenant-configured sender settings,
Kenya/local number normalization where needed, template/message policy,
delivery status, retry, and opt-out handling. Preserve the current customer
WhatsApp ordering and booking/reminder behavior.

### Vercel and Cloudflare

Use Vercel for Next.js deployment. Use Cloudflare DNS/WAF/Turnstile and R2.
Document domain routing, preview/prod environment separation, webhook
verification, CSP, security headers, and rollback. Live provider status must be
verified separately from successful builds and tests.

## 10. Route and experience map

### Platform routes

- `/` — platform splash then SaaS homepage;
- `/plans` — plan comparison and entitlement explanation;
- `/discover` — published tenant discovery, if enabled;
- `/signup`, `/login`, `/verify-email`, `/forgot-password`, `/reset-password`;
- `/onboarding` — create tenant, choose plan, configure identity;
- `/account` — platform account, memberships, subscriptions, security;
- `/support`, `/terms`, `/privacy`.

### Tenant routes

- `/{tenantSlug}` — current salon homepage layout;
- `/{tenantSlug}/404` or tenant-aware not-found behavior;
- tenant route state for gallery, booking, dashboard, reviews, blog, contact,
  and account interactions while preserving the current one-page navigation;
- future verified custom domains resolve to the same tenant storefront without
  allowing host spoofing.

### Merchant routes

- `/manage` — merchant shell and dashboard;
- `/manage/bookings`, `/manage/waitlist`, `/manage/schedule`;
- `/manage/gallery`, `/manage/blog`, `/manage/reviews`, `/manage/messages`;
- `/manage/services`, `/manage/staff`, `/manage/security`, `/manage/settings`;
- `/manage/team`, `/manage/billing`, `/manage/domains`, `/manage/preview`.

All management routes require verified session, active membership, tenant
context, and the specific permission/plan entitlement.

## 11. Rewrite and optional data-import strategy

### Phase A: freeze the reference contract

- Inventory all current pages, IDs, forms, CSS selectors, assets, local storage
  keys, Firestore collections, callable functions, scheduled jobs, rules, and
  tests.
- Mark each behavior as implemented, fallback, provider-dependent, or future
  proposal. Do not treat documentation-only future ideas as current features.
- Capture visual baselines at desktop, tablet, 490px, 390px, and 360px.
- Add parity test names before changing behavior.

### Phase B: scaffold the isolated Next.js application

- Verify the latest stable Next.js, React, TypeScript, Prisma, Auth.js, and
  Node-compatible versions at scaffold time; lock exact versions.
- Create the required frontend/backend/shared structure.
- Add strict TypeScript, linting, formatting, test commands, environment
  validation, server-only boundaries, and CI.
- Add safe placeholder environment examples without credentials.
- Do not connect production providers yet.

### Phase C: foundation and tenant boundary

- Implement Prisma schema, Neon development database, Prisma migrations, seed
  data,
  tenant resolution, memberships, roles, entitlements, audit primitives, and
  Auth.js.
- Add platform splash/home shell and owner onboarding.
- Add tenant-aware layout and a minimal published store route.
- Prove a user in Tenant A cannot read or mutate Tenant B data.

### Phase D: visual storefront parity

- Copy the existing assets and CSS into the new workspace without changing the
  Firebase source.
- Rebuild splash, header, hero, navigation, theme system, mobile menu,
  sections, footer, mobile action icon links, and responsive rules.
- Replace global DOM mutation with typed props, server DTOs, and controlled
  client state.
- Compare screenshots and interaction tests against the reference.

### Phase E: public functionality parity

Implement in this order so dependencies are explicit:

1. tenant settings, service catalog, categories, stylists, and public content;
2. gallery, filters, before/after lightbox, favorites, and R2 media;
3. booking form, availability, transactional slot locking, confirmation, and
   guest/authenticated behavior;
4. waitlist, queue position, slot release, and notifications;
5. Auth.js account/dashboard, verification, reset, preferences, history, and
   account deletion;
6. reviews, moderation states, reports, replies, and blog;
7. contact form, WhatsApp actions, Resend, and delivery tracking.

Order-only cosmetics must remain an explicit non-booking path in the domain
service, not just a frontend conditional.

### Phase F: merchant management parity

- Implement protected shell, membership permissions, and server-side section
  access.
- Rebuild each current admin tab with typed tables/forms and server actions.
- Move slot-release and waitlist conversion to transaction-backed use cases.
- Add R2 gallery/blog upload flow, moderation, messages, services, staff, and
  security dashboards.
- Add audit logs, exports, retention, and support access controls.

### Phase G: platform monetization and lifecycle

- Finalize pricing, billing provider, tax/legal wording, trials, grace periods,
  cancellation, refunds, failed-payment handling, and plan-change policy.
- Implement subscription state and entitlement snapshots server-side.
- Gate quotas and paid features in actions, APIs, uploads, cron jobs, and UI.
- Implement publish/unpublish, custom domain workflow, usage reporting, and
  upgrade/downgrade state transitions.

### Phase H: optional Firebase data import and dual-run validation

This phase is conditional, not automatic.

- If the Firebase records are reference/demo content, skip import and create a
  clean Royal Braids seed tenant from approved fixtures.
- If live customer, booking, content, or operational data must be preserved,
  export only the approved Firestore collections without exposing credentials or
  production data in the repository.
- Build a versioned, idempotent import tool that maps the current salon into one
  tenant and records source IDs for traceability.
- Validate users, content, bookings, slots, waitlist, reviews, messages,
  settings, media references, timestamps, and statuses.
- Use a staging Neon database and isolated R2 bucket/prefix first.
- Run read-only comparison and workflow reconciliation against the Firebase
  reference. Do not write to production from import tests.
- Decide whether existing Firebase Auth users can be safely invited/reset into
  Auth.js; never copy password hashes unless compatibility and security are
  proven.
- Keep the original Firebase records unchanged until import reconciliation and
  rollback checks pass.

### Phase I: release and cutover

- Deploy the Next.js app to a separate Vercel project/environment.
- Configure Cloudflare DNS, WAF, Turnstile, R2, Neon, Resend, and WhatsApp only
  in approved environments.
- Run source checks, Prisma database migration checks, tenant isolation tests, E2E,
  accessibility, performance, security, and provider smoke checks.
- Switch one controlled tenant first, retain Firebase fallback, monitor errors,
  booking/notification delivery, and reconcile data.
- Expand tenant by tenant only after rollback criteria remain clear.

## 12. Test and acceptance plan

### Automated layers

- TypeScript/lint/build checks.
- Vitest unit tests for pure domain helpers, normalization, plan limits,
  status matrices, message builders, and tenant resolution.
- Prisma integration tests against an isolated Neon test database.
- Route Handler and Server Action tests for validation, auth, authorization,
  rate limits, idempotency, and error contracts.
- Playwright browser tests for platform, onboarding, tenant storefront,
  customer, mobile action icons, merchant, and responsive flows.
- Security tests for IDOR, cross-tenant access, CSRF/origin, XSS payloads,
  upload abuse, SSRF, rate-limit bypass, and role escalation.
- Optional import tests for repeatability, source-to-target counts, and orphan
  detection.

### Required parity scenarios

- splash completion and reduced-motion reveal;
- terms acceptance and auth/verification gating;
- theme persistence and preset preview;
- each service category and order-only cosmetics path;
- gallery filtering, lightbox, favorites, and fallback/empty state;
- booking success, taken slot, transaction conflict, reschedule, cancellation,
  waitlist, and slot release;
- review login gate, submission, moderation, sorting, and public approval;
- blog, contact, phone, map, email, WhatsApp, and mobile actions;
- merchant permission visibility and server denial for unauthorized mutations;
- schedule day/week behavior and lifecycle-safe actions;
- admin security filters, exports, incident actions, and audit entries;
- Tenant A/B isolation across every resource and provider object key;
- plan quota enforcement and publish gating.

### Release gates

No rewrite slice is complete until:

1. Its behavior has an acceptance test.
2. Its server authorization is tested independently of UI visibility.
3. Its tenant scope is tested with a second tenant.
4. Its source/build validation is green.
5. Its live provider behavior is separately verified where applicable.
6. Its rollback and data-reconciliation procedure is documented.

## 13. Operational, legal, and data decisions still required

These are decisions for confirmation, not assumptions to encode:

- platform public name/domain and whether this is part of Nurava Tech;
- exact Starter/Business/Enterprise pricing, limits, trial, billing currency,
  taxes, refunds, and merchant-of-record position;
- billing provider and webhook authority;
- whether one subscription covers one location or multiple locations;
- custom domain availability and enterprise support commitments;
- retained guest bookings versus mandatory customer accounts;
- data retention, export, deletion, backups, and regional hosting requirements;
- privacy, terms, cookie/analytics consent, marketing opt-in, and WhatsApp
  messaging consent wording;
- provider accounts, sender domains, WhatsApp templates, R2 lifecycle rules,
  WAF policy, Turnstile site keys, and incident contacts.

Until these are decided, the implementation must use explicit configuration and
feature gates rather than fabricated prices, provider states, or legal claims.

## 14. Current risks and mitigations

- **Large untyped frontend:** rewrite one slice at a time; retain behavior tests
  and use typed DTOs.
- **Single-tenant assumptions in Firestore:** make `tenantId` mandatory in the
  Prisma domain and test every repository boundary.
- **Client-side Firebase reads/writes:** replace them with server-authorized
  actions; never copy the security model into browser conditionals.
- **Booking races:** use PostgreSQL transactions and unique constraints.
- **Provider dependence:** use delivery records, retries, idempotency, and
  truthful readiness states.
- **Visual regressions from CSS conversion:** reuse CSS first, screenshot-test
  before refactoring.
- **Sensitive repository artifacts:** audit `admin-auth-export.json`, config
  files, logs, and public configuration before optional import tooling or
  deployment.
  Do not copy credentials, auth exports, or production identifiers into the new
  workspace.
- **Branding collision:** keep platform and tenant identity separate; Royal
  Braids is seed/reference content only.
- **Scope growth:** complete parity and tenant safety before AI, discovery
  growth, or nonessential marketplace features.

## 15. First implementation slice after this plan

The next approved coding step should be limited to the new workspace foundation:

1. scaffold the latest stable Next.js App Router application in
   `saas-nextjs/frontend`;
2. add strict TypeScript, environment validation, shared types, and empty
   server-only boundaries;
3. add a non-production Prisma schema for `User`, `Tenant`, `Membership`,
   `Plan`, and `Subscription` with a pooled Neon URL example;
4. render the platform splash/home shell and a tenant route using fixture data;
5. add the first cross-tenant authorization and visual parity tests.

No Firebase source file should be deleted or rewritten in that slice.

## 16. Reference files audited

- `public/FEATURES.md` — implemented feature inventory and data collections.
- `public/index.html` — public page structure, splash, sections, forms, and
  action targets.
- `public/admin.html` — management sections, controls, and accessibility
  hooks.
- `public/CSS/style.css` — theme presets, layout, animation, responsive rules,
  splash, booking, gallery, and admin styling.
- `public/JS/script.js` — public runtime behavior and Firebase workflows.
- `public/JS/admin.js` — admin runtime, permission gating, listeners, forms, and
  management actions.
- `public/JS/splash.js`, `apply-client-config.js`, and
  `theme-preset-preview.js` — splash, white-label, and theme behavior.
- `functions/index.js` — callable, trigger, scheduled, notification, upload,
  security, waitlist, and booking automation.
- `firestore.rules` — current Firebase authorization and payload constraints.
- `public/ADMIN_CONSOLE_USER_MANUAL.md` — merchant operating behavior.
- `public/BOOKING_WAITLIST_SCHEDULE_LOGIC.md` — booking/slot/waitlist state and
  action semantics.
- `AUTOMATED_TESTING.md`, `CLIENT_AUTOMATION_START.md`, `maintenance.md`, and
  `tests/` — QA, client configuration, and operational constraints.

This plan is a source-grounded implementation map. It is not evidence that
Neon, Vercel, R2, Resend, WhatsApp, Turnstile, or Cloudflare WAF is currently
configured or live.
