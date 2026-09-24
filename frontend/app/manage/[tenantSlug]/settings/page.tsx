import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
	getTenantSettingsForUser,
	TenantSettingsError,
} from "@backend/services/tenantSettingsService"
import { saveTenantSettings } from "./actions"

export default async function MerchantSettingsPage({
	params,
}: {
	params: Promise<{ tenantSlug: string }>
}) {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const { tenantSlug } = await params
	let data
	try {
		data = await getTenantSettingsForUser(session.user.id, tenantSlug)
	} catch (error) {
		if (
			error instanceof TenantSettingsError ||
			(error instanceof Error && error.name === "AuthorizationError")
		)
			redirect(`/manage/${tenantSlug}`)
		throw error
	}
	const settings = data.settings
	return (
		<main className="manage-page">
			<header className="manage-header">
				<div>
					<p className="eyebrow">Storefront management</p>
					<h1>{data.tenant.businessName} settings</h1>
					<p className="auth-card__intro">
						Control the public identity and contact details for this salon.
					</p>
				</div>
			</header>
			<form className="onboarding-form" action={saveTenantSettings}>
				<input type="hidden" name="tenantSlug" value={tenantSlug} />
				<label>
					Theme preset
					<input
						name="themePreset"
						defaultValue={settings?.themePreset ?? "gold"}
						required
					/>
				</label>
				<label>
					Theme mode
					<select name="themeMode" defaultValue={settings?.themeMode ?? "dark"}>
						<option value="dark">Dark</option>
						<option value="light">Light</option>
					</select>
				</label>
				<label>
					Hero title
					<input
						name="heroTitle"
						defaultValue={settings?.heroTitle ?? ""}
						maxLength={140}
					/>
				</label>
				<label>
					Hero subtitle
					<input
						name="heroSubtitle"
						defaultValue={settings?.heroSubtitle ?? ""}
						maxLength={160}
					/>
				</label>
				<label>
					Logo URL
					<input
						name="logoUrl"
						type="url"
						defaultValue={settings?.logoUrl ?? ""}
					/>
				</label>
				<label>
					Hero image URL
					<input
						name="heroImageUrl"
						type="url"
						defaultValue={settings?.heroImageUrl ?? ""}
					/>
				</label>
				<label>
					Primary phone
					<input
						name="phonePrimary"
						defaultValue={settings?.phonePrimary ?? ""}
					/>
				</label>
				<label>
					WhatsApp URL
					<input
						name="whatsappUrl"
						type="url"
						defaultValue={settings?.whatsappUrl ?? ""}
					/>
				</label>
				<label>
					Secondary phone
					<input
						name="phoneSecondary"
						defaultValue={settings?.phoneSecondary ?? ""}
					/>
				</label>
				<label>
					Primary email
					<input
						name="emailPrimary"
						type="email"
						defaultValue={settings?.emailPrimary ?? ""}
					/>
				</label>
				<label>
					Bookings email
					<input
						name="emailBookings"
						type="email"
						defaultValue={settings?.emailBookings ?? ""}
					/>
				</label>
			<label>
				Address
					<textarea
						name="address"
						defaultValue={settings?.address ?? ""}
						maxLength={500}
					/>
			</label>
			<fieldset className="legal-consent">
				<legend>Online booking payments</legend>
				<label>
					<input
						name="bookingPaymentsEnabled"
						type="checkbox"
						defaultChecked={settings?.bookingPaymentsEnabled ?? false}
					/>
					Enable M-Pesa payments for normal service bookings
				</label>
				<p className="form-help">
					WhatsApp orders and WhatsApp bookings are never charged here.
				</p>
				<label>
					<input
						name="bookingPaymentModes"
						type="checkbox"
						value="partial"
						defaultChecked={Array.isArray(settings?.bookingPaymentModes) && settings.bookingPaymentModes.includes("partial")}
					/>
					Partial payment deposit
				</label>
				<label>
					<input
						name="bookingPaymentModes"
						type="checkbox"
						value="full"
						defaultChecked={Array.isArray(settings?.bookingPaymentModes) && settings.bookingPaymentModes.includes("full")}
					/>
					Full payment
				</label>
				<label>
					<input
						name="bookingPaymentModes"
						type="checkbox"
						value="after_service"
						defaultChecked={Array.isArray(settings?.bookingPaymentModes) && settings.bookingPaymentModes.includes("after_service")}
					/>
					Pay after service
				</label>
				<label>
					Partial deposit percentage
					<input
						name="bookingDepositPercent"
						type="number"
						min="1"
						max="100"
						defaultValue={settings?.bookingDepositPercent ?? 50}
					/>
				</label>
			</fieldset>
				<button className="button button--primary" type="submit">
					Save settings
				</button>
			</form>
		</main>
	)
}
