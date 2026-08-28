import "server-only"

import { randomUUID } from "node:crypto"
import {
	DeleteObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
} from "@backend/services/authorization"
import { PLAN_ENTITLEMENTS } from "@shared/constants/plans"
import {
	assertStorageCapacity,
	UsageLimitError,
} from "@backend/services/usageService"

export class MediaUploadError extends Error {
	readonly code: string = "MEDIA_UPLOAD_FAILED"
	constructor(message: string) {
		super(message)
		this.name = "MediaUploadError"
	}
}

export class MediaProviderConfigurationError extends MediaUploadError {
	readonly code = "MEDIA_PROVIDER_UNCONFIGURED" as const
}

export type MediaType = "image" | "document" | "video"

export interface MediaMetadata {
	readonly fileName: string
	readonly mimeType: string
	readonly size: number
	readonly mediaType: MediaType
	readonly width?: number
	readonly height?: number
	readonly duration?: number
}

export interface MediaUploadResult {
	readonly id: string
	readonly url: string
	readonly metadata: MediaMetadata
}

export interface StorageBackend {
	upload(file: Buffer, metadata: MediaMetadata): Promise<MediaUploadResult>
	delete(id: string): Promise<void>
	getUrl(id: string): string
}

class LocalStorageBackend implements StorageBackend {
	async upload(
		file: Buffer,
		metadata: MediaMetadata,
	): Promise<MediaUploadResult> {
		void file
		void metadata
		throw new MediaProviderConfigurationError(
			"Media storage is not configured.",
		)
	}

	async delete(id: string): Promise<void> {
		void id
		throw new MediaProviderConfigurationError(
			"Media storage is not configured.",
		)
	}

	getUrl(id: string): string {
		void id
		throw new MediaProviderConfigurationError(
			"Media storage is not configured.",
		)
	}
}

let storageBackend: StorageBackend = new LocalStorageBackend()

export function setStorageBackend(backend: StorageBackend): void {
	storageBackend = backend
}

export function getStorageBackend(): StorageBackend {
	return storageBackend
}

const ALLOWED_IMAGE_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
])
const ALLOWED_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_AVATAR_SIZE = 1 * 1024 * 1024 // 1MB

export function validateImageUpload(file: Buffer, mimeType: string): void {
	if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
		throw new MediaUploadError(
			"Invalid image format. Allowed: JPEG, PNG, WebP, GIF",
		)
	}
	if (file.length > ALLOWED_IMAGE_SIZE) {
		throw new MediaUploadError("Image too large. Maximum 5MB.")
	}
}

export function validateAvatarUpload(file: Buffer, mimeType: string): void {
	if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
		throw new MediaUploadError(
			"Invalid avatar format. Allowed: JPEG, PNG, WebP, GIF",
		)
	}
	if (file.length > ALLOWED_AVATAR_SIZE) {
		throw new MediaUploadError("Avatar too large. Maximum 1MB.")
	}
}

export async function uploadUserAvatar(
	userId: string,
	tenantId: string,
	file: Buffer,
	mimeType: string,
): Promise<MediaUploadResult> {
	validateAvatarUpload(file, mimeType)
	const membership = await prisma.membership.findUnique({
		where: { tenantId_userId: { tenantId, userId } },
		select: { status: true },
	})
	if (membership?.status !== "ACTIVE")
		throw new MediaUploadError("An active salon membership is required.")
	const metadata: MediaMetadata = {
		fileName: `avatar-${userId}`,
		mimeType,
		size: file.length,
		mediaType: "image",
	}

	return uploadDirectToR2(tenantId, userId, "AVATAR", file, metadata)
}

export async function uploadGalleryImage(
	tenantId: string,
	uploadedById: string,
	file: Buffer,
	mimeType: string,
	fileName: string,
): Promise<MediaUploadResult> {
	validateImageUpload(file, mimeType)
	const metadata: MediaMetadata = {
		fileName: `${tenantId}/${fileName}`,
		mimeType,
		size: file.length,
		mediaType: "image",
	}
	return uploadDirectToR2(tenantId, uploadedById, "GALLERY", file, metadata)
}

