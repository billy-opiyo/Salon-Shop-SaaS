"use client"

import { useState } from "react"

import { getImageUploadError } from "@shared/validation/media"

interface TenantImageUploadFieldProps {
	readonly tenantSlug: string
	readonly name: string
	readonly label: string
	readonly kind: "GALLERY" | "BLOG" | "LOGO" | "HERO"
	readonly defaultValue?: string | null
	readonly required?: boolean
	readonly helpText?: string
}

export function TenantImageUploadField({
	tenantSlug,
	name,
	label,
	kind,
	defaultValue = "",
	required = false,
	helpText = "Choose an image from your device. Maximum 1 MB.",
}: TenantImageUploadFieldProps) {
	const [imageUrl, setImageUrl] = useState(defaultValue ?? "")
	const [status, setStatus] = useState<{ readonly text: string; readonly isError: boolean } | null>(null)
	const [busy, setBusy] = useState(false)

	async function upload(file: File | undefined) {
		if (!file) return
		const validationError = getImageUploadError(file.size, file.type)
		if (validationError) {
			setStatus({ text: validationError, isError: true })
			return
		}

		setBusy(true)
		setStatus({ text: "Uploading image…", isError: false })
		try {
			const mediaPath = `/api/manage/${encodeURIComponent(tenantSlug)}/media`
			const prepareResponse = await fetch(mediaPath, {
				method: "POST",
				credentials: "same-origin",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					fileName: file.name,
					mimeType: file.type,
					byteSize: file.size,
					kind,
				}),
			})
			const prepared = (await prepareResponse.json()) as {
				uploadUrl?: string
				assetId?: string
				error?: string
			}
			if (!prepareResponse.ok || !prepared.uploadUrl || !prepared.assetId)
				throw new Error(prepared.error ?? "The image upload could not be prepared.")

			const uploadResponse = await fetch(prepared.uploadUrl, {
				method: "PUT",
				headers: { "content-type": file.type },
				body: file,
			})
			if (!uploadResponse.ok) throw new Error("The image could not be uploaded to storage.")

			const finalizeResponse = await fetch(mediaPath, {
				method: "PATCH",
				credentials: "same-origin",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ assetId: prepared.assetId }),
			})
			const finalized = (await finalizeResponse.json()) as {
				publicUrl?: string | null
				error?: string
			}
			if (!finalizeResponse.ok || !finalized.publicUrl)
				throw new Error(finalized.error ?? "The uploaded image has no public URL configured.")

			setImageUrl(finalized.publicUrl)
			setStatus({ text: "Image uploaded. Save the form to apply it.", isError: false })
		} catch (error) {
			setStatus({
				text: error instanceof Error ? error.message : "The image upload failed.",
				isError: true,
			})
		} finally {
			setBusy(false)
		}
	}

	return (
		<div className="tenant-image-upload-field">
			<label>
				{label}{required ? " *" : ""}
				<input
					type="file"
					accept="image/jpeg,image/png,image/webp,image/gif"
					required={required && !imageUrl}
					disabled={busy}
					onChange={(event) => void upload(event.currentTarget.files?.[0])}
				/>
			</label>
			{helpText && <small>{helpText}</small>}
			{imageUrl && <img className="tenant-image-upload-field__preview" src={imageUrl} alt={`${label} preview`} />}
			<input type="hidden" name={name} value={imageUrl} />
			{status && (
				<p
					className={`form-message tenant-image-upload-field__message${status.isError ? " is-error" : ""}`}
					role={status.isError ? "alert" : "status"}
					aria-live={status.isError ? "assertive" : "polite"}
				>
					{status.text}
				</p>
			)}
		</div>
	)
}
