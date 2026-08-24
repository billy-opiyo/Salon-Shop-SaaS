# Salon SaaS Next.js Workspace

This folder is the isolated home for the planned multi-tenant Next.js rewrite
of the Salon Shop project.

Current contents are planning and governance documents only:

- [PROJECT_RULES.md](PROJECT_RULES.md)
- [SAAS_TRANSFORMATION_PLAN.md](SAAS_TRANSFORMATION_PLAN.md)

The Firebase application at the repository root remains the reference and
fallback implementation. Do not delete, rename, or modify its files in place.
The Next.js application will be added here incrementally after each rewrite
slice has a tested parity contract.

The existing Firebase data does not have to be moved immediately. If its data
is only reference or seed content, the new Neon database can be seeded directly.
If real data must be preserved, a separate, controlled Firebase-to-Neon import
will be designed and verified later. The source Firebase project remains
untouched in both cases.
