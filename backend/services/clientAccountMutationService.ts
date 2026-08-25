import "server-only"

import { hash, compare } from "bcryptjs"

import { prisma } from "@backend/db/prisma"
import {
	passwordChangeSchema,
	preferencesSchema,
	profileUpdateSchema,
} from "@shared/validation/auth"

export class ClientAccountMutationError extends Error {
	readonly code = "CLIENT_ACCOUNT_MUTATION_FAILED" as const
	constructor(message: string) {
		super(message)
		this.name = "ClientAccountMutationError"
	}
}

export async function updateClientProfile(
	userId: string,
	rawInput: unknown,
): Promise<void> {
	const input = profileUpdateSchema.parse(rawInput)
	await prisma.user.update({
		where: { id: userId },
		data: { name: input.name, phone: input.phone || null },
	})
}

export async function changeClientPassword(
	userId: string,
	rawInput: unknown,
): Promise<void> {
	const input = passwordChangeSchema.parse(rawInput)
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { passwordHash: true },
	})
	if (
		!user?.passwordHash ||
		!(await compare(input.currentPassword, user.passwordHash))
	)
		throw new ClientAccountMutationError("Your current password is incorrect.")
	if (input.currentPassword === input.newPassword)
		throw new ClientAccountMutationError(
			"Choose a new password different from your current password.",
		)
	await prisma.user.update({
		where: { id: userId },
		data: {
			passwordHash: await hash(input.newPassword, 12),
			passwordResetRequired: false,
		},
	})
	await prisma.accountChangeHistory.create({
		data: {
			userId,
			changeType: "password.changed",
			summary: "Client password changed.",
		},
	})
}

export async function deleteClientAccount(userId: string): Promise<void> {
	const ownedTenant = await prisma.tenant.findFirst({
		where: { ownerUserId: userId },
		select: { id: true },
	})
	if (ownedTenant)
		throw new ClientAccountMutationError(
			"Transfer or remove your salon workspace before deleting this account.",
		)
	await prisma.user.delete({ where: { id: userId } })
}

export async function updateClientPreferences(
	userId: string,
	rawInput: unknown,
): Promise<void> {
	const input = preferencesSchema.parse(rawInput)
	await prisma.userPreferences.upsert({
		where: { userId },
		create: { userId, ...input },
		update: input,
	})
}
