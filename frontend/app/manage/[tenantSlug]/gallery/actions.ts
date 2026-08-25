"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import {
	deleteGalleryStyle,
	MerchantGalleryError,
	updateGalleryPublication,
} from "@backend/services/merchantGalleryService"

export async function updateGalleryStatus(formData: FormData): Promise<void> {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const tenantSlug = formData.get("tenantSlug")
	const galleryStyleId = formData.get("galleryStyleId")
	const published = formData.get("published")
	if (
		typeof tenantSlug !== "string" ||
		typeof galleryStyleId !== "string" ||
		(published !== "true" && published !== "false")
	)
		return
	try {
		await updateGalleryPublication(
			session.user.id,
			tenantSlug,
			galleryStyleId,
			published === "true",
		)
		revalidatePath(`/manage/${tenantSlug}/gallery`)
	} catch (error) {
		if (error instanceof MerchantGalleryError) return
		throw error
	}
}

export async function removeGalleryStyle(formData: FormData): Promise<void> {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const tenantSlug = formData.get("tenantSlug")
	const galleryStyleId = formData.get("galleryStyleId")
	if (typeof tenantSlug !== "string" || typeof galleryStyleId !== "string")
		return
	try {
		await deleteGalleryStyle(session.user.id, tenantSlug, galleryStyleId)
		revalidatePath(`/manage/${tenantSlug}/gallery`)
	} catch (error) {
		if (error instanceof MerchantGalleryError) return
		throw error
	}
}
