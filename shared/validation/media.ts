export const MAX_IMAGE_UPLOAD_BYTES = 500 * 1024

export const ALLOWED_IMAGE_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
] as const

export function getImageUploadError(
	byteSize: number,
	mimeType: string,
): string | null {
	if (
		!ALLOWED_IMAGE_TYPES.includes(
			mimeType as (typeof ALLOWED_IMAGE_TYPES)[number],
		)
	)
		return "Invalid image format. Allowed: JPEG, PNG, WebP, GIF"
	if (!Number.isInteger(byteSize) || byteSize <= 0)
		return "Image size must be greater than 0 bytes."
	if (byteSize > MAX_IMAGE_UPLOAD_BYTES)
		return "Image too large. Maximum 500 KB."
	return null
}
