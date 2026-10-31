"use client"

import { useActionState } from "react"

import { updateService, type UpdateServiceResult } from "./actions"
import { ServiceSubmitButton } from "./ServiceSubmitButton"

interface ServiceEditFormProps {
	readonly tenantSlug: string
	readonly categoryId: string
	readonly categories: readonly { readonly id: string; readonly label: string }[]
	readonly service: {
		readonly id: string
		readonly name: string
		readonly slug: string
		readonly description: string
		readonly priceLabel: string
		readonly priceMinor: number | null
		readonly durationLabel: string
		readonly orderOnly: boolean
	}
}

const initialState: UpdateServiceResult = { ok: false, message: "" }

export function ServiceEditForm({
	tenantSlug,
	categoryId,
	categories,
	service,
}: ServiceEditFormProps) {
	const [state, formAction] = useActionState(updateService, initialState)
	return (
		<form className="onboarding-form" action={formAction}>
			<input type="hidden" name="tenantSlug" value={tenantSlug} />
			<input type="hidden" name="serviceId" value={service.id} />
			<label>
				Category
				<select name="categoryId" defaultValue={categoryId} required>
					{categories.map((category) => (
						<option key={category.id} value={category.id}>
							{category.label}
						</option>
					))}
				</select>
			</label>
			<label>
				Name
				<input name="name" defaultValue={service.name} required minLength={2} maxLength={160} />
			</label>
			<label>
				Slug
				<input name="slug" defaultValue={service.slug} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={160} />
			</label>
			<label>
				Description
				<textarea name="description" defaultValue={service.description} required maxLength={3000} />
			</label>
			<label>
				Price label
				<input name="priceLabel" defaultValue={service.priceLabel} required maxLength={120} />
			</label>
			<label>
				Online payment price (KES)
				<input name="priceMinor" type="number" min="0" max="100000" step="0.01" defaultValue={service.priceMinor === null ? "" : (service.priceMinor / 100).toFixed(2)} />
				<small>Leave blank if online payment is not offered.</small>
			</label>
			<label>
				Duration label
				<input name="durationLabel" defaultValue={service.durationLabel} required maxLength={80} />
			</label>
			<label className="service-edit-order-only">
				<input name="orderOnly" type="checkbox" value="true" defaultChecked={service.orderOnly} />
				WhatsApp order only
			</label>
			<ServiceSubmitButton pendingLabel="Saving service…">
				Save service details
			</ServiceSubmitButton>
			{state.message && (
				<p className={state.ok ? "form-message form-message--success" : "form-message form-message--error"} role={state.ok ? "status" : "alert"} aria-live={state.ok ? "polite" : "assertive"}>
				{state.message}
				</p>
			)}
		</form>
	)
}
