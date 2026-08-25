import "server-only"

import { Prisma, ReviewStatus } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
} from "@backend/services/authorization"

export class MerchantReviewError extends Error {
	readonly code = "MERCHANT_REVIEW_FAILED" as const
	constructor(message: string) {
		super(message)
		this.name = "MerchantReviewError"
	}
}

async function getTenantId(
	userId: string,
	tenantSlug: string,
): Promise<string> {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: { id: true },
	})
	if (!tenant) throw new MerchantReviewError("Store not found.")
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
	assertTenantPermission(
		assertTenantMembership(membership, tenant.id),
		"canManageContent",
	)
	return tenant.id
}

export async function listReviewsForUser(userId: string, tenantSlug: string) {
	const tenantId = await getTenantId(userId, tenantSlug)
	return prisma.review.findMany({
		where: { tenantId },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			name: true,
			rating: true,
			serviceName: true,
			text: true,
			status: true,
			featured: true,
			replyText: true,
			reportsCount: true,
			createdAt: true,
		},
	})
}

export async function updateReviewForUser(
	userId: string,
	tenantSlug: string,
	reviewId: string,
	update: {
		status?: ReviewStatus
		featured?: boolean
		replyText?: string | null
	},
): Promise<void> {
	const tenantId = await getTenantId(userId, tenantSlug)
	await prisma.$transaction(async (transaction) => {
		const result = await transaction.review.updateMany({
			where: { id: reviewId, tenantId },
			data: update,
		})
		if (result.count !== 1) throw new MerchantReviewError("Review not found.")
		await transaction.adminAuditLog.create({
			data: {
				tenantId,
				actorUserId: userId,
				action: "review.updated",
				resourceType: "review",
				resourceId: reviewId,
				metadata: update as Prisma.InputJsonValue,
			},
		})
	})
}

export async function deleteReviewForUser(
	userId: string,
	tenantSlug: string,
	reviewId: string,
): Promise<void> {
	const tenantId = await getTenantId(userId, tenantSlug)
	const result = await prisma.review.deleteMany({
		where: { id: reviewId, tenantId },
	})
	if (result.count !== 1) throw new MerchantReviewError("Review not found.")
}
