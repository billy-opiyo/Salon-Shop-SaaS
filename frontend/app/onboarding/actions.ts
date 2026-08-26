"use server"

import { redirect } from "next/navigation"

import { auth } from "@/auth"
import {
	provisionTenant,
	TenantProvisioningError,
} from "@backend/services/tenantProvisioning"
import { createTenantSchema } from "@shared/validation/tenant"

export type CreateStoreResult =
	| { readonly ok: true; readonly slug: string }
	| { readonly ok: false; readonly message: string }

export async function createStore(
	formData: FormData,
): Promise<CreateStoreResult> {
	const session = await auth()
	if (!session?.user?.id) {
		redirect("/login")
	}

	const parsed = createTenantSchema.safeParse({
		businessName: formData.get("businessName"),
		heroTitle: formData.get("heroTitle") || undefined,
		heroSubtitle: formData.get("heroSubtitle") || undefined,
		slug: formData.get("slug"),
		planTier: formData.get("planTier"),
		country: formData.get("country"),
		city: formData.get("city") || undefined,
		timezone: formData.get("timezone"),
		locale: formData.get("locale"),
		currency: formData.get("currency"),
		termsAccepted: formData.get("termsAccepted") === "on",
		privacyAccepted: formData.get("privacyAccepted") === "on",
		cookiesAccepted: formData.get("cookiesAccepted") === "on",
	})

	if (!parsed.success) {
		return {
			ok: false,
			message: "Please complete the store details correctly.",
		}
	}

	try {
		const tenant = await provisionTenant(session.user.id, parsed.data)
		return { ok: true, slug: tenant.slug }
	} catch (error) {
		if (error instanceof TenantProvisioningError) {
			return { ok: false, message: error.message }
		}
		return {
			ok: false,
			message: "The store could not be created. Please try again.",
		}
	}
}
