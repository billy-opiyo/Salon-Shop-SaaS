import "server-only"

import { hash, compare } from "bcryptjs"
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { randomUUID } from "node:crypto"

import { prisma } from "@backend/db/prisma"
import { ALLOWED_IMAGE_TYPES, getImageUploadError } from "@shared/validation/media"
import {
	passwordChangeSchema,
	preferencesSchema,
	profileUpdateSchema,
	themePreferenceSchema,
} from "@shared/validation/auth"

export class ClientAccountMutationError extends Error {
	readonly code = "CLIENT_ACCOUNT_MUTATION_FAILED" as const
	constructor(message: string) {
		super(message)
		this.name = "ClientAccountMutationError"
	}
}

function accountAvatarClient(): S3Client {
	const accountId = process.env.R2_ACCOUNT_ID?.trim()
	const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim()
	const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim()
	if (!accountId || !accessKeyId || !secretAccessKey)
		throw new ClientAccountMutationError("Profile image storage is not configured.")
	return new S3Client({
		region: "auto",
		endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
		credentials: { accessKeyId, secretAccessKey },
	})
}

export async function updateClientAvatar(
	userId: string,
	file: Buffer,
	mimeType: string,
): Promise<string> {
	const validationError = getImageUploadError(file.length, mimeType)
	if (validationError) throw new ClientAccountMutationError(validationError)
	if (!ALLOWED_IMAGE_TYPES.includes(mimeType as (typeof ALLOWED_IMAGE_TYPES)[number]))
		throw new ClientAccountMutationError("Invalid profile image format.")
	const bucket = process.env.R2_BUCKET_NAME?.trim()
	const publicBase = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, "")
	if (!bucket || !publicBase)
		throw new ClientAccountMutationError("Public profile image storage is not configured.")
	const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.slice("image/".length)
	const objectKey = `platform/accounts/${userId}/${randomUUID()}.${extension}`
	const client = accountAvatarClient()
	await client.send(new PutObjectCommand({
		Bucket: bucket,
		Key: objectKey,
		Body: file,
		ContentType: mimeType,
		ContentLength: file.length,
	}))
	const image = `${publicBase}/${objectKey}`
	try {
		const previous = await prisma.user.findUnique({ where: { id: userId }, select: { image: true } })
		await prisma.$transaction([
			prisma.user.update({ where: { id: userId }, data: { image } }),
			prisma.accountChangeHistory.create({
				data: { userId, changeType: "profile.photo.updated", summary: "Account profile photo updated." },
			}),
		])
		const previousPrefix = `${publicBase}/platform/accounts/${userId}/`
		if (previous?.image?.startsWith(previousPrefix)) {
			const previousKey = previous.image.slice(publicBase.length + 1)
			if (previousKey.startsWith(`platform/accounts/${userId}/`))
				await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: previousKey })).catch(() => undefined)
		}
		return image
	} catch (error) {
		await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey })).catch(() => undefined)
		if (error instanceof ClientAccountMutationError) throw error
		throw new ClientAccountMutationError("Profile photo could not be saved.")
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

export async function updateClientThemePreference(
	userId: string,
	rawInput: unknown,
): Promise<void> {
	const input = themePreferenceSchema.parse(rawInput)
	await prisma.userPreferences.upsert({
		where: { userId },
		create: { userId, theme: input.theme },
		update: { theme: input.theme },
	})
}
