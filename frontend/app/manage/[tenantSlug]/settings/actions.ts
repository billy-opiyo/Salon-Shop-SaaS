"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { updateTenantSettingsForUser } from "@backend/services/tenantSettingsService"

export async function saveTenantSettings(formData: FormData) {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const tenantSlug = String(formData.get("tenantSlug") ?? "")
	await updateTenantSettingsForUser(
		session.user.id,
		tenantSlug,
		Object.fromEntries(formData.entries()),
	)
	revalidatePath(`/${tenantSlug}`)
	revalidatePath(`/manage/${tenantSlug}/settings`)
}
