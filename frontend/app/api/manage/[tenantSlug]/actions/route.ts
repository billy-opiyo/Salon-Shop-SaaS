import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import {
	MessageStatus,
	ReviewStatus,
	WaitlistStatus,
} from "@prisma/client"

import { updateBookingStatusForUser } from "@backend/services/merchantBookingService"
import { updateWaitlistStatusForUser } from "@backend/services/merchantWaitlistService"
import { convertWaitlistEntryToBooking } from "@backend/services/merchantWaitlistConversionService"
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
	createGalleryStyle,
	updateGalleryStyle,
} from "@backend/services/merchantGalleryService"
import {
	updateBlogPublication,
	deleteBlog,
	createBlogForUser,
	updateBlogForUser,
} from "@backend/services/merchantBlogService"
import { updateServiceCategoryVisibility } from "@backend/services/merchantServiceCatalog"
import {
	removeTeamMemberForUser,
	updateTeamMemberPermissionsForUser,
} from "@backend/services/merchantTeamService"
import {
	clearTenantUserRestriction,
	forceTenantUserLogout,
	forceTenantUserPasswordReset,
	restrictTenantUser,
	resolveSecurityAlert,
} from "@backend/services/merchantSecurityActionsService"
import {
	bookingStatusUpdateSchema,
	blogMutationSchema,
	galleryMutationSchema,
} from "@shared/validation/merchant"
import { updateTenantDesignForUser } from "@backend/services/tenantSettingsService"

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
			case "storefront-design":
				await updateTenantDesignForUser(session.user.id, tenantSlug, input)
				break
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
			case "waitlist-convert":
				if (!id)
					return NextResponse.json(
						{ error: "Waitlist entry id is required" },
						{ status: 400 },
					)
				await convertWaitlistEntryToBooking(session.user.id, tenantSlug, id)
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
			case "gallery-create":
			case "gallery-update": {
				const parsed = galleryMutationSchema.safeParse({
					...input,
					tenantSlug,
				})
				if (!parsed.success)
					return NextResponse.json(
						{ error: "Invalid gallery form" },
						{ status: 400 },
					)
				if (action === "gallery-create")
					await createGalleryStyle(session.user.id, parsed.data)
				else if (id)
					await updateGalleryStyle(session.user.id, { ...parsed.data, id })
				else
					return NextResponse.json({ error: "Gallery id is required" }, { status: 400 })
				break
			}
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
			case "blog-create":
			case "blog-update": {
				const parsed = blogMutationSchema.safeParse({
					...input,
					tenantSlug,
				})
				if (!parsed.success)
					return NextResponse.json(
						{ error: "Invalid blog form" },
						{ status: 400 },
					)
				if (action === "blog-create")
					await createBlogForUser(session.user.id, parsed.data)
				else if (id)
					await updateBlogForUser(session.user.id, { ...parsed.data, id })
				else
					return NextResponse.json({ error: "Blog id is required" }, { status: 400 })
				break
			}
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
			case "security-resolve-alert":
				if (!id)
					return NextResponse.json(
						{ error: "Alert id is required" },
						{ status: 400 },
					)
				await resolveSecurityAlert(session.user.id, tenantSlug, id)
				break
			case "security-restrict-user":
				if (!id || typeof input.durationMinutes !== "number")
					return NextResponse.json(
						{ error: "User and duration are required" },
						{ status: 400 },
					)
				await restrictTenantUser(
					session.user.id,
					tenantSlug,
					id,
					input.durationMinutes,
				)
				break
			case "security-clear-restriction":
				if (!id)
					return NextResponse.json(
						{ error: "User id is required" },
						{ status: 400 },
					)
				await clearTenantUserRestriction(session.user.id, tenantSlug, id)
				break
			case "security-force-logout":
				if (!id)
					return NextResponse.json(
						{ error: "User id is required" },
						{ status: 400 },
					)
				await forceTenantUserLogout(session.user.id, tenantSlug, id)
				break
			case "security-force-password-reset":
				if (!id)
					return NextResponse.json(
						{ error: "User id is required" },
						{ status: 400 },
					)
				await forceTenantUserPasswordReset(session.user.id, tenantSlug, id)
				break
			case "team-member-remove":
				if (!id)
					return NextResponse.json(
						{ error: "Member id is required" },
						{ status: 400 },
					)
				await removeTeamMemberForUser(session.user.id, tenantSlug, id)
				break
			case "team-member-permissions":
				if (!id)
					return NextResponse.json(
						{ error: "Member id is required" },
						{ status: 400 },
					)
				await updateTeamMemberPermissionsForUser(
					session.user.id,
					tenantSlug,
					id,
					{
						canManageBookings:
							typeof input.canManageBookings === "boolean"
								? input.canManageBookings
								: undefined,
						canManageContent:
							typeof input.canManageContent === "boolean"
								? input.canManageContent
								: undefined,
						canManageSecurity:
							typeof input.canManageSecurity === "boolean"
								? input.canManageSecurity
								: undefined,
					},
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
			return NextResponse.json(
				{
					error: error.message,
					...("details" in error && error.details
						? { details: error.details }
						: {}),
				},
				{ status: 400 },
			)
		}
		console.error("Admin action failed:", error)
		return NextResponse.json({ error: "Admin action failed" }, { status: 500 })
	}
}
