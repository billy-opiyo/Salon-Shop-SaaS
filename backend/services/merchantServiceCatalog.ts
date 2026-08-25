import "server-only"

import { Prisma } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
} from "@backend/services/authorization"
import type { ServiceMutationInput } from "@shared/validation/merchant"

export class MerchantServiceCatalogError extends Error {
	readonly code = "MERCHANT_SERVICE_CATALOG_FAILED" as const

	constructor(message: string) {
		super(message)
		this.name = "MerchantServiceCatalogError"
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
	if (!tenant) throw new MerchantServiceCatalogError("Store not found.")
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

export async function listServiceCatalogForUser(
	userId: string,
	tenantSlug: string,
) {
	const tenantId = await getTenantId(userId, tenantSlug)
	return prisma.serviceCategory.findMany({
		where: { tenantId },
		orderBy: { sortOrder: "asc" },
		select: {
			id: true,
			label: true,
			enabled: true,
			services: {
				orderBy: { sortOrder: "asc" },
				select: {
					id: true,
					name: true,
					priceLabel: true,
					durationLabel: true,
					enabled: true,
					orderOnly: true,
				},
			},
		},
	})
}

export async function updateServiceCategoryVisibility(
	userId: string,
	tenantSlug: string,
	categoryId: string,
	enabled: boolean,
): Promise<void> {
	const tenantId = await getTenantId(userId, tenantSlug)
	await prisma.$transaction(async (transaction) => {
		const result = await transaction.serviceCategory.updateMany({
			where: { id: categoryId, tenantId },
			data: { enabled },
		})
		if (result.count !== 1)
			throw new MerchantServiceCatalogError("Service category not found.")
		await transaction.adminAuditLog.create({
			data: {
				tenantId,
				actorUserId: userId,
				action: `service-category.visibility.${enabled ? "enabled" : "disabled"}`,
				resourceType: "service-category",
				resourceId: categoryId,
				metadata: { enabled } as Prisma.InputJsonValue,
			},
		})
	})
}

export async function createServiceForUser(
	userId: string,
	input: ServiceMutationInput,
): Promise<void> {
	const tenantId = await getTenantId(userId, input.tenantSlug)
	try {
		await prisma.$transaction(async (transaction) => {
			const category = await transaction.serviceCategory.findFirst({
				where: { id: input.categoryId, tenantId },
				select: { id: true },
			})
			if (!category)
				throw new MerchantServiceCatalogError("Service category not found.")
			const service = await transaction.service.create({
				data: {
					tenantId,
					categoryId: input.categoryId,
					name: input.name,
					slug: input.slug,
					description: input.description,
					priceLabel: input.priceLabel,
					durationLabel: input.durationLabel,
					orderOnly: input.orderOnly,
				},
				select: { id: true },
			})
			await transaction.adminAuditLog.create({
				data: {
					tenantId,
					actorUserId: userId,
					action: "service.created",
					resourceType: "service",
					resourceId: service.id,
					metadata: {
						name: input.name,
						orderOnly: input.orderOnly,
					} as Prisma.InputJsonValue,
				},
			})
		})
	} catch (error) {
		if (error instanceof MerchantServiceCatalogError) throw error
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		)
			throw new MerchantServiceCatalogError(
				"That service slug is already in use.",
			)
		throw new MerchantServiceCatalogError("The service could not be created.")
	}
}

export async function updateServiceForUser(
	userId: string,
	input: ServiceMutationInput & { serviceId: string },
): Promise<void> {
	const tenantId = await getTenantId(userId, input.tenantSlug)
	try {
		await prisma.$transaction(async (transaction) => {
			const category = await transaction.serviceCategory.findFirst({
				where: { id: input.categoryId, tenantId },
				select: { id: true },
			})
			if (!category)
				throw new MerchantServiceCatalogError("Service category not found.")
			const result = await transaction.service.updateMany({
				where: { id: input.serviceId, tenantId },
				data: {
					categoryId: input.categoryId,
					name: input.name,
					slug: input.slug,
					description: input.description,
					priceLabel: input.priceLabel,
					durationLabel: input.durationLabel,
					orderOnly: input.orderOnly,
				},
			})
			if (result.count !== 1)
				throw new MerchantServiceCatalogError("Service not found.")
			await transaction.adminAuditLog.create({
				data: {
					tenantId,
					actorUserId: userId,
					action: "service.updated",
					resourceType: "service",
					resourceId: input.serviceId,
					metadata: {
						name: input.name,
						orderOnly: input.orderOnly,
					} as Prisma.InputJsonValue,
				},
			})
		})
	} catch (error) {
		if (error instanceof MerchantServiceCatalogError) throw error
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		)
			throw new MerchantServiceCatalogError(
				"That service slug is already in use.",
			)
		throw new MerchantServiceCatalogError("The service could not be updated.")
	}
}

export async function deleteServiceForUser(
	userId: string,
	tenantSlug: string,
	serviceId: string,
): Promise<void> {
	const tenantId = await getTenantId(userId, tenantSlug)
	const result = await prisma.service.deleteMany({
		where: { id: serviceId, tenantId },
	})
	if (result.count !== 1)
		throw new MerchantServiceCatalogError("Service not found.")
}
