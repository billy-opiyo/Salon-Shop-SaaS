import "server-only"

import { randomUUID } from "node:crypto"
import {
	DeleteObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3"

import { prisma } from "@backend/db/prisma"
import {
	assertPlatformAdmin,
	PlatformAuthorizationError,
} from "@backend/services/platformAuthorization"
import {
	ALLOWED_IMAGE_TYPES,
	getImageUploadError,
	MAX_IMAGE_UPLOAD_BYTES,
} from "@shared/validation/media"
import {
	platformTeamMemberSchema,
	type PlatformTeamMemberInput,
} from "@shared/validation/platformTeam"
import type { PlatformTeamMemberView } from "@shared/types/platformTeam"

export class PlatformTeamError extends Error {
	readonly code = "PLATFORM_TEAM_FAILED" as const

	constructor(message: string) {
		super(message)
		this.name = "PlatformTeamError"
	}
}

const memberSelect = {
	id: true,
	name: true,
	role: true,
	bio: true,
	avatarUrl: true,
	websiteUrl: true,
	instagramUrl: true,
	facebookUrl: true,
	linkedinUrl: true,
	xUrl: true,
	displayOrder: true,
	published: true,
} as const

function toView(member: PlatformTeamMemberView): PlatformTeamMemberView {
	return member
}

export async function getPublishedPlatformTeam(): Promise<
	readonly PlatformTeamMemberView[]
> {
	const members = await prisma.platformTeamMember.findMany({
		where: { published: true },
		orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
		select: memberSelect,
	})
	return members.map(toView)
}

export async function listPlatformTeamForAdmin(
	userId: string,
	email?: string | null,
): Promise<readonly PlatformTeamMemberView[]> {
	assertPlatformAdmin(userId, email)
	const members = await prisma.platformTeamMember.findMany({
		orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
		select: memberSelect,
	})
	return members.map(toView)
}

function validateInput(input: PlatformTeamMemberInput): PlatformTeamMemberInput {
	const parsed = platformTeamMemberSchema.safeParse(input)
	if (!parsed.success) throw new PlatformTeamError("Team member details are invalid.")
	return parsed.data
}

function r2Client(): S3Client {
	const accountId = process.env.R2_ACCOUNT_ID?.trim()
	const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim()
	const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim()
	if (!accountId || !accessKeyId || !secretAccessKey)
		throw new PlatformTeamError("R2 media storage is not configured.")
	return new S3Client({
		region: "auto",
		endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
		credentials: { accessKeyId, secretAccessKey },
	})
}

function safeObjectName(fileName: string): string {
	return (
		fileName
			.toLowerCase()
			.replace(/[^a-z0-9._-]+/g, "-")
			.slice(-100) || "avatar"
	)
}

export async function uploadPlatformTeamAvatar(
	file: Buffer,
	fileName: string,
	mimeType: string,
): Promise<{ readonly url: string; readonly objectKey: string }> {
	const validationError = getImageUploadError(file.length, mimeType)
	if (validationError) throw new PlatformTeamError(validationError)
	if (!ALLOWED_IMAGE_TYPES.includes(mimeType as (typeof ALLOWED_IMAGE_TYPES)[number]))
		throw new PlatformTeamError("Invalid image format.")
	const bucket = process.env.R2_BUCKET_NAME?.trim()
	const publicBase = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, "")
	if (!bucket || !publicBase)
		throw new PlatformTeamError("R2 public media storage is not configured.")
	const objectKey = `platform/team/${randomUUID()}-${safeObjectName(fileName)}`
	await r2Client().send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: objectKey,
			Body: file,
			ContentType: mimeType,
			ContentLength: file.length,
		}),
	)
	return { url: `${publicBase}/${objectKey}`, objectKey }
}

export async function deletePlatformTeamAvatar(objectKey: string): Promise<void> {
	const bucket = process.env.R2_BUCKET_NAME?.trim()
	if (!bucket || !objectKey.startsWith("platform/team/")) return
	await r2Client().send(
		new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }),
	)
}

