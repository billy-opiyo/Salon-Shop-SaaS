import "server-only"

import { prisma } from "@backend/db/prisma"
import { PLAN_ENTITLEMENTS } from "@shared/constants/plans"

export class UsageLimitError extends Error {
	readonly code = "USAGE_LIMIT_REACHED" as const
}

async function getTenantPlan(tenantId: string) {
	const tenant = await prisma.tenant.findUnique({
		where: { id: tenantId },
		select: { subscription: { select: { plan: { select: { tier: true } } } } },
	})
	const tier = (tenant?.subscription?.plan.tier.toLowerCase() ??
		"starter") as keyof typeof PLAN_ENTITLEMENTS
	return PLAN_ENTITLEMENTS[tier]
}

export async function assertGalleryCapacity(tenantId: string) {
	const [plan, count] = await Promise.all([
		getTenantPlan(tenantId),
		prisma.galleryStyle.count({ where: { tenantId } }),
	])
	if (count >= plan.limits.galleryItems)
		throw new UsageLimitError("Your plan gallery limit has been reached.")
}

export async function assertStorageCapacity(
	tenantId: string,
	additionalBytes: number,
) {
	const [plan, storage] = await Promise.all([
		getTenantPlan(tenantId),
		prisma.mediaAsset.aggregate({
			where: { tenantId, status: "READY" },
			_sum: { byteSize: true },
		}),
	])
	const quotaBytes = plan.limits.storageMegabytes * 1024 * 1024
	if ((storage._sum.byteSize ?? 0) + additionalBytes > quotaBytes)
		throw new UsageLimitError("Your plan storage quota has been reached.")
}

export async function getTenantUsage(tenantId: string) {
	const [plan, galleryItems, staffMembers, storage, bookings] =
		await Promise.all([
			getTenantPlan(tenantId),
			prisma.galleryStyle.count({ where: { tenantId } }),
			prisma.stylist.count({ where: { tenantId } }),
			prisma.mediaAsset.aggregate({
				where: { tenantId, status: "READY" },
				_sum: { byteSize: true },
			}),
			prisma.booking.count({
				where: {
					tenantId,
					createdAt: {
						gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
					},
				},
			}),
		])
	return {
		galleryItems: { used: galleryItems, limit: plan.limits.galleryItems },
		staffMembers: { used: staffMembers, limit: plan.limits.staffMembers },
		storageMegabytes: {
			used: Math.ceil((storage._sum.byteSize ?? 0) / 1024 / 1024),
			limit: plan.limits.storageMegabytes,
		},
		monthlyBookings: { used: bookings, limit: plan.limits.monthlyBookings },
	}
}
