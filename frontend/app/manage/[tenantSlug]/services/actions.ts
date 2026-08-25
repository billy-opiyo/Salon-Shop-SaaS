"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import {
	MerchantServiceCatalogError,
	createServiceForUser,
	deleteServiceForUser,
	updateServiceForUser,
	updateServiceCategoryVisibility,
} from "@backend/services/merchantServiceCatalog"
import { serviceMutationSchema } from "@shared/validation/merchant"

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

function readServiceInput(formData: FormData) {
	return serviceMutationSchema.safeParse({
		tenantSlug: formData.get("tenantSlug"),
		serviceId: formData.get("serviceId") || undefined,
		categoryId: formData.get("categoryId"),
		name: formData.get("name"),
		slug: formData.get("slug"),
		description: formData.get("description"),
		priceLabel: formData.get("priceLabel"),
		durationLabel: formData.get("durationLabel"),
		orderOnly: formData.get("orderOnly") === "true",
	})
}

export async function createService(formData: FormData): Promise<void> {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const parsed = readServiceInput(formData)
	if (!parsed.success) return
	try {
		await createServiceForUser(session.user.id, parsed.data)
		revalidatePath(`/manage/${parsed.data.tenantSlug}/services`)
	} catch (error) {
		if (error instanceof MerchantServiceCatalogError) return
		throw error
	}
}

export async function updateService(formData: FormData): Promise<void> {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const parsed = readServiceInput(formData)
	if (!parsed.success || !parsed.data.serviceId) return
	try {
		await updateServiceForUser(
			session.user.id,
			parsed.data as typeof parsed.data & { serviceId: string },
		)
		revalidatePath(`/manage/${parsed.data.tenantSlug}/services`)
	} catch (error) {
		if (error instanceof MerchantServiceCatalogError) return
		throw error
	}
}

export async function deleteService(formData: FormData): Promise<void> {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const tenantSlug = formData.get("tenantSlug")
	const serviceId = formData.get("serviceId")
	if (typeof tenantSlug !== "string" || typeof serviceId !== "string") return
	try {
		await deleteServiceForUser(session.user.id, tenantSlug, serviceId)
		revalidatePath(`/manage/${tenantSlug}/services`)
	} catch (error) {
		if (error instanceof MerchantServiceCatalogError) return
		throw error
	}
}
