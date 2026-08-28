# Beauty Sphia Salon SaaS

Beauty Sphia is a fresh multi-tenant salon SaaS built with Next.js, Prisma,
Neon PostgreSQL, Auth.js, Cloudflare R2, Resend, WhatsApp Cloud API, and
Safaricom Daraja. The legacy Firebase application is reference-only. No
Firebase data migration or dual-run process is planned.

## Implemented Features

### Platform and onboarding

- Beauty Sphia platform homepage with plan presentation and navigation.
- Starter, Business, and Enterprise plan entitlements and KES pricing.
- Account signup with validation, policy acceptance, and Turnstile boundary.
- Transactional tenant provisioning with owner membership, settings, plan,
  subscription, setup invoice, legal acceptance, and default categories.
- Draft-to-active store publishing after setup payment.
- Platform Terms, Privacy Policy, and Cookie Policy pages.
- Platform account profile, password, preference, session, and deletion flows.
- Operator dashboard at `/platform-admin` with audited cross-tenant billing,
  security, notification, and store-status actions.

### Authentication and security

- Auth.js credentials authentication with bcrypt password verification.
- JWT session strategy preserving authenticated user IDs.
- Email verification and one-time password reset tokens with expiry.
- Session invalidation after password reset.
- Administrator-required password reset enforcement.
- Turnstile verification boundary for signup and abuse-sensitive workflows.
- Active membership and permission checks on every protected tenant operation.
- Tenant-scoped audit logs, security alerts, login activity, account history,
  temporary restrictions, forced logout, password-reset actions, and CSV export.
- Cross-tenant ownership checks and inactive-membership rejection.

### Tenant storefront

- Server-rendered tenant storefront at `/{tenantSlug}`.
- Preserved reference salon markup, CSS, scripts, assets, splash experience,
  navigation, themes, gallery, services, booking, waitlist, reviews, blog,
  contact, dashboard, and mobile actions.
- Tenant-configurable business identity, hero content, theme, contact details,
  services, categories, stylists, gallery, reviews, blog posts, and links.
- Category visibility enforced at the public data query boundary.
- Order-only cosmetics path that never creates bookings or slot locks.
- Tenant metadata, fallback assets, image health, and mobile overflow coverage.

### Public customer workflows

- Booking creation with validation, Turnstile, rate limiting, tenant scope,
  transactional slot locking, conflict handling, and lifecycle notifications.
- Booking cancellation and rescheduling with ownership checks, slot release,
  collision protection, audit records, and preserved dashboard actions.
- Waitlist creation, queue position, slot release, status transitions, and
  atomic conversion to confirmed bookings.
- Public contact submission with tenant scope, validation, rate limiting, and
  merchant inbox notification.
- Review submission with verified-client checks and moderation status.
- Review editing, moderation, replies, feature controls, deletion, and abuse
  reporting with rate limiting.
- Tenant-scoped favorites save/remove operations.
- Client dashboard data for profile, bookings, reviews, favorites, and login
  history.

### Merchant management

Protected merchant routes include:

- `/manage/[tenantSlug]` dashboard shell and permission-scoped snapshot.
- `/manage/[tenantSlug]/bookings`
- `/manage/[tenantSlug]/waitlist`
- `/manage/[tenantSlug]/schedule`
- `/manage/[tenantSlug]/gallery`
- `/manage/[tenantSlug]/blog`
- `/manage/[tenantSlug]/reviews`
- `/manage/[tenantSlug]/messages`
- `/manage/[tenantSlug]/services`
- `/manage/[tenantSlug]/staff`
- `/manage/[tenantSlug]/team`
- `/manage/[tenantSlug]/security`
- `/manage/[tenantSlug]/billing`
- `/manage/[tenantSlug]/settings`
- `/manage/[tenantSlug]/preview`
- `/manage/[tenantSlug]/domains`

Management capabilities include:

- Permission-scoped merchant shell and admin snapshot.
- Booking lifecycle actions, schedule day/week views, and quick actions.
- Waitlist queue administration and booking conversion.
- Service and category CRUD with order-only handling and visibility controls.
- Gallery and blog CRUD, publication controls, editing, and audit records.
- Stylist creation and activation/deactivation.
- Team membership listing, invitations, resend/cancel, acceptance, removal,
  permission updates, expiry, and audit records.
- Contact inbox counters, read/resolve status, deletion, and audit records.
- Review moderation, replies, feature controls, deletion, and audit records.
- Security monitoring, alerts, restrictions, forced logout, reset actions, and
  CSV export.
- Tenant branding, contact, theme, hero, and storefront settings.
- Storefront preview link.

### Custom domains

