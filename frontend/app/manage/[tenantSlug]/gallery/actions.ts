"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import {
	createGalleryStyle,
	deleteGalleryStyle,
	MerchantGalleryError,
	updateGalleryStyle,
	updateGalleryPublication,
} from "@backend/services/merchantGalleryService"
import { galleryMutationSchema } from "@shared/validation/merchant"

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

export async function addGalleryStyle(formData: FormData): Promise<void> {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const parsed = galleryMutationSchema.safeParse({
		tenantSlug: formData.get("tenantSlug"),
		styleName: formData.get("styleName"),
		imageUrl: formData.get("imageUrl"),
		beforeImageUrl: formData.get("beforeImageUrl") || "",
		styleType: formData.get("styleType") || undefined,
		published: formData.get("published") === "true",
	})
	if (!parsed.success) return
	try {
		await createGalleryStyle(session.user.id, parsed.data)
		revalidatePath(`/manage/${parsed.data.tenantSlug}/gallery`)
	} catch (error) {
		if (error instanceof MerchantGalleryError) return
		throw error
	}
}

export async function editGalleryStyle(formData: FormData): Promise<void> {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const id = formData.get("galleryStyleId")
	const parsed = galleryMutationSchema.safeParse({
		tenantSlug: formData.get("tenantSlug"),
		styleName: formData.get("styleName"),
		imageUrl: formData.get("imageUrl"),
		beforeImageUrl: formData.get("beforeImageUrl") || "",
		styleType: formData.get("styleType") || undefined,
		published: formData.get("published") === "true",
	})
	if (!parsed.success || typeof id !== "string") return
	try {
		await updateGalleryStyle(session.user.id, { ...parsed.data, id })
		revalidatePath(`/manage/${parsed.data.tenantSlug}/gallery`)
	} catch (error) {
		if (error instanceof MerchantGalleryError) return
		throw error
	}
}
