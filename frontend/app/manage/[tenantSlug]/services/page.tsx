import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { getLoginUrlForPath } from "@shared/authCallback"
import {
	listServiceCatalogForUser,
	MerchantServiceCatalogError,
} from "@backend/services/merchantServiceCatalog"

import {
	createService,
	deleteService,
	updateCategoryVisibility,
	updateServicePaymentPrice,
} from "./actions"
import { ServiceEditForm } from "./ServiceEditForm"
import { ServiceMutationForm } from "./ServiceMutationForm"
import { formatKesLabel } from "@/components/tenant/formatKesLabel"

interface ServicesPageProps {
	readonly params: Promise<{ tenantSlug: string }>
	readonly searchParams: Promise<{ view?: string | string[] }>
}

export default async function MerchantServicesPage({
	params,
	searchParams,
}: ServicesPageProps) {
	const { tenantSlug } = await params
	const query = await searchParams
	if (query.view !== "catalog")
		redirect(`/manage/${encodeURIComponent(tenantSlug)}?section=services`)
	const session = await auth()
	if (!session?.user?.id)
		redirect(getLoginUrlForPath(`/manage/${tenantSlug}/services`))
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
						<ServiceMutationForm action={updateCategoryVisibility} buttonLabel={category.enabled ? "Hide category" : "Show category"} pendingLabel="Saving…">
							<input type="hidden" name="tenantSlug" value={tenantSlug} />
							<input type="hidden" name="categoryId" value={category.id} />
							<input
								type="hidden"
								name="enabled"
								value={String(!category.enabled)}
							/>
						</ServiceMutationForm>
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
									<strong>Storefront price:</strong> {formatKesLabel(service.priceLabel)}
									 · <strong>Duration:</strong> {service.durationLabel}
								</p>
								<p>
									<strong>Online payment price:</strong>{" "}
									{service.orderOnly
										? "WhatsApp orders only"
										: service.priceMinor !== null &&
											service.priceMinor !== undefined
											? `KES ${Math.round(service.priceMinor / 100).toLocaleString("en-KE")}`
											: "Not configured"}
								</p>
							</div>
							<ServiceMutationForm
								action={deleteService}
								buttonLabel="Delete"
								pendingLabel="Deleting…"
								confirmMessage={`Delete ${service.name}? This cannot be undone.`}
							>
								<input type="hidden" name="tenantSlug" value={tenantSlug} />
								<input type="hidden" name="serviceId" value={service.id} />
							</ServiceMutationForm>
							<details className="service-edit-details">
								<summary>Edit service details</summary>
								<ServiceEditForm
									tenantSlug={tenantSlug}
									categoryId={category.id}
									categories={categories.map(({ id, label }) => ({ id, label }))}
									service={service}
								/>
							</details>
							{!service.orderOnly && (
								<ServiceMutationForm className="service-price-form" action={updateServicePaymentPrice} buttonLabel="Save online price" pendingLabel="Saving…">
									<input type="hidden" name="tenantSlug" value={tenantSlug} />
									<input type="hidden" name="serviceId" value={service.id} />
									<label>
										Online payment price (KES)
										<input
											name="priceMinor"
											type="number"
											min="0"
											max="100000"
											step="1"
											defaultValue={service.priceMinor === null || service.priceMinor === undefined ? "" : Math.round(service.priceMinor / 100)}
											required
										/>
									</label>
								</ServiceMutationForm>
							)}
						</article>
					)),
				)}
				<ServiceMutationForm className="onboarding-form" action={createService} buttonLabel="Add service" pendingLabel="Adding service…">
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
						Online payment price (KES)
						<input name="priceMinor" type="number" min="0" max="100000" step="1" />
						<small>Enter whole KES only (for example, 1300). Set a price to enable online payment for this service.</small>
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
				</ServiceMutationForm>
			</section>
		</main>
	)
}
