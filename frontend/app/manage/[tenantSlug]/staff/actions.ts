"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { getLoginUrlForPath } from "@shared/authCallback"
import {
	createStylistForUser,
	MerchantStylistError,
	setStylistActiveForUser,
	updateStylistForUser,
} from "@backend/services/merchantStylistService"

export interface StylistMutationResult {
	readonly ok: boolean
	readonly message: string
}

const invalidResult: StylistMutationResult = {
	ok: false,
	message: "Check the stylist details and try again.",
}

export async function addStylist(
	_previousState: StylistMutationResult,
	formData: FormData,
): Promise<StylistMutationResult> {
	const session = await auth()
	if (!session?.user?.id) redirect(getLoginUrlForPath(`/manage/${encodeURIComponent(String(formData.get("tenantSlug") ?? "").trim())}/staff`))
	const tenantSlug = formData.get("tenantSlug")
	const name = formData.get("name")
	const title = formData.get("title")
	const email = formData.get("email")
	const phone = formData.get("phone")
	if (
		typeof tenantSlug !== "string" ||
		typeof name !== "string" ||
		name.trim().length < 2
	)
		return invalidResult
	try {
		await createStylistForUser(session.user.id, tenantSlug, {
			name: name.trim(),
			title: typeof title === "string" ? title.trim() : "",
			email: typeof email === "string" ? email.trim() : "",
			phone: typeof phone === "string" ? phone.trim() : "",
		})
		revalidatePath(`/manage/${tenantSlug}/staff`)
		revalidatePath(`/${tenantSlug}`)
		return { ok: true, message: "Stylist added." }
	} catch (error) {
		if (error instanceof MerchantStylistError) return { ok: false, message: error.message }
		throw error
	}
}

export async function setStylistActive(
	_previousState: StylistMutationResult,
	formData: FormData,
): Promise<StylistMutationResult> {
	const session = await auth()
	if (!session?.user?.id) redirect(getLoginUrlForPath(`/manage/${encodeURIComponent(String(formData.get("tenantSlug") ?? "").trim())}/staff`))
	const tenantSlug = formData.get("tenantSlug")
	const stylistId = formData.get("stylistId")
	const active = formData.get("active")
	if (
		typeof tenantSlug !== "string" ||
		typeof stylistId !== "string" ||
		(active !== "true" && active !== "false")
	)
		return invalidResult
	try {
		await setStylistActiveForUser(
			session.user.id,
			tenantSlug,
			stylistId,
			active === "true",
		)
		revalidatePath(`/manage/${tenantSlug}/staff`)
		revalidatePath(`/${tenantSlug}`)
		return { ok: true, message: active === "true" ? "Stylist activated." : "Stylist deactivated." }
	} catch (error) {
		if (error instanceof MerchantStylistError) return { ok: false, message: error.message }
		throw error
	}
}

export async function updateStylist(
	_previousState: StylistMutationResult,
	formData: FormData,
): Promise<StylistMutationResult> {
	const session = await auth()
	if (!session?.user?.id) redirect(getLoginUrlForPath(`/manage/${encodeURIComponent(String(formData.get("tenantSlug") ?? "").trim())}/staff`))
	const tenantSlug = formData.get("tenantSlug")
	const stylistId = formData.get("stylistId")
	const name = formData.get("name")
	const title = formData.get("title")
	const email = formData.get("email")
	const phone = formData.get("phone")
	if (
		typeof tenantSlug !== "string" ||
		typeof stylistId !== "string" ||
		typeof name !== "string" ||
		name.trim().length < 2 ||
		(email !== null && typeof email !== "string") ||
		(phone !== null && typeof phone !== "string")
	)
		return invalidResult
	try {
		await updateStylistForUser(session.user.id, tenantSlug, stylistId, {
			name: name.trim(),
			title: typeof title === "string" ? title.trim() : "",
			email: typeof email === "string" ? email.trim() : "",
			phone: typeof phone === "string" ? phone.trim() : "",
		})
		revalidatePath(`/manage/${tenantSlug}/staff`)
		revalidatePath(`/${tenantSlug}`)
		return { ok: true, message: "Stylist details saved." }
	} catch (error) {
		if (error instanceof MerchantStylistError) return { ok: false, message: error.message }
		throw error
	}
}
