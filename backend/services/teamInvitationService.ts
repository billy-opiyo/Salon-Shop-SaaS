import "server-only"

import { randomBytes } from "node:crypto"
import { InvitationStatus, MembershipRole, Prisma } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
	type TenantMembershipContext,
} from "@backend/services/authorization"

export class TeamInvitationError extends Error {
	readonly code = "TEAM_INVITATION_FAILED" as const
	constructor(message: string) {
		super(message)
		this.name = "TeamInvitationError"
	}
}

type InvitationPermissions = {
	canManageBookings?: boolean
	canManageContent?: boolean
	canManageSecurity?: boolean
}

async function getAdminMembership(
	userId: string,
	tenantId: string,
): Promise<TenantMembershipContext> {
	const membership = await prisma.membership.findUnique({
		where: { tenantId_userId: { tenantId, userId } },
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
	const active = assertTenantMembership(membership, tenantId)
	assertTenantPermission(active, "canManageAdmins")
	return active
}

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase()
}

function createInvitationCode(): string {
	return randomBytes(32).toString("hex")
}

function getPermissions(value: Prisma.JsonValue | null): InvitationPermissions {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {}
	const permissions = value as Record<string, unknown>
	return {
		canManageBookings: permissions.canManageBookings === true,
		canManageContent: permissions.canManageContent === true,
		canManageSecurity: permissions.canManageSecurity === true,
	}
}

export async function inviteTeamMember(
	userId: string,
	tenantId: string,
	inviteeEmail: string,
	role: MembershipRole,
	permissions: InvitationPermissions = {},
): Promise<{ readonly invitationId: string; readonly invitationCode: string }> {
	const inviter = await getAdminMembership(userId, tenantId)
	const email = normalizeEmail(inviteeEmail)
	const existingUser = await prisma.user.findUnique({
		where: { email },
		select: { id: true },
	})
	if (existingUser) {
		const existingMembership = await prisma.membership.findUnique({
			where: { tenantId_userId: { tenantId, userId: existingUser.id } },
			select: { status: true },
		})
		if (existingMembership?.status === "ACTIVE") {
			throw new TeamInvitationError("This user already belongs to the team.")
		}
	}
	const pending = await prisma.teamInvitation.findFirst({
		where: {
			tenantId,
			inviteeEmail: email,
			status: InvitationStatus.PENDING,
			expiresAt: { gt: new Date() },
		},
		select: { id: true },
	})
	if (pending)
		throw new TeamInvitationError(
			"A pending invitation already exists for this email.",
		)

	const invitation = await prisma.teamInvitation.create({
		data: {
			tenantId: inviter.tenantId,
			invitedByUserId: userId,
			inviteeEmail: email,
			role,
			permissions: permissions as Prisma.InputJsonValue,
			invitationCode: createInvitationCode(),
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		},
		select: { id: true, invitationCode: true },
	})
	await prisma.adminAuditLog.create({
		data: {
			tenantId,
			actorUserId: userId,
			action: "team.invitation.created",
			resourceType: "team-invitation",
			resourceId: invitation.id,
			metadata: { inviteeEmail: email, role } as Prisma.InputJsonValue,
		},
	})
	return {
		invitationId: invitation.id,
		invitationCode: invitation.invitationCode,
	}
}

export async function listTeamInvitationsForUser(
	userId: string,
	tenantId: string,
) {
	await getAdminMembership(userId, tenantId)
	const now = new Date()
	await prisma.teamInvitation.updateMany({
		where: {
			tenantId,
			status: InvitationStatus.PENDING,
			expiresAt: { lte: now },
		},
		data: { status: InvitationStatus.EXPIRED },
	})
	return prisma.teamInvitation.findMany({
		where: { tenantId },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			inviteeEmail: true,
			role: true,
			status: true,
			permissions: true,
			expiresAt: true,
			createdAt: true,
		},
	})
}

export async function acceptTeamInvitation(
	userId: string,
	invitationCode: string,
): Promise<{ readonly tenantId: string; readonly slug: string }> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, email: true },
	})
	if (!user) throw new TeamInvitationError("Account not found.")
	return prisma.$transaction(async (transaction) => {
		const invitation = await transaction.teamInvitation.findUnique({
			where: { invitationCode },
			select: {
				id: true,
				tenantId: true,
				inviteeEmail: true,
				role: true,
				status: true,
				permissions: true,
				expiresAt: true,
				tenant: { select: { slug: true } },
			},
		})
		if (
			!invitation ||
			invitation.expiresAt <= new Date() ||
			invitation.status !== InvitationStatus.PENDING
		) {
			throw new TeamInvitationError("Invitation is invalid or expired.")
		}
		if (normalizeEmail(user.email) !== invitation.inviteeEmail) {
			throw new TeamInvitationError(
				"Invitation email does not match this account.",
			)
		}
		const permissions = getPermissions(invitation.permissions)
		await transaction.membership.upsert({
			where: { tenantId_userId: { tenantId: invitation.tenantId, userId } },
			create: {
				tenantId: invitation.tenantId,
				userId,
				role: invitation.role,
				status: "ACTIVE",
				joinedAt: new Date(),
				...permissions,
			},
			update: {
				role: invitation.role,
				status: "ACTIVE",
				joinedAt: new Date(),
				...permissions,
			},
		})
		await transaction.teamInvitation.update({
			where: { id: invitation.id },
			data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date() },
		})
		await transaction.adminAuditLog.create({
			data: {
				tenantId: invitation.tenantId,
				actorUserId: userId,
				action: "team.invitation.accepted",
				resourceType: "team-invitation",
				resourceId: invitation.id,
			},
		})
		return { tenantId: invitation.tenantId, slug: invitation.tenant.slug }
	})
}

export async function cancelTeamInvitation(
	userId: string,
	tenantId: string,
	invitationId: string,
): Promise<void> {
	await getAdminMembership(userId, tenantId)
	const result = await prisma.teamInvitation.updateMany({
		where: { id: invitationId, tenantId, status: InvitationStatus.PENDING },
		data: { status: InvitationStatus.CANCELLED, cancelledAt: new Date() },
	})
	if (result.count !== 1)
		throw new TeamInvitationError("Pending invitation not found.")
	await prisma.adminAuditLog.create({
		data: {
			tenantId,
			actorUserId: userId,
			action: "team.invitation.cancelled",
			resourceType: "team-invitation",
			resourceId: invitationId,
		},
	})
}

export async function resendTeamInvitation(
	userId: string,
	tenantId: string,
	invitationId: string,
): Promise<{ readonly invitationCode: string }> {
	await getAdminMembership(userId, tenantId)
	const result = await prisma.teamInvitation.updateMany({
		where: {
			id: invitationId,
			tenantId,
			status: { in: [InvitationStatus.PENDING, InvitationStatus.EXPIRED] },
		},
		data: {
			status: InvitationStatus.PENDING,
			invitationCode: createInvitationCode(),
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		},
	})
	if (result.count !== 1) throw new TeamInvitationError("Invitation not found.")
	const invitation = await prisma.teamInvitation.findUniqueOrThrow({
		where: { id: invitationId },
		select: { invitationCode: true },
	})
	return invitation
}
