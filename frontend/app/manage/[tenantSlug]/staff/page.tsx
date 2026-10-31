import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { getLoginUrlForPath } from "@shared/authCallback"
import { listStylistsForUser, MerchantStylistError } from "@backend/services/merchantStylistService"
import { ManageSubmitButton } from "@/components/tenant/ManageSubmitButton"
import { addStylist, setStylistActive, updateStylist } from "./actions"

interface StaffPageProps { readonly params: Promise<{ tenantSlug: string }> }

export default async function MerchantStaffPage({ params }: StaffPageProps) {
	const { tenantSlug } = await params
	const session = await auth()
	if (!session?.user?.id)
		redirect(getLoginUrlForPath(`/manage/${tenantSlug}/staff`))
	let stylists; try { stylists = await listStylistsForUser(session.user.id, tenantSlug) } catch (error) { if (error instanceof MerchantStylistError) redirect(`/manage/${tenantSlug}`); throw error }
	return (
		<main className="manage-page">
			<header className="manage-header">
				<div>
					<p className="eyebrow">Team management</p>
					<h1>Staff</h1>
					<p className="auth-card__intro">Manage the stylists available to clients during booking.</p>
				</div>
			</header>
			<section className="manage-store-list" aria-label="Stylists">
				{stylists.length === 0 ? (
					<div className="manage-empty-state">
						<p className="manage-empty">No stylists have been added. Add your team so clients can choose who they would like to book with.</p>
						<Link className="button button--outline button--small" href="#add-stylist">Add your first stylist</Link>
					</div>
				) : stylists.map((stylist) => (
					<article className="manage-store" key={stylist.id}>
						<div>
							<p className="eyebrow">{stylist.active ? "Active" : "Inactive"}</p>
							<h2>{stylist.name}</h2>
							<p>{stylist.title ?? "Stylist"}{stylist.email ? ` · ${stylist.email}` : ""}{stylist.phone ? ` · ${stylist.phone}` : ""}</p>
						</div>
						<form className="onboarding-form staff-stylist-edit" action={updateStylist}>
							<input type="hidden" name="tenantSlug" value={tenantSlug} />
							<input type="hidden" name="stylistId" value={stylist.id} />
							<label>Name<input name="name" defaultValue={stylist.name} required minLength={2} maxLength={160} /></label>
							<label>Title<input name="title" defaultValue={stylist.title ?? ""} maxLength={160} /></label>
							<ManageSubmitButton className="button button--primary button--small" pendingLabel="Saving…">Save changes</ManageSubmitButton>
						</form>
						<form action={setStylistActive}>
							<input type="hidden" name="tenantSlug" value={tenantSlug} />
							<input type="hidden" name="stylistId" value={stylist.id} />
							<input type="hidden" name="active" value={String(!stylist.active)} />
							<ManageSubmitButton className="button button--outline button--small" pendingLabel={stylist.active ? "Deactivating…" : "Activating…"}>{stylist.active ? "Deactivate" : "Activate"}</ManageSubmitButton>
						</form>
					</article>
				))}
			</section>
			<form id="add-stylist" className="onboarding-form" action={addStylist} aria-label="Add stylist">
				<h2>Add stylist</h2>
				<input type="hidden" name="tenantSlug" value={tenantSlug} />
				<label>Name<input name="name" required minLength={2} maxLength={160} /></label>
				<label>Title<input name="title" maxLength={160} /></label>
				<label>Email<input name="email" type="email" /></label>
				<label>Phone<input name="phone" maxLength={32} /></label>
				<ManageSubmitButton pendingLabel="Adding stylist…">Add stylist</ManageSubmitButton>
			</form>
		</main>
	)
}
