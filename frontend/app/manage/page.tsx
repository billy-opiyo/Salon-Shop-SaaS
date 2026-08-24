import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { listTenantsForUser } from "@backend/services/tenantProvisioning";

export default async function ManagePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const tenants = await listTenantsForUser(session.user.id);

  return (
    <main className="manage-page">
      <header className="manage-header">
        <div><p className="eyebrow">Merchant workspace</p><h1>Good to see you, {session.user.name ?? session.user.email}.</h1></div>
        <div className="manage-header__actions">
          <Link className="button button--primary" href="/onboarding">Create a store</Link>
          <Link className="button button--outline" href="/royal-braids">Preview demo</Link>
        </div>
      </header>
      <section className="manage-stores" aria-labelledby="stores-title">
        <div className="section-heading"><p className="eyebrow">Your stores</p><h2 id="stores-title">Tenant workspaces</h2></div>
        {tenants.length === 0 ? <p className="manage-empty">You have not created a store yet. Start with a plan and your first public address.</p> : <div className="manage-store-list">{tenants.map((tenant) => <article className="manage-store" key={tenant.id}><div><p className="eyebrow">{tenant.subscription?.plan.displayName ?? "Starter"} · {tenant.status}</p><h3>{tenant.businessName}</h3><p>/{tenant.slug}</p></div><Link className="button button--outline button--small" href={`/${tenant.slug}`}>Open storefront</Link></article>)}</div>}
      </section>
      <section className="manage-grid" aria-label="Merchant management areas">
        {[
          ["Bookings", "Appointments, slot safety, and customer follow-up."],
          ["Storefront", "Services, gallery, blog, reviews, and contact content."],
          ["Team", "Memberships, roles, and staff access."],
          ["Security", "Account activity, alerts, and audit history."],
        ].map(([title, description]) => <article className="manage-card" key={title}><p className="eyebrow">Coming next</p><h2>{title}</h2><p>{description}</p></article>)}
      </section>
    </main>
  );
}
