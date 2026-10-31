"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { getLoginUrlForPath } from "@shared/authCallback"
import {
	MerchantServiceCatalogError,
	createServiceForUser,
	deleteServiceForUser,
	updateServiceForUser,
	updateServicePaymentPriceForUser,
	updateServiceCategoryVisibility,
} from "@backend/services/merchantServiceCatalog"
import {
	serviceMutationSchema,
	servicePriceUpdateSchema,
} from "@shared/validation/merchant"

export interface ServiceMutationResult {
	readonly ok: boolean
	readonly message: string
}

const invalidResult: ServiceMutationResult = {
	ok: false,
	message: "Check the details and try again.",
}

function readKesMinor(value: FormDataEntryValue | null): number | undefined {
	if (value === null || value === "") return undefined
	if (typeof value !== "string") return Number.NaN
	const amount = value.trim()
	if (!/^\d+$/.test(amount)) return Number.NaN
	return Number(amount) * 100
}

export async function updateCategoryVisibility(
	_previousState: ServiceMutationResult,
	formData: FormData,
): Promise<ServiceMutationResult> {
	const session = await auth()
	if (!session?.user?.id) redirect(getLoginUrlForPath(`/manage/${encodeURIComponent(String(formData.get("tenantSlug") ?? "").trim())}/services?view=catalog`))
	const tenantSlug = formData.get("tenantSlug")
	const categoryId = formData.get("categoryId")
	const enabled = formData.get("enabled")
	if (
		typeof tenantSlug !== "string" ||
		typeof categoryId !== "string" ||
		(enabled !== "true" && enabled !== "false")
	)
		return invalidResult
	try {
		await updateServiceCategoryVisibility(
			session.user.id,
			tenantSlug,
			categoryId,
			enabled === "true",
		)
		revalidatePath(`/manage/${tenantSlug}/services`)
		return { ok: true, message: `Category ${enabled === "true" ? "shown" : "hidden"}.` }
	} catch (error) {
		if (error instanceof MerchantServiceCatalogError) return { ok: false, message: error.message }
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
		priceMinor: readKesMinor(formData.get("priceMinor")),
		durationLabel: formData.get("durationLabel"),
		orderOnly: formData.get("orderOnly") === "true",
	})
}

export async function createService(_previousState: ServiceMutationResult, formData: FormData): Promise<ServiceMutationResult> {
	const session = await auth()
	if (!session?.user?.id) redirect(getLoginUrlForPath(`/manage/${encodeURIComponent(String(formData.get("tenantSlug") ?? "").trim())}/services?view=catalog`))
	const parsed = readServiceInput(formData)
	if (!parsed.success) return invalidResult
	try {
		await createServiceForUser(session.user.id, parsed.data)
		revalidatePath(`/manage/${parsed.data.tenantSlug}/services`)
		return { ok: true, message: "Service added." }
	} catch (error) {
		if (error instanceof MerchantServiceCatalogError) return { ok: false, message: error.message }
		throw error
	}
}

export type UpdateServiceResult = ServiceMutationResult

export async function updateService(
	_previousState: UpdateServiceResult,
	formData: FormData,
): Promise<UpdateServiceResult> {
	const session = await auth()
	if (!session?.user?.id) redirect(getLoginUrlForPath(`/manage/${encodeURIComponent(String(formData.get("tenantSlug") ?? "").trim())}/services?view=catalog`))
	const parsed = readServiceInput(formData)
	if (!parsed.success || !parsed.data.serviceId)
		return { ok: false, message: "Check the service details and try again." }
	try {
		await updateServiceForUser(
			session.user.id,
			parsed.data as typeof parsed.data & { serviceId: string },
		)
		revalidatePath(`/manage/${parsed.data.tenantSlug}/services`)
		return { ok: true, message: "Service details saved." }
	} catch (error) {
		if (error instanceof MerchantServiceCatalogError)
			return { ok: false, message: error.message }
		throw error
	}
}

export async function deleteService(_previousState: ServiceMutationResult, formData: FormData): Promise<ServiceMutationResult> {
	const session = await auth()
	if (!session?.user?.id) redirect(getLoginUrlForPath(`/manage/${encodeURIComponent(String(formData.get("tenantSlug") ?? "").trim())}/services?view=catalog`))
	const tenantSlug = formData.get("tenantSlug")
	const serviceId = formData.get("serviceId")
	if (typeof tenantSlug !== "string" || typeof serviceId !== "string") return invalidResult
	try {
		await deleteServiceForUser(session.user.id, tenantSlug, serviceId)
		revalidatePath(`/manage/${tenantSlug}/services`)
		return { ok: true, message: "Service deleted." }
	} catch (error) {
		if (error instanceof MerchantServiceCatalogError) return { ok: false, message: error.message }
		throw error
	}
}

export async function updateServicePaymentPrice(_previousState: ServiceMutationResult, formData: FormData): Promise<ServiceMutationResult> {
	const session = await auth()
	if (!session?.user?.id) redirect(getLoginUrlForPath(`/manage/${encodeURIComponent(String(formData.get("tenantSlug") ?? "").trim())}/services?view=catalog`))
	const parsed = servicePriceUpdateSchema.safeParse({
		tenantSlug: formData.get("tenantSlug"),
		serviceId: formData.get("serviceId"),
		priceMinor: readKesMinor(formData.get("priceMinor")),
	})
	if (!parsed.success) return invalidResult
	try {
		await updateServicePaymentPriceForUser(session.user.id, parsed.data)
		revalidatePath(`/manage/${parsed.data.tenantSlug}/services`)
		revalidatePath(`/${parsed.data.tenantSlug}`)
		return { ok: true, message: "Online payment price saved." }
	} catch (error) {
		if (error instanceof MerchantServiceCatalogError) return { ok: false, message: error.message }
		throw error
	}
}