async function uploadDirectToR2(
	tenantId: string,
	uploadedById: string | undefined,
	kind: "AVATAR" | "GALLERY",
	file: Buffer,
	metadata: MediaMetadata,
): Promise<MediaUploadResult> {
	const bucket = process.env.R2_BUCKET_NAME?.trim()
	if (!bucket)
		throw new MediaProviderConfigurationError(
			"R2 media storage is not configured.",
		)
	try {
		await assertStorageCapacity(tenantId, file.length)
	} catch (error) {
		if (error instanceof UsageLimitError)
			throw new MediaUploadError(error.message)
		throw error
	}
	const safeName =
		metadata.fileName
			.toLowerCase()
			.replace(/[^a-z0-9._-]+/g, "-")
			.slice(-100) || "image"
	const objectKey = `${tenantId}/${kind.toLowerCase()}/${randomUUID()}-${safeName}`
	await r2Client().send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: objectKey,
			Body: file,
			ContentType: metadata.mimeType,
			ContentLength: file.length,
		}),
	)
	const publicBase = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, "")
	let asset
	try {
		asset = await prisma.mediaAsset.create({
			data: {
				tenantId,
				uploadedById,
				kind,
				objectKey,
				publicUrl: publicBase ? `${publicBase}/${objectKey}` : null,
				mimeType: metadata.mimeType,
				byteSize: file.length,
			},
		})
	} catch (error) {
		await r2Client()
			.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }))
			.catch(() => undefined)
		throw error
	}
	if (kind === "AVATAR" && asset.publicUrl)
		await prisma.user.update({
			where: { id: uploadedById },
			data: { image: asset.publicUrl },
		})
	return { id: asset.id, url: asset.publicUrl ?? objectKey, metadata }
}

export async function deleteMediaFile(mediaId: string): Promise<void> {
	await storageBackend.delete(mediaId)
}

export function getMediaUrl(mediaId: string): string {
	return storageBackend.getUrl(mediaId)
}

function r2Client(): S3Client {
	const accountId = process.env.R2_ACCOUNT_ID?.trim()
	const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim()
	const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim()
	if (!accountId || !accessKeyId || !secretAccessKey)
		throw new MediaProviderConfigurationError(
			"R2 media storage is not configured.",
		)
	return new S3Client({
		region: "auto",
		endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
		credentials: { accessKeyId, secretAccessKey },
	})
}

function mediaKind(
	value: string,
): "GALLERY" | "BLOG" | "AVATAR" | "HERO" | "LOGO" {
	if (
		value === "BLOG" ||
		value === "AVATAR" ||
		value === "HERO" ||
		value === "LOGO"
	)
		return value
	return "GALLERY"
}

export async function createPresignedMediaUpload(input: {
	readonly userId: string
	readonly tenantSlug: string
	readonly fileName: string
	readonly mimeType: string
	readonly byteSize: number
	readonly kind: string
}) {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: input.tenantSlug.trim().toLowerCase() },
		select: {
			id: true,
			subscription: { select: { plan: { select: { tier: true } } } },
			memberships: {
				where: { userId: input.userId, status: "ACTIVE" },
				select: {
					tenantId: true,
					userId: true,
					role: true,
					status: true,
					canManageContent: true,
					canManageAdmins: true,
					canManageBookings: true,
					canManageSecurity: true,
				},
			},
		},
	})
	if (!tenant) throw new MediaUploadError("Store not found.")
	const membership = assertTenantMembership(
		tenant.memberships[0] ?? null,
		tenant.id,
	)
	assertTenantPermission(membership, "canManageContent")
	const tier = (tenant.subscription?.plan.tier.toLowerCase() ??
		"starter") as keyof typeof PLAN_ENTITLEMENTS
	const kind = mediaKind(input.kind)
	if (
		!Number.isInteger(input.byteSize) ||
		input.byteSize <= 0 ||
		input.byteSize > ALLOWED_IMAGE_SIZE
	)
		throw new MediaUploadError("Image size must be between 1 byte and 5MB.")
	if (!ALLOWED_IMAGE_TYPES.has(input.mimeType))
		throw new MediaUploadError("Invalid image format.")
	const used = await prisma.mediaAsset.aggregate({
		where: { tenantId: tenant.id },
		_sum: { byteSize: true },
	})
	const quota = PLAN_ENTITLEMENTS[tier].limits.storageMegabytes * 1024 * 1024
	if ((used._sum.byteSize ?? 0) + input.byteSize > quota)
		throw new MediaUploadError(
			"This upload would exceed your plan storage quota.",
		)
	const safeName =
		input.fileName
			.toLowerCase()
			.replace(/[^a-z0-9._-]+/g, "-")
			.slice(-100) || "image"
	const objectKey = `${tenant.id}/${kind.toLowerCase()}/${randomUUID()}-${safeName}`
	const bucket = process.env.R2_BUCKET_NAME?.trim()
	if (!bucket)
		throw new MediaProviderConfigurationError(
			"R2 media storage is not configured.",
		)
	const client = r2Client()
	const command = new PutObjectCommand({
		Bucket: bucket,
		Key: objectKey,
		ContentType: input.mimeType,
		ContentLength: input.byteSize,
	})
	const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 })
	const publicBase = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, "")
	const asset = await prisma.mediaAsset.create({
		data: {
			tenantId: tenant.id,
			uploadedById: input.userId,
			kind,
			objectKey,
			publicUrl: publicBase ? `${publicBase}/${objectKey}` : null,
			mimeType: input.mimeType,
			byteSize: input.byteSize,
		},
	})
	return {
		assetId: asset.id,
		objectKey,
		uploadUrl,
		expiresIn: 900,
		publicUrl: asset.publicUrl,
	}
}

