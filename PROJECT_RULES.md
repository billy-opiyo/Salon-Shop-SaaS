# Salon SaaS Next.js Project Rules

These rules govern every file created or changed inside `saas-nextjs`. The
legacy Firebase project remains outside this workspace and must not be changed
as part of the initial transformation planning or implementation work.

## 1. Mandatory technology stack

### Frontend

- Next.js latest stable version, verified again when scaffolding begins.
- React.
- TypeScript for all React components, hooks, utilities, and frontend logic.
- JavaScript only when required by an external library or build tool, with the
  reason documented beside the exception.
- Vercel as the primary hosting target; Cloudflare may provide DNS, WAF, and
  Turnstile.

### Backend

- Node.js runtime through Next.js Route Handlers, Server Actions, and server
  services.
- TypeScript for all backend code.
- Neon PostgreSQL.
- Auth.js authentication with secure server sessions.
- Next.js Server Actions and middleware for protected server workflows.
- Prisma for schemas, queries, migrations, and type safety.
- Cloudflare R2 for media storage.
- Resend for email delivery.
- WhatsApp Cloud API for WhatsApp messages.
- Prisma must use Neon's pooled connection string. `DATABASE_URL` must point
  to a Neon host containing `-pooler`; a direct connection string is not the
  default application connection.

## 2. Coding standards

1. Use `.ts` and `.tsx` by default.
2. Avoid plain JavaScript except for a documented external-library or build
   requirement.
3. Enable strict TypeScript and keep compiler errors at zero.
4. Do not use `any` unless unavoidable, isolated, and documented.
5. Build reusable, accessible React components.
6. Follow clean architecture and keep domain rules independent of UI code.
7. Separate frontend, backend, and shared code.
8. Use environment variables for secrets and provider configuration.
9. Never hardcode API keys, passwords, tokens, or database credentials.
10. Do not expose Prisma clients, SQL, provider SDK secrets, or internal domain
    rules to browser bundles.
11. Preserve the current salon UI, page content, workflows, CSS language, and
    mobile behavior unless a documented parity decision approves a change.

## 3. Security requirements

1. Sensitive business logic stays on the server.
2. Secret keys are server-only and never sent to the browser.
3. Validate inputs on both client and server; server validation is authoritative.
4. Authenticate and authorize every protected server action and route.
5. Sanitize user-generated content before storage and rendering.
6. Use HTTPS-only production communication and secure cookie settings.
7. Rate-limit public and authentication-sensitive endpoints.
8. Use Argon2id or bcrypt for passwords where password credentials are used.
9. Use Auth.js secure session management; never invent an insecure browser JWT
   flow.
10. Protect against XSS, CSRF, SQL injection, SSRF, replay, IDOR, and tenant
    enumeration.
11. Require Cloudflare Turnstile on signup, login-risk, contact, review,
    booking, and other abuse-sensitive public actions as appropriate.
12. Use Cloudflare WAF, security headers, CSP, origin restrictions, and bot
    controls in production.
13. Enforce tenant isolation in server code, Prisma queries, background jobs,
    storage keys, cache keys, logs, and authorization tests.
14. Fail closed when the session, membership, tenant, or entitlement cannot be
    resolved.

## 4. Reverse-engineering mitigation

1. Keep proprietary algorithms and entitlement decisions on the backend.
2. Never expose database queries to frontend code.
3. Never expose internal business rules to browser code.
4. Minimize frontend exposure to sensitive logic and data.
5. Use code splitting, server components, and production builds.
6. Perform sensitive calculations and state transitions on the server.
7. Use server-side validation, API gateways/Route Handlers, and authorization
   middleware.
8. Return minimum necessary response fields.

## 5. Required project structure

The new application is a separate Next.js workspace with this logical layout:

```text
saas-nextjs/
  frontend/
    app/                  # Next.js App Router pages and Route Handlers
    components/           # reusable UI components
    hooks/                # client hooks only
    pages/                # compatibility-only pages; no duplicate App routes
    styles/               # reused/adapted salon CSS and tokens
    middleware.ts         # request/session/tenant edge checks
  backend/
    controllers/          # request-to-use-case adapters
    services/             # server-only domain and integration services
    middleware/           # server authorization, validation, rate limits
    routes/               # typed route contracts and route registration helpers
  shared/
    types/                # shared DTOs and safe value types
    validation/           # Zod schemas shared by client and server
    constants/            # non-secret constants and plan metadata
  prisma/
    schema.prisma
    migrations/
  public/
    assets/               # copied/adapted legacy salon assets
  docs/
```

The App Router is the only routing system for new routes. `pages/` must not be
used to create a second competing route tree; it exists only for a proven
compatibility need.

## 6. Change-control rules

Before modifying or creating a file:

1. Decide whether the change belongs to frontend, backend, shared, data,
   infrastructure, or documentation.
2. Use TypeScript by default.
3. Inspect the existing architecture and extend it rather than creating a
   parallel implementation.
4. Do not introduce a new framework, provider, or database without approval.
5. Preserve compatibility with Next.js, React, Node.js, TypeScript, and any
   unavoidable JavaScript dependency.
6. Keep the Firebase implementation runnable until the rewrite and any
   optional data import/cutover have passed their explicit gates.
7. Verify source behavior, automated tests, and live deployment behavior as
   separate claims. Never report source validation as live service proof.
