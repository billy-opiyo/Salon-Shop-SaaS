"use server"

import {
	createBlogForUser,
	deleteBlog,
	MerchantBlogError,
	updateBlogForUser,
	updateBlogPublication,
} from "@backend/services/merchantBlogService"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { blogMutationSchema } from "@shared/validation/merchant"

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

export async function addBlog(formData: FormData): Promise<void> {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const parsed = blogMutationSchema.safeParse({
		tenantSlug: formData.get("tenantSlug"),
		title: formData.get("title"),
		slug: formData.get("slug"),
		excerpt: formData.get("excerpt"),
		imageUrl: formData.get("imageUrl") || "",
		readTime: formData.get("readTime") || undefined,
		publishDate: formData.get("publishDate"),
		readMoreUrl: formData.get("readMoreUrl") || "",
		published: formData.get("published") === "true",
	})
	if (!parsed.success) return
	try {
		await createBlogForUser(session.user.id, parsed.data)
		revalidatePath(`/manage/${parsed.data.tenantSlug}/blog`)
	} catch (error) {
		if (error instanceof MerchantBlogError) return
		throw error
	}
}

export async function editBlog(formData: FormData): Promise<void> {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const id = formData.get("blogId")
	const parsed = blogMutationSchema.safeParse({
		tenantSlug: formData.get("tenantSlug"),
		title: formData.get("title"),
		slug: formData.get("slug"),
		excerpt: formData.get("excerpt"),
		imageUrl: formData.get("imageUrl") || "",
		readTime: formData.get("readTime") || undefined,
		publishDate: formData.get("publishDate"),
		readMoreUrl: formData.get("readMoreUrl") || "",
		published: formData.get("published") === "true",
	})
	if (!parsed.success || typeof id !== "string") return
	try {
		await updateBlogForUser(session.user.id, { ...parsed.data, id })
		revalidatePath(`/manage/${parsed.data.tenantSlug}/blog`)
	} catch (error) {
		if (error instanceof MerchantBlogError) return
		throw error
	}
}
