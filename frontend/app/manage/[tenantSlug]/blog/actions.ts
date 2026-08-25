"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import {
	deleteBlog,
	MerchantBlogError,
	updateBlogPublication,
} from "@backend/services/merchantBlogService"

export async function updateBlogStatus(formData: FormData): Promise<void> {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const tenantSlug = formData.get("tenantSlug")
	const blogId = formData.get("blogId")
	const published = formData.get("published")
	if (
		typeof tenantSlug !== "string" ||
		typeof blogId !== "string" ||
		(published !== "true" && published !== "false")
	)
		return
	try {
		await updateBlogPublication(
			session.user.id,
			tenantSlug,
			blogId,
			published === "true",
		)
		revalidatePath(`/manage/${tenantSlug}/blog`)
	} catch (error) {
		if (error instanceof MerchantBlogError) return
		throw error
	}
}

export async function removeBlog(formData: FormData): Promise<void> {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const tenantSlug = formData.get("tenantSlug")
	const blogId = formData.get("blogId")
	if (typeof tenantSlug !== "string" || typeof blogId !== "string") return
	try {
		await deleteBlog(session.user.id, tenantSlug, blogId)
		revalidatePath(`/manage/${tenantSlug}/blog`)
	} catch (error) {
		if (error instanceof MerchantBlogError) return
		throw error
	}
}
