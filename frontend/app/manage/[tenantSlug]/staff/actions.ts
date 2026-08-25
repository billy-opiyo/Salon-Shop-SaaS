"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import {
	createStylistForUser,
	MerchantStylistError,
	setStylistActiveForUser,
} from "@backend/services/merchantStylistService"

export async function addStylist(formData: FormData): Promise<void> {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
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
		return
	try {
		await createStylistForUser(session.user.id, tenantSlug, {
			name: name.trim(),
			title: typeof title === "string" ? title.trim() : "",
			email: typeof email === "string" ? email.trim() : "",
			phone: typeof phone === "string" ? phone.trim() : "",
		})
		revalidatePath(`/manage/${tenantSlug}/staff`)
	} catch (error) {
		if (error instanceof MerchantStylistError) return
		throw error
	}
}

export async function setStylistActive(formData: FormData): Promise<void> {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const tenantSlug = formData.get("tenantSlug")
	const stylistId = formData.get("stylistId")
	const active = formData.get("active")
	if (
		typeof tenantSlug !== "string" ||
		typeof stylistId !== "string" ||
		(active !== "true" && active !== "false")
	)
		return
	try {
		await setStylistActiveForUser(
			session.user.id,
			tenantSlug,
			stylistId,
			active === "true",
		)
		revalidatePath(`/manage/${tenantSlug}/staff`)
	} catch (error) {
		if (error instanceof MerchantStylistError) return
		throw error
	}
}