- Business and Enterprise entitlement gating.
- Normalized public hostname validation.
- Registration with a hashed, expiring DNS TXT challenge.
- Five-attempt verification limit.
- `PENDING_VERIFICATION`, `VERIFIED`, `ACTIVE`, `DISABLED`, and `REMOVED`
  domain states.
- Primary-domain activation and fallback promotion on removal.
- Verified active hostname-to-tenant resolution.
- Forwarded-host mismatch rejection to reduce host spoofing risk.
- Authenticated domain management API and merchant UI.
- Optional Vercel project domain add/remove integration.

### Media and storage

- Cloudflare R2 S3-compatible storage integration using AWS SDK SigV4.
- Presigned upload URLs with 15-minute expiry.
- Direct multipart R2 upload support for gallery and avatar routes.
- Tenant-opaque object keys.
- MIME type and size validation for image uploads.
- Tenant storage quota enforcement based on plan entitlement.
- Persisted `MediaAsset` metadata with tenant and uploader ownership.
- R2 `HEAD` finalization checks for declared size and content type.
- Tenant-authorized media deletion.

### Notifications and billing

- Server-only Resend email delivery.
- Server-only WhatsApp Cloud API text delivery with Kenyan phone normalization.
- Booking, waitlist, billing, verification, reset, reminder, and contact
  notification templates.
- Idempotent `NotificationDelivery` records with provider IDs, errors,
  timestamps, retry counters, and persisted template data.
- Exponential retry scheduling with an exhausted-delivery state.
- Signed cron route for notification retries every five minutes.
- User email and WhatsApp preference enforcement.
- Daraja STK Push setup and renewal payment flows.
- Payment callback reconciliation, receipts, failed-payment handling, retries,
  grace period, suspension, reactivation, cancellation, upgrades, downgrades,
  and manual review handling.
- Invoice and payment-attempt records with downloadable invoice endpoint.

### Usage and entitlements

- Server-side plan feature checks for custom domains and merchant operations.
- Storage, gallery, staff, and monthly booking usage calculation.
- Gallery capacity enforcement.
- Merchant usage API at `/api/manage/[tenantSlug]/usage`.
- Server-side entitlement enforcement rather than UI-only feature hiding.

## Architecture

- `frontend/app`: App Router pages, layouts, and Route Handlers.
- `frontend/components`: preserved storefront/admin runtime and shared UI.
- `backend/services`: server-only tenant, auth, booking, billing, media,
  notification, security, content, and authorization services.
- `shared/validation`: Zod schemas shared by server and client boundaries.
- `shared/constants`: Beauty Sphia plans, prices, and entitlements.
- `prisma`: PostgreSQL schema and migrations.
- `tests/unit`: pure validation and authorization tests.
- `tests/e2e`: Playwright storefront and route-boundary acceptance tests.

The browser never receives Prisma access, database credentials, provider
secrets, or internal authorization rules. All tenant-owned operations require
server-side tenant scope and membership authorization.

## Commands

Run commands from the repository root:

```text
npm run dev
npm run build
npm run lint
npm run test:unit
npm run test:e2e
npm run db:format
npm run db:validate
npm run db:generate
```

## Environment Configuration

Copy `.env.example` into the deployment environment and configure:

- pooled Neon `DATABASE_URL` containing `-pooler`;
- `AUTH_SECRET` and Auth.js provider values;
- Cloudflare Turnstile values;
- R2 account, access key, secret, bucket, and public URL;
- Resend API key and sender email;
- WhatsApp Cloud API credentials;
- Daraja credentials and callback URL;
- `CRON_SECRET` for scheduled routes;
- optional `VERCEL_API_TOKEN` and `VERCEL_PROJECT_ID` for custom domains;
- optional platform operator allowlists.

Provider credentials are never committed to the repository. Source validation
does not prove that a live provider, DNS record, SSL certificate, or database
has been configured.

## Fresh Data Policy

This is a new SaaS deployment. The production database starts clean and is
seeded only with approved new SaaS fixtures. The Firebase project and its data
remain untouched as a visual and behavioral reference; no Firebase import,
password-hash transfer, or dual-run is part of this project.

## Validation Status

The current source has passed TypeScript validation, Prisma schema validation,
Prisma client generation when the local query engine is not locked, the full
Vitest suite, and the available Playwright route/storefront suite. Authenticated
database-backed isolation tests and live provider smoke tests require a seeded
test Neon database and operator-owned provider credentials.

See [PROJECT_RULES.md](PROJECT_RULES.md) and
[SAAS_TRANSFORMATION_PLAN.md](SAAS_TRANSFORMATION_PLAN.md) for engineering
rules, release gates, and the detailed phase record.
