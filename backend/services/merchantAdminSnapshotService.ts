import "server-only"

import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
} from "@backend/services/authorization"
import { listBookingsForUser } from "@backend/services/merchantBookingService"
import { listWaitlistForUser } from "@backend/services/merchantWaitlistService"
import { listGalleryForUser } from "@backend/services/merchantGalleryService"
import { listBlogsForUser } from "@backend/services/merchantBlogService"
import { listReviewsForUser } from "@backend/services/merchantReviewService"
import { listMessagesForUser } from "@backend/services/merchantMessageService"
import { listServiceCatalogForUser } from "@backend/services/merchantServiceCatalog"
import { getSecuritySnapshot } from "@backend/services/merchantSecurityService"
import { listStylistsForUser } from "@backend/services/merchantStylistService"
import { listTeamForUser } from "@backend/services/merchantTeamService"

export class MerchantAdminSnapshotError extends Error {
	readonly code = "MERCHANT_ADMIN_SNAPSHOT_FAILED" as const
	constructor(message: string) {
		super(message)
		this.name = "MerchantAdminSnapshotError"
	}
}

async function getTenantIdForAdmin(userId: string, tenantSlug: string) {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: { id: true },
	})
	if (!tenant) throw new MerchantAdminSnapshotError("Store not found.")

	const membership = await prisma.membership.findUnique({
		where: { tenantId_userId: { tenantId: tenant.id, userId } },
		select: {
			tenantId: true,
			userId: true,
			role: true,
			status: true,
			canManageAdmins: true,
			canManageBookings: true,
			canManageContent: true,
			canManageSecurity: true,
		},
	})
	const activeMembership = assertTenantMembership(membership, tenant.id)
	if (
		!activeMembership.canManageAdmins &&
		!activeMembership.canManageBookings &&
		!activeMembership.canManageContent &&
		!activeMembership.canManageSecurity &&
		activeMembership.role !== "OWNER"
	) {
		throw new MerchantAdminSnapshotError("Missing admin permissions.")
	}
	return tenant.id
}

export async function getMerchantAdminSnapshot(
	userId: string,
	tenantSlug: string,
) {
	const tenantId = await getTenantIdForAdmin(userId, tenantSlug)
	const membership = await prisma.membership.findUnique({
		where: { tenantId_userId: { tenantId, userId } },
		select: {
			role: true,
			canManageAdmins: true,
			canManageBookings: true,
			canManageContent: true,
			canManageSecurity: true,
		},
	})
	if (!membership) throw new MerchantAdminSnapshotError("Membership not found.")

	const result: {
		bookings?: Awaited<ReturnType<typeof listBookingsForUser>>
		waitlist?: Awaited<ReturnType<typeof listWaitlistForUser>>
		schedule?: Awaited<ReturnType<typeof listBookingsForUser>>
		gallery?: Awaited<ReturnType<typeof listGalleryForUser>>
		blogs?: Awaited<ReturnType<typeof listBlogsForUser>>
		reviews?: Awaited<ReturnType<typeof listReviewsForUser>>
		messages?: Awaited<ReturnType<typeof listMessagesForUser>>
		services?: Awaited<ReturnType<typeof listServiceCatalogForUser>>
		stylists?: Awaited<ReturnType<typeof listStylistsForUser>>
		team?: Awaited<ReturnType<typeof listTeamForUser>>
		security?: Awaited<ReturnType<typeof getSecuritySnapshot>>
		permissions: typeof membership
	} = { permissions: membership }

	const tasks: Promise<void>[] = []
	if (membership.canManageBookings || membership.role === "OWNER") {
		tasks.push(
			listBookingsForUser(userId, tenantSlug).then((value) => {
				result.bookings = value
				result.schedule = value
			}),
			listWaitlistForUser(userId, tenantSlug).then((value) => {
				result.waitlist = value
			}),
		)
	}
	if (membership.canManageContent || membership.role === "OWNER") {
		tasks.push(
			listGalleryForUser(userId, tenantSlug).then((value) => {
				result.gallery = value
			}),
			listBlogsForUser(userId, tenantSlug).then((value) => {
				result.blogs = value
			}),
			listReviewsForUser(userId, tenantSlug).then((value) => {
				result.reviews = value
			}),
			listMessagesForUser(userId, tenantSlug).then((value) => {
				result.messages = value
			}),
			listServiceCatalogForUser(userId, tenantSlug).then((value) => {
				result.services = value
			}),
			listStylistsForUser(userId, tenantSlug).then((value) => {
				result.stylists = value
			}),
		)
	}
	if (membership.canManageAdmins || membership.role === "OWNER") {
		tasks.push(
			listTeamForUser(userId, tenantSlug).then((value) => {
				result.team = value
			}),
		)
	}
	if (membership.canManageSecurity || membership.role === "OWNER") {
		tasks.push(
			getSecuritySnapshot(userId, tenantSlug).then((value) => {
				result.security = value
			}),
		)
	}

	await Promise.all(tasks)
	return result
}
