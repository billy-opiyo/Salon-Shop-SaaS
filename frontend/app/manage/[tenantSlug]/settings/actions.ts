"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { updateTenantSettingsForUser } from "@backend/services/tenantSettingsService"

export async function saveTenantSettings(formData: FormData) {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const tenantSlug = String(formData.get("tenantSlug") ?? "")
	const raw: Record<string, unknown> = Object.fromEntries(formData.entries())
	raw.bookingPaymentsEnabled = formData.get("bookingPaymentsEnabled") === "on"
	raw.bookingPaymentModes = formData
		.getAll("bookingPaymentModes")
		.filter((value): value is string => typeof value === "string")
	await updateTenantSettingsForUser(
		session.user.id,
		tenantSlug,
		raw,
	)
	revalidatePath(`/${tenantSlug}`)
	revalidatePath(`/manage/${tenantSlug}/settings`)
}
