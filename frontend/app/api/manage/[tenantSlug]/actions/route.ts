import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import {
	BookingStatus,
	MessageStatus,
	ReviewStatus,
	WaitlistStatus,
} from "@prisma/client"

import { updateBookingStatusForUser } from "@backend/services/merchantBookingService"
import { updateWaitlistStatusForUser } from "@backend/services/merchantWaitlistService"
import {
	updateMessageStatus,
	deleteMessage,
} from "@backend/services/merchantMessageService"
import {
	updateReviewForUser,
	deleteReviewForUser,
} from "@backend/services/merchantReviewService"
import {
	updateGalleryPublication,
	deleteGalleryStyle,
} from "@backend/services/merchantGalleryService"
import {
	updateBlogPublication,
	deleteBlog,
} from "@backend/services/merchantBlogService"
import { updateServiceCategoryVisibility } from "@backend/services/merchantServiceCatalog"
import { bookingStatusUpdateSchema } from "@shared/validation/merchant"

const statusValues = <T extends string>(
	values: readonly T[],
	value: unknown,
): value is T => typeof value === "string" && values.includes(value as T)

export async function POST(
	request: NextRequest,
	props: { params: Promise<{ tenantSlug: string }> },
) {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	const { tenantSlug } = await props.params
	const body: unknown = await request.json()
	if (typeof body !== "object" || body === null) {
		return NextResponse.json(
			{ error: "Invalid action payload" },
			{ status: 400 },
		)
	}
	const input = body as Record<string, unknown>
	const action = typeof input.action === "string" ? input.action : ""
	const id = typeof input.id === "string" ? input.id : ""

	try {
		switch (action) {
			case "booking-status": {
				const parsed = bookingStatusUpdateSchema.safeParse({
					tenantSlug,
					bookingId: id,
					status: input.status,
				})
				if (!parsed.success)
					return NextResponse.json(
						{ error: "Invalid booking action" },
						{ status: 400 },
					)
				await updateBookingStatusForUser(session.user.id, parsed.data)
				break
			}
			case "waitlist-status":
				if (!id || !statusValues(Object.values(WaitlistStatus), input.status))
					return NextResponse.json(
						{ error: "Invalid waitlist action" },
						{ status: 400 },
					)
				await updateWaitlistStatusForUser(
					session.user.id,
					tenantSlug,
					id,
					input.status,
				)
				break
			case "message-status":
				if (!id || !statusValues(Object.values(MessageStatus), input.status))
					return NextResponse.json(
						{ error: "Invalid message action" },
						{ status: 400 },
					)
				await updateMessageStatus(session.user.id, tenantSlug, id, input.status)
				break
			case "message-delete":
				if (!id)
					return NextResponse.json(
						{ error: "Message id is required" },
						{ status: 400 },
					)
				await deleteMessage(session.user.id, tenantSlug, id)
				break
			case "review-update":
				if (!id)
					return NextResponse.json(
						{ error: "Review id is required" },
						{ status: 400 },
					)
				await updateReviewForUser(session.user.id, tenantSlug, id, {
					status: statusValues(Object.values(ReviewStatus), input.status)
						? input.status
						: undefined,
					featured:
						typeof input.featured === "boolean" ? input.featured : undefined,
					replyText:
						typeof input.replyText === "string" ? input.replyText : undefined,
				})
				break
			case "review-delete":
				if (!id)
					return NextResponse.json(
						{ error: "Review id is required" },
						{ status: 400 },
					)
				await deleteReviewForUser(session.user.id, tenantSlug, id)
				break
			case "gallery-publication":
				if (!id || typeof input.published !== "boolean")
					return NextResponse.json(
						{ error: "Invalid gallery action" },
						{ status: 400 },
					)
				await updateGalleryPublication(
					session.user.id,
					tenantSlug,
					id,
					input.published,
				)
				break
			case "gallery-delete":
				if (!id)
					return NextResponse.json(
						{ error: "Gallery id is required" },
						{ status: 400 },
					)
				await deleteGalleryStyle(session.user.id, tenantSlug, id)
				break
			case "blog-publication":
				if (!id || typeof input.published !== "boolean")
					return NextResponse.json(
						{ error: "Invalid blog action" },
						{ status: 400 },
					)
				await updateBlogPublication(
					session.user.id,
					tenantSlug,
					id,
					input.published,
				)
				break
			case "blog-delete":
				if (!id)
					return NextResponse.json(
						{ error: "Blog id is required" },
						{ status: 400 },
					)
				await deleteBlog(session.user.id, tenantSlug, id)
				break
			case "category-visibility":
				if (!id || typeof input.enabled !== "boolean")
					return NextResponse.json(
						{ error: "Invalid category action" },
						{ status: 400 },
					)
				await updateServiceCategoryVisibility(
					session.user.id,
					tenantSlug,
					id,
					input.enabled,
				)
				break
			default:
				return NextResponse.json(
					{ error: "Unknown admin action" },
					{ status: 400 },
				)
		}
		return NextResponse.json({ ok: true })
	} catch (error) {
		if (
			error instanceof Error &&
			(error.name.startsWith("Merchant") || error.name === "AuthorizationError")
		) {
			return NextResponse.json({ error: error.message }, { status: 400 })
		}
		console.error("Admin action failed:", error)
		return NextResponse.json({ error: "Admin action failed" }, { status: 500 })
	}
}
