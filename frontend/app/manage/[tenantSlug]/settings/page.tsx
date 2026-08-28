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
				<button className="button button--primary" type="submit">
					Save settings
				</button>
			</form>
		</main>
	)
}
