"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import {
	MerchantServiceCatalogError,
	updateServiceCategoryVisibility,
} from "@backend/services/merchantServiceCatalog"

export async function updateCategoryVisibility(
	formData: FormData,
): Promise<void> {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const tenantSlug = formData.get("tenantSlug")
	const categoryId = formData.get("categoryId")
	const enabled = formData.get("enabled")
	if (
		typeof tenantSlug !== "string" ||
		typeof categoryId !== "string" ||
		(enabled !== "true" && enabled !== "false")
	)
		return
	try {
		await updateServiceCategoryVisibility(
			session.user.id,
			tenantSlug,
			categoryId,
			enabled === "true",
		)
		revalidatePath(`/manage/${tenantSlug}/services`)
	} catch (error) {
		if (error instanceof MerchantServiceCatalogError) return
		throw error
	}
}
