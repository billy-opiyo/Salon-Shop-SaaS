# Firestore rules migration

The SaaS application does not expose the legacy Firestore client or rules to
the browser. Firestore rules are authorization policy references; the
equivalent policy is enforced by Auth.js sessions, server-only middleware,
Zod validation, Prisma tenant scoping, and API route handlers.

## Enforcement map

| Legacy rule area | SaaS enforcement |
| --- | --- |
| `hasAdminPermission()` / active admin membership | `backend/middleware/tenantAuthorization.ts` resolves the normalized tenant slug, requires an active membership, and checks the requested capability. Owner access remains the server-side role override in `backend/services/authorization.ts`. |
| `bookings` owner/admin reads and constrained owner updates | Customer booking APIs validate the authenticated session and booking owner; merchant booking services require `canManageBookings` and validate allowed status transitions and tenant ownership. |
| `bookingSlots` public availability and owner/admin locks | Public availability is read through server routes; slot writes are authenticated, tenant-scoped, validated, and rate-limited. |
| `waitlist` owner cancellation and admin processing | Waitlist services require the authenticated customer for cancellation and `canManageBookings` for conversion, notification, and moderation. |
| `siteSettings`, `galleryStyles`, `blogs` public reads/content writes | Storefront reads use the public tenant projection; merchant services require `canManageContent` before create/update/delete. |
| `reviews` approved public reads, owner pending edits, moderation | Public queries only return approved tenant reviews; customer and merchant mutations are session-checked, tenant-scoped, schema-validated, and rate-limited. |
| `users` and favorites owner access | Authenticated account routes require the current user ID; server queries never accept a browser-supplied tenant or owner override. |
| `userSessions`, security alerts, account history, activity timeline | Server-created security records are not writable through public APIs. Reads require the current user or `canManageSecurity`; admin audit logs remain server-generated. |
| `contactMessages` public submission and content-admin inbox | Contact submission is validated and rate-limited by the API; inbox reads, updates, and deletion require `canManageContent`. |
| `rateLimits` and server-generated audit records | No browser write path exists. These records are written only by server services with provider/database credentials. |

## Important parity and security guarantees

- All mutations use the current Auth.js session on the server; client payloads
  cannot grant themselves a role, tenant ID, approval state, or admin flag.
- Prisma queries are tenant-scoped before records are returned or changed.
- Zod schemas replace Firestore `keys().hasOnly(...)`, type, length, and enum
  checks at API boundaries.
- Rate limiting, Turnstile verification, CSRF/origin checks, and server-side
  sanitization remain in the API services where the legacy public write paths
  required them.
- The legacy Firebase project and its rules remain untouched in `reference/`.
  This file documents the replacement boundary; it is not a deployment
  instruction to run Firestore and PostgreSQL authorization in parallel.
