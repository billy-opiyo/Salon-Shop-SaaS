import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getLoginUrlForPath } from "@shared/authCallback"
import { listStylistsForUser, MerchantStylistError } from "@backend/services/merchantStylistService"
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
					<p className="auth-card__intro">Manage the stylists available to customers during booking.</p>
				</div>
			</header>
			<section className="manage-store-list" aria-label="Stylists">
				{stylists.length === 0 ? (
					<p className="manage-empty">No stylists have been added.</p>
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
							<button className="button button--primary button--small" type="submit">Save changes</button>
						</form>
						<form action={setStylistActive}>
							<input type="hidden" name="tenantSlug" value={tenantSlug} />
							<input type="hidden" name="stylistId" value={stylist.id} />
							<input type="hidden" name="active" value={String(!stylist.active)} />
							<button className="button button--outline button--small" type="submit">{stylist.active ? "Deactivate" : "Activate"}</button>
						</form>
					</article>
				))}
			</section>
			<form className="onboarding-form" action={addStylist} aria-label="Add stylist">
				<h2>Add stylist</h2>
				<input type="hidden" name="tenantSlug" value={tenantSlug} />
				<label>Name<input name="name" required minLength={2} maxLength={160} /></label>
				<label>Title<input name="title" maxLength={160} /></label>
				<label>Email<input name="email" type="email" /></label>
				<label>Phone<input name="phone" maxLength={32} /></label>
				<button className="button button--primary" type="submit">Add stylist</button>
			</form>
		</main>
	)
}
