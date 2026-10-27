import "server-only"

import { PlatformAdminRole } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import {
	assertPlatformAdminPermission,
	isPlatformOwner,
} from "@backend/services/platformAuthorization"

export class PlatformRoleError extends Error {
	readonly code = "PLATFORM_ROLE_FAILED" as const
}

const assignmentSelect = {
	id: true,
	email: true,
	role: true,
	createdAt: true,
	updatedAt: true,
} as const

export async function listPlatformRoleAssignments(
	actorUserId: string,
	actorEmail?: string | null,
) {
	await assertPlatformAdminPermission(actorUserId, actorEmail, "role-assignments:write")
	return prisma.platformAdminRoleAssignment.findMany({
		orderBy: [{ role: "asc" }, { email: "asc" }],
		select: assignmentSelect,
	})
}

export async function assignPlatformRole(
	actorUserId: string,
	actorEmail: string | null | undefined,
	emailInput: string,
	roleInput: string,
) {
	await assertPlatformAdminPermission(actorUserId, actorEmail, "role-assignments:write")
	const email = emailInput.trim().toLowerCase()
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
		throw new PlatformRoleError("Enter a valid email address.")
	if (isPlatformOwner("", email))
		throw new PlatformRoleError("The configured Owner account cannot be changed here.")
	if (roleInput !== PlatformAdminRole.STORE_EDITOR && roleInput !== PlatformAdminRole.STORE_SUPPORT)
		throw new PlatformRoleError("Choose Store Editor or Store Support.")
	return prisma.$transaction(async (transaction) => {
		const assignment = await transaction.platformAdminRoleAssignment.upsert({
			where: { email },
			create: { email, role: roleInput, assignedByUserId: actorUserId },
			update: { role: roleInput, assignedByUserId: actorUserId },
			select: assignmentSelect,
		})
		await transaction.platformAuditLog.create({
			data: {
				actorUserId,
				action: "platform.admin-role.assigned",
				resourceType: "platform-admin-role",
				resourceId: assignment.id,
				metadata: { email, role: roleInput },
			},
		})
		return assignment
	})
}

export async function removePlatformRoleAssignment(
	actorUserId: string,
	actorEmail: string | null | undefined,
	id: string,
): Promise<void> {
	await assertPlatformAdminPermission(actorUserId, actorEmail, "role-assignments:write")
	await prisma.$transaction(async (transaction) => {
		const assignment = await transaction.platformAdminRoleAssignment.findUnique({
			where: { id },
			select: { id: true, email: true, role: true },
		})
		if (!assignment) throw new PlatformRoleError("Role assignment not found.")
		await transaction.platformAdminRoleAssignment.delete({ where: { id } })
		await transaction.platformAuditLog.create({
			data: {
				actorUserId,
				action: "platform.admin-role.removed",
				resourceType: "platform-admin-role",
				resourceId: id,
				metadata: { email: assignment.email, role: assignment.role },
			},
		})
	})
}
