import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { TenantImageUploadField } from "@/components/tenant/TenantImageUploadField"
import { ManageSubmitButton } from "@/components/tenant/ManageSubmitButton"
import { getLoginUrlForPath } from "@shared/authCallback"
import {
	getTenantSettingsForUser,
	TenantSettingsError,
} from "@backend/services/tenantSettingsService"
import { saveTenantSettings } from "./actions"
import {
	DEFAULT_THEME_PRESET,
	THEME_PRESET_OPTIONS,
	isThemePreset,
} from "@shared/constants/themePresets"

export default async function MerchantSettingsPage({
	params,
}: {
	params: Promise<{ tenantSlug: string }>
}) {
	const { tenantSlug } = await params
	const session = await auth()
	if (!session?.user?.id)
		redirect(getLoginUrlForPath(`/manage/${tenantSlug}/settings`))
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
	const savedThemePreset = settings?.themePreset ?? ""
	const selectedThemePreset = isThemePreset(savedThemePreset)
		? savedThemePreset
		: DEFAULT_THEME_PRESET
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
			<section className="manage-card merchant-settings-card" aria-labelledby="merchant-settings-title">
				<h2 id="merchant-settings-title">Storefront and booking settings</h2>
				<p>Shape the salon’s public identity, contact details, and optional online payment settings.</p>
			<form className="onboarding-form merchant-settings-form" action={saveTenantSettings}>
				<input type="hidden" name="tenantSlug" value={tenantSlug} />
				<label>
					Theme preset
					<select name="themePreset" defaultValue={selectedThemePreset} required>
						{THEME_PRESET_OPTIONS.map((preset) => (
							<option key={preset.key} value={preset.key}>
								{preset.label}
							</option>
						))}
					</select>
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
				<TenantImageUploadField tenantSlug={tenantSlug} name="logoUrl" label="Salon logo" kind="LOGO" defaultValue={settings?.logoUrl} />
				<TenantImageUploadField tenantSlug={tenantSlug} name="heroImageUrl" label="Hero image" kind="HERO" defaultValue={settings?.heroImageUrl} />
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
			<label className="merchant-settings-form__wide">
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
				<label className="merchant-settings-deposit-field">
					<span>Partial deposit percentage</span>
					<input
						name="bookingDepositPercent"
						type="number"
						min="1"
						max="100"
						defaultValue={settings?.bookingDepositPercent ?? 50}
					/>
				</label>
			</fieldset>
				<ManageSubmitButton pendingLabel="Saving settings…">Save settings</ManageSubmitButton>
			</form>
			</section>
		</main>
	)
}
