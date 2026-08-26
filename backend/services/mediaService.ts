import "server-only"

export class MediaUploadError extends Error {
	readonly code = "MEDIA_UPLOAD_FAILED" as const
	constructor(message: string) {
		super(message)
		this.name = "MediaUploadError"
	}
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
		// Placeholder: implement after provider stage with actual filesystem or S3/R2
		const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
			b.toString(16).padStart(2, "0"),
		).join("")

		return {
			id,
			url: `/media/${id}`,
			metadata,
		}
	}

	async delete(id: string): Promise<void> {
		// Placeholder: implement after provider stage
	}

	getUrl(id: string): string {
		return `/media/${id}`
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
	file: Buffer,
	mimeType: string,
): Promise<MediaUploadResult> {
	validateAvatarUpload(file, mimeType)

	const metadata: MediaMetadata = {
		fileName: `avatar-${userId}`,
		mimeType,
		size: file.length,
		mediaType: "image",
	}

	return storageBackend.upload(file, metadata)
}

export async function uploadGalleryImage(
	tenantId: string,
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

	return storageBackend.upload(file, metadata)
}

export async function deleteMediaFile(mediaId: string): Promise<void> {
	await storageBackend.delete(mediaId)
}

export function getMediaUrl(mediaId: string): string {
	return storageBackend.getUrl(mediaId)
}
