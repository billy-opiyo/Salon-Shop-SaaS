import "server-only"

import { Prisma } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
} from "@backend/services/authorization"

export class MerchantGalleryError extends Error {
	readonly code = "MERCHANT_GALLERY_FAILED" as const

	constructor(message: string) {
		super(message)
		this.name = "MerchantGalleryError"
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
	if (!tenant) throw new MerchantGalleryError("Store not found.")
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

export async function listGalleryForUser(userId: string, tenantSlug: string) {
	const tenantId = await getTenantId(userId, tenantSlug)
	return prisma.galleryStyle.findMany({
		where: { tenantId },
		orderBy: { updatedAt: "desc" },
		select: {
			id: true,
			styleName: true,
			styleType: true,
			imageUrl: true,
			beforeImageUrl: true,
			published: true,
			featuredTrending: true,
			featuredMostBooked: true,
			category: { select: { label: true } },
		},
	})
}

export async function updateGalleryPublication(
	userId: string,
	tenantSlug: string,
	galleryStyleId: string,
	published: boolean,
): Promise<void> {
	const tenantId = await getTenantId(userId, tenantSlug)
	await prisma.$transaction(async (transaction) => {
		const result = await transaction.galleryStyle.updateMany({
			where: { id: galleryStyleId, tenantId },
			data: { published },
		})
		if (result.count !== 1)
			throw new MerchantGalleryError("Gallery style not found.")
		await transaction.adminAuditLog.create({
			data: {
				tenantId,
				actorUserId: userId,
				action: `gallery.publication.${published ? "published" : "unpublished"}`,
				resourceType: "gallery-style",
				resourceId: galleryStyleId,
				metadata: { published } as Prisma.InputJsonValue,
			},
		})
	})
}

export async function deleteGalleryStyle(
	userId: string,
	tenantSlug: string,
	galleryStyleId: string,
): Promise<void> {
	const tenantId = await getTenantId(userId, tenantSlug)
	await prisma.$transaction(async (transaction) => {
		const result = await transaction.galleryStyle.deleteMany({
			where: { id: galleryStyleId, tenantId },
		})
		if (result.count !== 1)
			throw new MerchantGalleryError("Gallery style not found.")
		await transaction.adminAuditLog.create({
			data: {
				tenantId,
				actorUserId: userId,
				action: "gallery.deleted",
				resourceType: "gallery-style",
				resourceId: galleryStyleId,
			},
		})
	})
}
