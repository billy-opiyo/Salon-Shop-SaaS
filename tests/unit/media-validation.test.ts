import { describe, expect, it } from "vitest"

import {
	MAX_IMAGE_UPLOAD_BYTES,
	getImageUploadError,
} from "../../shared/validation/media"

describe("media upload validation", () => {
	it("accepts supported images at exactly 500 KB", () => {
		const file = Buffer.alloc(MAX_IMAGE_UPLOAD_BYTES)

		expect(getImageUploadError(file.length, "image/jpeg")).toBeNull()
		expect(getImageUploadError(file.length, "image/png")).toBeNull()
	})

	it("rejects images larger than 500 KB", () => {
		const file = Buffer.alloc(MAX_IMAGE_UPLOAD_BYTES + 1)

		expect(getImageUploadError(file.length, "image/webp")).toContain(
			"Maximum 500 KB",
		)
	})

	it("rejects non-image files", () => {
		expect(getImageUploadError(4, "application/pdf")).toContain(
			"Invalid image format",
		)
	})
})
