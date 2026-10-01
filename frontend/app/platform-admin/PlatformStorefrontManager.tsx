"use client"

import { useState } from "react"

import type { PlatformStorefrontDesign } from "@shared/constants/platformStorefront"
import { getImageUploadError } from "@shared/validation/media"

type Design = PlatformStorefrontDesign

export function PlatformStorefrontManager({ initialDesign }: { readonly initialDesign: Design }) {
	const [design, setDesign] = useState<Design>(initialDesign)
	const [message, setMessage] = useState("")
	const [saving, setSaving] = useState(false)

	const setContent = (key: keyof Design["content"], value: string) =>
		setDesign((current) => ({ ...current, content: { ...current.content, [key]: value } }))

	const upload = async (kind: "LOGO" | "HERO_DESKTOP" | "HERO_MOBILE", file: File | undefined) => {
		if (!file) return
		const error = getImageUploadError(file.size, file.type)
		if (error) {
			setMessage(error)
			return
		}
		setMessage("Uploading image…")
		const formData = new FormData()
		formData.set("file", file)
		formData.set("kind", kind)
		const response = await fetch("/api/platform-admin/storefront", { method: "POST", body: formData })
		const result = (await response.json()) as { url?: string; error?: string }
		const uploadedUrl = result.url
		if (!response.ok || !uploadedUrl) {
			setMessage(result.error ?? "The image could not be uploaded.")
			return
		}
		setDesign((current) => ({
			...current,
			...(kind === "LOGO" ? { logoUrl: uploadedUrl } : kind === "HERO_DESKTOP" ? { heroDesktopUrl: uploadedUrl } : { heroMobileUrl: uploadedUrl }),
		}))
		setMessage("Image uploaded. Save the design to publish it.")
	}

	const save = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setSaving(true)
		setMessage("Saving platform design…")
		try {
			const response = await fetch("/api/platform-admin/storefront", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(design),
			})
			const result = (await response.json()) as Design & { error?: string }
			if (!response.ok) throw new Error(result.error ?? "The platform design could not be saved.")
			setDesign(result)
			setMessage("Platform homepage design saved.")
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "The platform design could not be saved.")
		} finally {
			setSaving(false)
		}
	}

	const textField = (label: string, value: string, onChange: (value: string) => void, multiline = false) => (
		<label>
			{label}
			{multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} /> : <input value={value} onChange={(event) => onChange(event.target.value)} />}
		</label>
	)

	return (
		<section className="platform-admin-panel platform-storefront-admin" aria-labelledby="platform-storefront-title">
			<div className="section-heading">
				<p className="eyebrow">Platform store design</p>
				<h2 id="platform-storefront-title">Beauty Sphia homepage</h2>
				<p>Update the public homepage copy and responsive artwork. Changes are persisted and override the built-in defaults.</p>
			</div>
			<form className="onboarding-form platform-storefront-form" onSubmit={save}>
				<div className="platform-storefront-images">
					<label>Logo image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => void upload("LOGO", event.target.files?.[0])} /><small>Maximum 1 MB.</small></label>
					<label>Desktop hero image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => void upload("HERO_DESKTOP", event.target.files?.[0])} /><small>Maximum 1 MB. Used above 1024px.</small></label>
					<label>Mobile/tablet hero image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => void upload("HERO_MOBILE", event.target.files?.[0])} /><small>Maximum 1 MB. Used at 1024px and below.</small></label>
				</div>
				{ textField("Logo URL", design.logoUrl, (value) => setDesign((current) => ({ ...current, logoUrl: value }))) }
				{ textField("Desktop hero URL", design.heroDesktopUrl, (value) => setDesign((current) => ({ ...current, heroDesktopUrl: value }))) }
				{ textField("Mobile/tablet hero URL", design.heroMobileUrl, (value) => setDesign((current) => ({ ...current, heroMobileUrl: value }))) }
				{ textField("Hero image alt text", design.heroAlt, (value) => setDesign((current) => ({ ...current, heroAlt: value }))) }
				<fieldset><legend>Showcase section</legend>{textField("Eyebrow", design.content.showcaseEyebrow, (value) => setContent("showcaseEyebrow", value))}{textField("Title", design.content.showcaseTitle, (value) => setContent("showcaseTitle", value), true)}{textField("Description", design.content.showcaseDescription, (value) => setContent("showcaseDescription", value), true)}{textField("Primary button", design.content.showcasePrimaryLabel, (value) => setContent("showcasePrimaryLabel", value))}{textField("Secondary button", design.content.showcaseSecondaryLabel, (value) => setContent("showcaseSecondaryLabel", value))}</fieldset>
				<fieldset><legend>Top stores section</legend>{textField("Eyebrow", design.content.topStoresEyebrow, (value) => setContent("topStoresEyebrow", value))}{textField("Title", design.content.topStoresTitle, (value) => setContent("topStoresTitle", value), true)}{textField("View-all button", design.content.topStoresViewAllLabel, (value) => setContent("topStoresViewAllLabel", value))}</fieldset>
				<fieldset><legend>How it works section</legend>{textField("Eyebrow", design.content.howEyebrow, (value) => setContent("howEyebrow", value))}{textField("Title", design.content.howTitle, (value) => setContent("howTitle", value), true)}{design.content.howSteps.map((step, index) => <div className="platform-storefront-step" key={index}>{textField(`Step ${index + 1} title`, step.title, (value) => setDesign((current) => ({ ...current, content: { ...current.content, howSteps: current.content.howSteps.map((item, itemIndex) => itemIndex === index ? { ...item, title: value } : item) } })))}{textField(`Step ${index + 1} description`, step.description, (value) => setDesign((current) => ({ ...current, content: { ...current.content, howSteps: current.content.howSteps.map((item, itemIndex) => itemIndex === index ? { ...item, description: value } : item) } })), true)}</div>)}</fieldset>
				<fieldset><legend>Plans section</legend>{textField("Eyebrow", design.content.plansEyebrow, (value) => setContent("plansEyebrow", value))}{textField("Title", design.content.plansTitle, (value) => setContent("plansTitle", value), true)}{textField("Description", design.content.plansDescription, (value) => setContent("plansDescription", value), true)}</fieldset>
				<fieldset><legend>Contact and footer</legend>{textField("Contact eyebrow", design.content.contactEyebrow, (value) => setContent("contactEyebrow", value))}{textField("Contact title", design.content.contactTitle, (value) => setContent("contactTitle", value), true)}{textField("Contact description", design.content.contactDescription, (value) => setContent("contactDescription", value), true)}{textField("Footer description", design.content.footerDescription, (value) => setContent("footerDescription", value), true)}</fieldset>
				{message && <p className="form-message" role="status">{message}</p>}
				<button className="button button--primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save homepage design"}</button>
			</form>
		</section>
	)
}
