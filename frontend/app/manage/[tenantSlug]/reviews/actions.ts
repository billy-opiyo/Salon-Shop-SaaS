"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { ReviewStatus } from "@prisma/client"

import { auth } from "@/auth"
import {
	deleteReviewForUser,
	MerchantReviewError,
	updateReviewForUser,
} from "@backend/services/merchantReviewService"

export async function updateReview(formData: FormData): Promise<void> {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const tenantSlug = formData.get("tenantSlug")
	const reviewId = formData.get("reviewId")
	const status = formData.get("status")
	const featured = formData.get("featured")
	const replyText = formData.get("replyText")
	if (typeof tenantSlug !== "string" || typeof reviewId !== "string") return
	const update: {
		status?: ReviewStatus
		featured?: boolean
		replyText?: string | null
	} = {}
	if (status === "PENDING" || status === "APPROVED" || status === "REJECTED")
		update.status = status
	if (featured === "true" || featured === "false")
		update.featured = featured === "true"
	if (typeof replyText === "string") update.replyText = replyText.trim() || null
	try {
		await updateReviewForUser(session.user.id, tenantSlug, reviewId, update)
		revalidatePath(`/manage/${tenantSlug}/reviews`)
	} catch (error) {
		if (error instanceof MerchantReviewError) return
		throw error
	}
}

export async function deleteReview(formData: FormData): Promise<void> {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const tenantSlug = formData.get("tenantSlug")
	const reviewId = formData.get("reviewId")
	if (typeof tenantSlug !== "string" || typeof reviewId !== "string") return
	try {
		await deleteReviewForUser(session.user.id, tenantSlug, reviewId)
		revalidatePath(`/manage/${tenantSlug}/reviews`)
	} catch (error) {
		if (error instanceof MerchantReviewError) return
		throw error
	}
}
