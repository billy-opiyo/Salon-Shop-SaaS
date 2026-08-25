import { redirect } from "next/navigation"

import { auth } from "@/auth"
import {
	listServiceCatalogForUser,
	MerchantServiceCatalogError,
} from "@backend/services/merchantServiceCatalog"

import { updateCategoryVisibility } from "./actions"

interface ServicesPageProps {
	readonly params: Promise<{ tenantSlug: string }>
}

export default async function MerchantServicesPage({
	params,
}: ServicesPageProps) {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const { tenantSlug } = await params
	let categories
	try {
		categories = await listServiceCatalogForUser(session.user.id, tenantSlug)
	} catch (error) {
		if (error instanceof MerchantServiceCatalogError)
			redirect(`/manage/${tenantSlug}`)
		throw error
	}
	return (
		<main className="manage-page">
			<header className="manage-header">
				<div>
					<p className="eyebrow">Storefront management</p>
					<h1>Services</h1>
					<p className="auth-card__intro">
						Control which service categories appear across the public storefront
						and booking flow.
					</p>
				</div>
			</header>
			<section className="manage-store-list" aria-label="Service categories">
				{categories.map((category) => (
					<article className="manage-store" key={category.id}>
						<div>
							<p className="eyebrow">
								{category.enabled ? "Visible" : "Hidden"}
							</p>
							<h2>{category.label}</h2>
							<p>
								{category.services.length} services ·{" "}
								{category.services.filter((service) => service.enabled).length}{" "}
								active
							</p>
						</div>
						<form action={updateCategoryVisibility}>
							<input type="hidden" name="tenantSlug" value={tenantSlug} />
							<input type="hidden" name="categoryId" value={category.id} />
							<input
								type="hidden"
								name="enabled"
								value={String(!category.enabled)}
							/>
							<button
								className="button button--outline button--small"
								type="submit"
							>
								{category.enabled ? "Hide category" : "Show category"}
							</button>
						</form>
					</article>
				))}
			</section>
		</main>
	)
}
