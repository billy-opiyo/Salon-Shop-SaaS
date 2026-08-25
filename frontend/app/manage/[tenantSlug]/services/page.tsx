import { redirect } from "next/navigation"

import { auth } from "@/auth"
import {
	listServiceCatalogForUser,
	MerchantServiceCatalogError,
} from "@backend/services/merchantServiceCatalog"

import {
	createService,
	deleteService,
	updateCategoryVisibility,
	updateService,
} from "./actions"

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
			<section
				className="manage-store-list"
				aria-labelledby="service-catalog-title"
			>
				<h2 id="service-catalog-title">Service catalog</h2>
				{categories.flatMap((category) =>
					category.services.map((service) => (
						<article className="manage-store" key={service.id}>
							<div>
								<p className="eyebrow">
									{category.label} · {service.enabled ? "Active" : "Inactive"}
								</p>
								<h3>{service.name}</h3>
								<p>
									{service.priceLabel} · {service.durationLabel}
									{service.orderOnly ? " · WhatsApp order only" : ""}
								</p>
							</div>
							<form action={deleteService}>
								<input type="hidden" name="tenantSlug" value={tenantSlug} />
								<input type="hidden" name="serviceId" value={service.id} />
								<button
									className="button button--outline button--small"
									type="submit"
								>
									Delete
								</button>
							</form>
						</article>
					)),
				)}
				<form className="onboarding-form" action={createService}>
					<label>
						Category
						<select name="categoryId" required>
							{categories.map((category) => (
								<option key={category.id} value={category.id}>
									{category.label}
								</option>
							))}
						</select>
					</label>
					<label>
						Name
						<input name="name" required minLength={2} maxLength={160} />
					</label>
					<label>
						Slug
						<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
					</label>
					<label>
						Description
						<textarea name="description" required maxLength={3000} />
					</label>
					<label>
						Price label
						<input name="priceLabel" required maxLength={120} />
					</label>
					<label>
						Duration label
						<input name="durationLabel" required maxLength={80} />
					</label>
					<label>
						<input name="orderOnly" type="checkbox" value="true" /> WhatsApp
						order only
					</label>
					<input type="hidden" name="tenantSlug" value={tenantSlug} />
					<button className="button button--primary" type="submit">
						Add service
					</button>
				</form>
			</section>
		</main>
	)
}