export async function createPlatformTeamMember(
	actorUserId: string,
	actorEmail: string | null | undefined,
	input: PlatformTeamMemberInput,
): Promise<PlatformTeamMemberView> {
	assertPlatformAdmin(actorUserId, actorEmail)
	const data = validateInput(input)
	const created = await prisma.$transaction(async (transaction) => {
		const member = await transaction.platformTeamMember.create({
			data: {
				...data,
				avatarUrl: data.avatarUrl || null,
				avatarObjectKey: data.avatarObjectKey || null,
				websiteUrl: data.websiteUrl || null,
				instagramUrl: data.instagramUrl || null,
				facebookUrl: data.facebookUrl || null,
				linkedinUrl: data.linkedinUrl || null,
				xUrl: data.xUrl || null,
			},
			select: memberSelect,
		})
		await transaction.platformAuditLog.create({
			data: {
				actorUserId,
				action: "platform.team-member.created",
				resourceType: "platform-team-member",
				resourceId: member.id,
			},
		})
		return member
	})
	return toView(created)
}

export async function updatePlatformTeamMember(
	actorUserId: string,
	actorEmail: string | null | undefined,
	id: string,
	input: PlatformTeamMemberInput,
): Promise<PlatformTeamMemberView> {
	assertPlatformAdmin(actorUserId, actorEmail)
	const data = validateInput(input)
	try {
		const updated = await prisma.$transaction(async (transaction) => {
			const current = await transaction.platformTeamMember.findUnique({
				where: { id },
				select: { id: true, avatarObjectKey: true },
			})
			if (!current) throw new PlatformTeamError("Team member not found.")
			const member = await transaction.platformTeamMember.update({
				where: { id },
				data: {
					name: data.name,
					role: data.role,
					bio: data.bio,
					websiteUrl: data.websiteUrl || null,
					instagramUrl: data.instagramUrl || null,
					facebookUrl: data.facebookUrl || null,
					linkedinUrl: data.linkedinUrl || null,
					xUrl: data.xUrl || null,
					displayOrder: data.displayOrder,
					published: data.published,
					...(data.avatarUrl
						? {
								avatarUrl: data.avatarUrl,
								avatarObjectKey: data.avatarObjectKey || null,
							}
						: {}),
				},
				select: memberSelect,
			})
			await transaction.platformAuditLog.create({
				data: {
					actorUserId,
					action: "platform.team-member.updated",
					resourceType: "platform-team-member",
					resourceId: member.id,
				},
			})
			return { member, previousAvatarObjectKey: current.avatarObjectKey }
		})
		if (
			data.avatarObjectKey &&
			updated.previousAvatarObjectKey &&
			updated.previousAvatarObjectKey !== data.avatarObjectKey
		) {
			await deletePlatformTeamAvatar(updated.previousAvatarObjectKey).catch(
				() => undefined,
			)
		}
		return toView(updated.member)
	} catch (error) {
		if (error instanceof PlatformTeamError) throw error
		throw new PlatformTeamError("Team member could not be updated.")
	}
}

export async function deletePlatformTeamMember(
	actorUserId: string,
	actorEmail: string | null | undefined,
	id: string,
): Promise<void> {
	assertPlatformAdmin(actorUserId, actorEmail)
	const deleted = await prisma.$transaction(async (transaction) => {
		const member = await transaction.platformTeamMember.findUnique({
			where: { id },
			select: { id: true, avatarObjectKey: true },
		})
		if (!member) throw new PlatformTeamError("Team member not found.")
		await transaction.platformTeamMember.delete({ where: { id } })
		await transaction.platformAuditLog.create({
			data: {
				actorUserId,
				action: "platform.team-member.deleted",
				resourceType: "platform-team-member",
				resourceId: id,
			},
		})
		return member
	})
	if (deleted.avatarObjectKey)
		await deletePlatformTeamAvatar(deleted.avatarObjectKey).catch(
			() => undefined,
		)
}

export function isPlatformTeamImageUrl(value: string | null): value is string {
	if (!value || value.length > 2000) return false
	try {
		return new URL(value).protocol === "https:"
	} catch {
		return false
	}
}

export function assertPlatformTeamUploadSize(size: number): void {
	if (size > MAX_IMAGE_UPLOAD_BYTES)
		throw new PlatformTeamError("Image too large. Maximum 500 KB.")
}

export { PlatformAuthorizationError }