export async function deleteTenantMedia(
	userId: string,
	tenantSlug: string,
	assetId: string,
) {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: {
			id: true,
			memberships: {
				where: { userId, status: "ACTIVE" },
				select: {
					tenantId: true,
					userId: true,
					role: true,
					status: true,
					canManageContent: true,
					canManageAdmins: true,
					canManageBookings: true,
					canManageSecurity: true,
				},
			},
		},
	})
	if (!tenant) throw new MediaUploadError("Store not found.")
	const membership = assertTenantMembership(
		tenant.memberships[0] ?? null,
		tenant.id,
	)
	assertTenantPermission(membership, "canManageContent")
	const asset = await prisma.mediaAsset.findFirst({
		where: { id: assetId, tenantId: tenant.id },
	})
	if (!asset) throw new MediaUploadError("Media asset not found.")
	const bucket = process.env.R2_BUCKET_NAME?.trim()
	if (!bucket)
		throw new MediaProviderConfigurationError(
			"R2 media storage is not configured.",
		)
	await r2Client().send(
		new DeleteObjectCommand({ Bucket: bucket, Key: asset.objectKey }),
	)
	await prisma.mediaAsset.delete({ where: { id: asset.id } })
}

export async function finalizeTenantMedia(
	userId: string,
	tenantSlug: string,
	assetId: string,
) {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: {
			id: true,
			memberships: {
				where: { userId, status: "ACTIVE" },
				select: {
					tenantId: true,
					userId: true,
					role: true,
					status: true,
					canManageContent: true,
					canManageAdmins: true,
					canManageBookings: true,
					canManageSecurity: true,
				},
			},
		},
	})
	if (!tenant) throw new MediaUploadError("Store not found.")
	const membership = assertTenantMembership(
		tenant.memberships[0] ?? null,
		tenant.id,
	)
	assertTenantPermission(membership, "canManageContent")
	const asset = await prisma.mediaAsset.findFirst({
		where: { id: assetId, tenantId: tenant.id },
	})
	if (!asset) throw new MediaUploadError("Media asset not found.")
	const bucket = process.env.R2_BUCKET_NAME?.trim()
	if (!bucket)
		throw new MediaProviderConfigurationError(
			"R2 media storage is not configured.",
		)
	const head = await r2Client().send(
		new HeadObjectCommand({ Bucket: bucket, Key: asset.objectKey }),
	)
	if (
		head.ContentLength !== asset.byteSize ||
		head.ContentType !== asset.mimeType
	) {
		await r2Client().send(
			new DeleteObjectCommand({ Bucket: bucket, Key: asset.objectKey }),
		)
		await prisma.mediaAsset.delete({ where: { id: asset.id } })
		throw new MediaUploadError(
			"Uploaded media did not match its declared metadata.",
		)
	}
	return {
		id: asset.id,
		publicUrl: asset.publicUrl,
		objectKey: asset.objectKey,
	}
}
