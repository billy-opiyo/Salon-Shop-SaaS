import "server-only"

import { MessageStatus, Prisma } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
} from "@backend/services/authorization"

export class MerchantMessageError extends Error {
	readonly code = "MERCHANT_MESSAGE_FAILED" as const
	constructor(message: string) {
		super(message)
		this.name = "MerchantMessageError"
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
	if (!tenant) throw new MerchantMessageError("Store not found.")
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

export async function listMessagesForUser(userId: string, tenantSlug: string) {
	const tenantId = await getTenantId(userId, tenantSlug)
	return prisma.contactMessage.findMany({
		where: { tenantId },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			name: true,
			email: true,
			subject: true,
			message: true,
			status: true,
			createdAt: true,
		},
	})
}

export async function updateMessageStatus(
	userId: string,
	tenantSlug: string,
	messageId: string,
	status: MessageStatus,
): Promise<void> {
	const tenantId = await getTenantId(userId, tenantSlug)
	await prisma.$transaction(async (transaction) => {
		const result = await transaction.contactMessage.updateMany({
			where: { id: messageId, tenantId },
			data: { status },
		})
		if (result.count !== 1) throw new MerchantMessageError("Message not found.")
		await transaction.adminAuditLog.create({
			data: {
				tenantId,
				actorUserId: userId,
				action: `message.status.${status.toLowerCase()}`,
				resourceType: "contact-message",
				resourceId: messageId,
				metadata: { status } as Prisma.InputJsonValue,
			},
		})
	})
}

export async function deleteMessage(
	userId: string,
	tenantSlug: string,
	messageId: string,
): Promise<void> {
	const tenantId = await getTenantId(userId, tenantSlug)
	const result = await prisma.contactMessage.deleteMany({
		where: { id: messageId, tenantId },
	})
	if (result.count !== 1) throw new MerchantMessageError("Message not found.")
}
