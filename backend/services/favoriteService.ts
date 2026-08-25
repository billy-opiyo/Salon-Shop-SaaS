import "server-only"

import { prisma } from "@backend/db/prisma"

export class FavoriteRequestError extends Error {
	readonly code = "FAVORITE_REQUEST_FAILED" as const

	constructor(message: string) {
		super(message)
		this.name = "FavoriteRequestError"
	}
}

async function resolveTenantStyle(
	userId: string,
	tenantSlug: string,
	galleryStyleId: string,
) {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: { id: true, status: true },
	})
	if (!tenant || tenant.status !== "ACTIVE")
		throw new FavoriteRequestError("This salon is not currently available.")

	const style = await prisma.galleryStyle.findFirst({
		where: { id: galleryStyleId, tenantId: tenant.id, published: true },
		select: { id: true },
	})
	if (!style)
		throw new FavoriteRequestError("That gallery style is not available.")
	return { tenantId: tenant.id, styleId: style.id, userId }
}

export async function saveFavoriteForClient(
	userId: string,
	tenantSlug: string,
	galleryStyleId: string,
) {
	const context = await resolveTenantStyle(userId, tenantSlug, galleryStyleId)
	const favorite = await prisma.favorite.upsert({
		where: {
			tenantId_userId_galleryStyleId: {
				tenantId: context.tenantId,
				userId,
				galleryStyleId: context.styleId,
			},
		},
		create: {
			tenantId: context.tenantId,
			userId,
			galleryStyleId: context.styleId,
		},
		update: {},
		select: { id: true },
	})
	return favorite
}

export async function removeFavoriteForClient(
	userId: string,
	tenantSlug: string,
	galleryStyleId: string,
): Promise<void> {
	const context = await resolveTenantStyle(userId, tenantSlug, galleryStyleId)
	await prisma.favorite.deleteMany({
		where: {
			id: { not: "" },
			tenantId: context.tenantId,
			userId,
			galleryStyleId: context.styleId,
		},
	})
}
