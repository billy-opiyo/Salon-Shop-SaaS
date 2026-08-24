# Salon SaaS Next.js Workspace

This folder is the isolated home for the planned multi-tenant Next.js rewrite
of the Salon Shop project.

The transformation is being implemented incrementally. The current foundation
includes the platform homepage, preserved demo storefront, Auth.js credentials
flow, Prisma tenant schema, transactional store provisioning, protected
merchant workspace, plan entitlements, and the initial server-side Turnstile
boundary.

- [PROJECT_RULES.md](PROJECT_RULES.md)
- [SAAS_TRANSFORMATION_PLAN.md](SAAS_TRANSFORMATION_PLAN.md)

The root `package.json` is the canonical build manifest because Next/Turbopack
uses the SaaS root to resolve `backend/` and `shared/`. Use these commands from
this directory:

```text
npm run build
npm run lint
npm run db:format
npm run db:validate
npm run db:generate
```

The production build currently validates with a placeholder pooled Neon URL;
that does not prove a live database connection. Configure a real Neon pooled
`DATABASE_URL`, `AUTH_SECRET`, Turnstile, Resend, R2, and WhatsApp credentials
only in the deployment environment before enabling live workflows.

The Firebase application at the repository root remains the reference and
fallback implementation. Do not delete, rename, or modify its files in place.
Additional parity slices will be added incrementally after each rewrite slice
has a tested parity contract.

The existing Firebase data does not have to be moved immediately. If its data
is only reference or seed content, the new Neon database can be seeded directly.
If real data must be preserved, a separate, controlled Firebase-to-Neon import
will be designed and verified later. The source Firebase project remains
untouched in both cases.
