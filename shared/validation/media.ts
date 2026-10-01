export const MAX_IMAGE_UPLOAD_BYTES = 1024 * 1024
export const IMAGE_TOO_LARGE_MESSAGE =
	"The image you uploaded is above 1MB limit, please compress it or upload an image that is below 1MB size"

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
		return IMAGE_TOO_LARGE_MESSAGE
	return null
}
