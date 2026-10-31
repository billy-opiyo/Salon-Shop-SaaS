"use client"

import { useEffect, useState, type ChangeEvent } from "react"

import type { PlatformPolicyContent, PlatformStorefrontDesign } from "@shared/constants/platformStorefront"
import {
	PLATFORM_THEME_PALETTES,
	PLATFORM_THEME_PRESET_OPTIONS,
	type PlatformThemePresetKey,
} from "@shared/constants/themePresets"
import { getImageUploadError } from "@shared/validation/media"
import type { PlanTier } from "@shared/types/tenant"
import { platformThemeStyle } from "@/lib/platformTheme"

type Design = PlatformStorefrontDesign
type PolicyKey = "privacyPolicy" | "termsPolicy" | "cookiePolicy"

const tiers: readonly PlanTier[] = ["starter", "business", "enterprise"]

export function PlatformStorefrontManager({ initialDesign, role }: { readonly initialDesign: Design; readonly role: "OWNER" | "STORE_EDITOR" | "STORE_SUPPORT" }) {
	const [design, setDesign] = useState<Design>(initialDesign)
	const [feedback, setFeedback] = useState<{
		readonly message: string
		readonly type: "status" | "success" | "error" | "notice"
	} | null>(null)
	const [saving, setSaving] = useState(false)
	const [uploadingKind, setUploadingKind] = useState<"LOGO" | "HERO_DESKTOP" | "HERO_MOBILE" | "SPLASH_LOGO" | "SPLASH_BACKGROUND" | null>(null)
	const isOwner = role === "OWNER"
	const canEditSite = role === "OWNER" || role === "STORE_EDITOR"
	const canEditSupport = role === "OWNER" || role === "STORE_SUPPORT"

	useEffect(() => {
		const page = document.querySelector<HTMLElement>(".platform-admin-page")
		if (!page) return
		const themeStyle = platformThemeStyle(design.theme)
		const entries = Object.entries(themeStyle).filter(([key]) => key.startsWith("--"))
		const previous = new Map(entries.map(([key]) => [key, page.style.getPropertyValue(key)]))
		for (const [key, value] of entries)
			if (typeof value === "string") page.style.setProperty(key, value)
		return () => {
			for (const [key, value] of previous) {
				if (value) page.style.setProperty(key, value)
				else page.style.removeProperty(key)
			}
		}
	}, [design.theme])

	const setContent = (key: keyof Design["content"], value: string) =>
		setDesign((current) => ({ ...current, content: { ...current.content, [key]: value } }))

	const setGroupText = <Group extends "branding" | "about" | "support" | "directory" | "contact" | "billing" | "homeHero">(
		group: Group,
		key: keyof Design[Group],
		value: string,
	) => setDesign((current) => ({
		...current,
		[group]: { ...current[group], [key]: value },
	}))

	const setHeroBenefit = (index: number, key: "title" | "description", value: string) =>
		setDesign((current) => ({
			...current,
			homeHero: {
				...current.homeHero,
				benefits: current.homeHero.benefits.map((benefit, itemIndex) =>
					itemIndex === index ? { ...benefit, [key]: value } : benefit,
				),
			},
		}))

	const setSupportFaq = (index: number, key: "question" | "answer", value: string) =>
		setDesign((current) => ({
			...current,
			support: {
				...current.support,
				faqs: current.support.faqs.map((faq, faqIndex) =>
					faqIndex === index ? { ...faq, [key]: value } : faq,
				),
			},
		}))

	const addSupportFaq = () => setDesign((current) => ({
		...current,
		support: {
			...current.support,
			faqs: current.support.faqs.length < 12
				? [...current.support.faqs, { question: "", answer: "" }]
				: current.support.faqs,
		},
	}))

	const removeSupportFaq = (index: number) => setDesign((current) => ({
		...current,
		support: {
			...current.support,
			faqs: current.support.faqs.length > 3
				? current.support.faqs.filter((_, faqIndex) => faqIndex !== index)
				: current.support.faqs,
		},
	}))

	const setTheme = (key: Exclude<keyof Design["theme"], "preset">, value: string) =>
		setDesign((current) => ({ ...current, theme: { ...current.theme, [key]: value } }))

	const selectThemePreset = (preset: PlatformThemePresetKey) =>
		setDesign((current) => ({
			...current,
			theme: { ...PLATFORM_THEME_PALETTES[preset], preset },
		}))

	const setPlanText = (tier: PlanTier, key: "name" | "description" | "bestFor", value: string) =>
		setDesign((current) => ({
			...current,
			plans: { ...current.plans, [tier]: { ...current.plans[tier], [key]: value } },
		}))

	const setPlanAmount = (tier: PlanTier, key: "monthlyAmountMinor" | "setupFeeMinor", amountKes: string) => {
		const numeric = Number(amountKes)
		setDesign((current) => ({
			...current,
			plans: {
				...current.plans,
				[tier]: {
					...current.plans[tier],
					[key]: Number.isFinite(numeric) ? Math.round(numeric * 100) : 0,
				},
			},
		}))
	}

	const setPlanFeatures = (tier: PlanTier, value: string) =>
		setDesign((current) => ({
			...current,
			plans: {
				...current.plans,
				[tier]: {
					...current.plans[tier],
					features: value.split("\n").map((feature) => feature.trim()).filter(Boolean),
				},
			},
		}))

	const setPolicyText = (policyKey: PolicyKey, key: "eyebrow" | "title" | "introduction", value: string) =>
		setDesign((current) => ({
			...current,
			[policyKey]: { ...current[policyKey], [key]: value },
		}))

	const setPolicySection = (policyKey: PolicyKey, index: number, key: "heading" | "body", value: string) =>
		setDesign((current) => {
			const policy = current[policyKey]
			return {
				...current,
				[policyKey]: {
					...policy,
					sections: policy.sections.map((section, sectionIndex) =>
						sectionIndex === index ? { ...section, [key]: value } : section,
					),
				},
			}
		})

	const upload = async (kind: "LOGO" | "HERO_DESKTOP" | "HERO_MOBILE" | "SPLASH_LOGO" | "SPLASH_BACKGROUND", file: File | undefined) => {
		if (!file || saving || uploadingKind) return
		const error = getImageUploadError(file.size, file.type)
		if (error) {
			setFeedback({ message: error, type: "error" })
			return
		}
		setUploadingKind(kind)
		setFeedback({ message: "Uploading image…", type: "status" })
		const formData = new FormData()
		formData.set("file", file)
		formData.set("kind", kind)
		try {
			const response = await fetch("/api/platform-admin/storefront", { method: "POST", body: formData })
			const result = (await response.json()) as { url?: string; error?: string }
			if (!response.ok || !result.url) throw new Error(result.error ?? "The image could not be uploaded.")
			const uploadedUrl = result.url
			setDesign((current) => {
				if (kind === "LOGO") return { ...current, logoUrl: uploadedUrl }
				if (kind === "HERO_DESKTOP") return { ...current, heroDesktopUrl: uploadedUrl }
				if (kind === "HERO_MOBILE") return { ...current, heroMobileUrl: uploadedUrl }
				return {
					...current,
					splash: {
						...current.splash,
						...(kind === "SPLASH_LOGO" ? { logoUrl: uploadedUrl } : { backgroundImageUrl: uploadedUrl }),
					},
				}
			})
			setFeedback({ message: "Image uploaded. Save the design to publish it.", type: "notice" })
		} catch (error) {
			setFeedback({
				message: error instanceof Error ? error.message : "The image could not be uploaded.",
				type: "error",
			})
		} finally {
			setUploadingKind(null)
		}
	}

	const selectImage = (kind: "LOGO" | "HERO_DESKTOP" | "HERO_MOBILE" | "SPLASH_LOGO" | "SPLASH_BACKGROUND") =>
		(event: ChangeEvent<HTMLInputElement>) => {
			const file = event.currentTarget.files?.[0]
			event.currentTarget.value = ""
			void upload(kind, file)
		}

	const save = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (uploadingKind) {
			setFeedback({ message: "Wait for the image upload to finish before saving.", type: "notice" })
			return
		}
		setSaving(true)
		setFeedback({ message: "Saving platform settings…", type: "status" })
		try {
			const response = await fetch("/api/platform-admin/storefront", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(design),
			})
			const result = (await response.json()) as Design & { error?: string }
			if (!response.ok) throw new Error(result.error ?? "Platform settings could not be saved.")
			setDesign(result)
			setFeedback({ message: "Beauty Sphia platform settings saved.", type: "success" })
		} catch (error) {
			setFeedback({
				message: error instanceof Error ? error.message : "Platform settings could not be saved.",
				type: "error",
			})
		} finally {
			setSaving(false)
		}
	}

	const textField = (label: string, value: string, onChange: (value: string) => void, multiline = false) => (
		<label className={`platform-admin-field${multiline ? " platform-admin-field--wide" : ""}`} key={label}>
			{label}
			{multiline
				? <textarea value={value} onChange={(event) => onChange(event.target.value)} />
				: <input value={value} onChange={(event) => onChange(event.target.value)} />}
		</label>
	)
	const cmsSaveButton = (label: string) => (
		<div className="platform-cms-save-row">
			<button className="button button--primary button--small" type="submit" disabled={saving || uploadingKind !== null}>
				{saving ? "Saving…" : uploadingKind ? "Uploading image…" : `Save ${label}`}
			</button>
		</div>
	)
	const navigateToSection = (targetId: string) => {
		const section = document.getElementById(targetId)
		if (!section) return
		section.scrollIntoView({ behavior: "smooth", block: "start" })
		section.querySelector<HTMLElement>("input:not([type='file']), select, textarea")?.focus({ preventScroll: true })
	}

	const policyEditor = (heading: string, policyKey: PolicyKey, policy: PlatformPolicyContent) => (
		<fieldset key={policyKey}>
			<legend>{heading}</legend>
			{textField("Eyebrow", policy.eyebrow, (value) => setPolicyText(policyKey, "eyebrow", value))}
			{textField("Page title", policy.title, (value) => setPolicyText(policyKey, "title", value))}
			{textField("Introduction", policy.introduction, (value) => setPolicyText(policyKey, "introduction", value), true)}
			{policy.sections.map((section, index) => (
				<div className="platform-storefront-step" key={`${policyKey}-${index}`}>
					{textField(`Section ${index + 1} heading`, section.heading, (value) => setPolicySection(policyKey, index, "heading", value))}
					{textField(`Section ${index + 1} text`, section.body, (value) => setPolicySection(policyKey, index, "body", value), true)}
				</div>
			))}
			{cmsSaveButton(heading)}
		</fieldset>
	)

	return (
		<section className="platform-admin-panel platform-storefront-admin" aria-labelledby="platform-storefront-title">
			<div className="section-heading">
				<p className="eyebrow">Platform CMS</p>
				<h2 id="platform-storefront-title">Beauty Sphia platform pages</h2>
				<p>{isOwner ? "Manage platform pages, pricing, billing instructions, and delegated access." : role === "STORE_EDITOR" ? "Edit public platform site content and team profiles. Pricing, billing, and support settings are restricted." : "Manage the support page, FAQs, and support contact details."}</p>
			</div>
			<nav className="platform-cms-section-nav" aria-label="Platform CMS sections">
				{[
					...(canEditSite ? [{ target: "cms-branding", label: "Branding" }, { target: "cms-splash", label: "Splash screen" }, { target: "cms-home", label: "Homepage" }, { target: "cms-about", label: "Site pages" }] : []),
					...(isOwner ? [{ target: "cms-plans", label: "Plans & billing" }] : []),
					...(canEditSupport ? [{ target: "cms-support", label: "Support" }] : []),
				].map(({ target, label }) => (
					<button className="button button--outline button--small" type="button" key={target} onClick={() => navigateToSection(target)}>{label}</button>
				))}
			</nav>
			<form className="onboarding-form platform-admin-form platform-storefront-form" onSubmit={save}>
				{canEditSite && <>
				<fieldset id="cms-branding">
					<legend>Branding and theme</legend>
					<label className="platform-admin-field">
						Theme preset
						<select
							value={design.theme.preset}
							onChange={(event) => selectThemePreset(event.target.value as PlatformThemePresetKey)}
						>
							{PLATFORM_THEME_PRESET_OPTIONS.map((preset) => (
								<option value={preset.key} key={preset.key}>{preset.label}</option>
							))}
						</select>
					</label>
					{ textField("Platform name", design.branding.name, (value) => setGroupText("branding", "name", value)) }
					{ textField("Brand tagline", design.branding.tagline, (value) => setGroupText("branding", "tagline", value)) }
					<div className="platform-storefront-images">
						<label>Platform logo<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={saving || uploadingKind !== null} onChange={selectImage("LOGO")} /><small>Maximum 1 MB.</small>{design.logoUrl && <img className="platform-storefront-image-preview" src={design.logoUrl} alt="Current Beauty Sphia logo" loading="lazy" decoding="async" />}</label>
					</div>
					<div className="platform-storefront-theme-grid">
						{(Object.keys(PLATFORM_THEME_PALETTES["beauty-sphia"]) as Array<Exclude<keyof Design["theme"], "preset">>).map((key) => (
							<label key={key}>{key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}<input type="color" value={design.theme[key]} onChange={(event) => setTheme(key, event.target.value)} /></label>
						))}
					</div>
					{cmsSaveButton("Branding")}
				</fieldset>

				<fieldset id="cms-splash">
					<legend>Splash screen</legend>
					<p>The current title, progress logo, loading message, and background are shown below. Each splash image can be replaced independently of the main platform branding.</p>
					{ textField("Animated title", design.splash.title, (value) => setDesign((current) => ({ ...current, splash: { ...current.splash, title: value } }))) }
					{ textField("Loading message", design.splash.loadingText, (value) => setDesign((current) => ({ ...current, splash: { ...current.splash, loadingText: value } }))) }
					<div className="platform-storefront-images platform-storefront-images--splash">
						<label>Splash progress logo<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={saving || uploadingKind !== null} onChange={selectImage("SPLASH_LOGO")} /><small>Current logo is shown below. Upload a replacement, then save the splash settings.</small>{design.splash.logoUrl && <img className="platform-storefront-image-preview" src={design.splash.logoUrl} alt="Current Beauty Sphia splash progress logo" loading="lazy" decoding="async" />}</label>
						<label>Splash background image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={saving || uploadingKind !== null} onChange={selectImage("SPLASH_BACKGROUND")} /><small>Current background is shown below. Upload a replacement, then save the splash settings.</small>{design.splash.backgroundImageUrl && <img className="platform-storefront-image-preview" src={design.splash.backgroundImageUrl} alt="Current Beauty Sphia splash background" loading="lazy" decoding="async" />}</label>
					</div>
					{cmsSaveButton("Splash screen")}
				</fieldset>

				<fieldset id="cms-home">
					<legend>Homepage hero</legend>
					<div className="platform-storefront-images">
						<label>Desktop hero image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={saving || uploadingKind !== null} onChange={selectImage("HERO_DESKTOP")} /><small>Maximum 1 MB. Used above 1024px.</small>{design.heroDesktopUrl && <img className="platform-storefront-image-preview" src={design.heroDesktopUrl} alt="Current desktop hero" loading="lazy" decoding="async" />}</label>
						<label>Mobile/tablet hero image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={saving || uploadingKind !== null} onChange={selectImage("HERO_MOBILE")} /><small>Maximum 1 MB. Used at 1024px and below.</small>{design.heroMobileUrl && <img className="platform-storefront-image-preview" src={design.heroMobileUrl} alt="Current mobile and tablet hero" loading="lazy" decoding="async" />}</label>
					</div>
					{ textField("Hero image alt text", design.heroAlt, (value) => setDesign((current) => ({ ...current, heroAlt: value }))) }
					{ textField("Eyebrow", design.homeHero.eyebrow, (value) => setGroupText("homeHero", "eyebrow", value)) }
					{ textField("Audience line", design.homeHero.audience, (value) => setGroupText("homeHero", "audience", value)) }
					{ textField("Title", design.homeHero.title, (value) => setGroupText("homeHero", "title", value)) }
					{ textField("Highlighted title text", design.homeHero.highlight, (value) => setGroupText("homeHero", "highlight", value)) }
					{ textField("Description", design.homeHero.description, (value) => setGroupText("homeHero", "description", value), true) }
					{ textField("Button label", design.homeHero.actionLabel, (value) => setGroupText("homeHero", "actionLabel", value)) }
					{ textField("Signature line", design.homeHero.signature, (value) => setGroupText("homeHero", "signature", value)) }
					{design.homeHero.benefits.map((benefit, index) => <div className="platform-storefront-step" key={index}>{textField(`Benefit ${index + 1} title`, benefit.title, (value) => setHeroBenefit(index, "title", value))}{textField(`Benefit ${index + 1} text`, benefit.description, (value) => setHeroBenefit(index, "description", value), true)}</div>)}
					{cmsSaveButton("Homepage")}
				</fieldset>

				<fieldset><legend>Homepage showcase</legend>{textField("Eyebrow", design.content.showcaseEyebrow, (value) => setContent("showcaseEyebrow", value))}{textField("Title", design.content.showcaseTitle, (value) => setContent("showcaseTitle", value), true)}{textField("Description", design.content.showcaseDescription, (value) => setContent("showcaseDescription", value), true)}{textField("Explore Salons button", design.content.showcasePrimaryLabel, (value) => setContent("showcasePrimaryLabel", value))}{cmsSaveButton("Homepage")}</fieldset>
				<fieldset><legend>Top salons section</legend>{textField("Eyebrow", design.content.topStoresEyebrow, (value) => setContent("topStoresEyebrow", value))}{textField("Title", design.content.topStoresTitle, (value) => setContent("topStoresTitle", value), true)}{textField("View-all button", design.content.topStoresViewAllLabel, (value) => setContent("topStoresViewAllLabel", value))}{cmsSaveButton("Homepage")}</fieldset>
				<fieldset><legend>How it works section</legend>{textField("Eyebrow", design.content.howEyebrow, (value) => setContent("howEyebrow", value))}{textField("Title", design.content.howTitle, (value) => setContent("howTitle", value), true)}{design.content.howSteps.map((step, index) => <div className="platform-storefront-step" key={index}>{textField(`Step ${index + 1} title`, step.title, (value) => setDesign((current) => ({ ...current, content: { ...current.content, howSteps: current.content.howSteps.map((item, itemIndex) => itemIndex === index ? { ...item, title: value } : item) } })))}{textField(`Step ${index + 1} description`, step.description, (value) => setDesign((current) => ({ ...current, content: { ...current.content, howSteps: current.content.howSteps.map((item, itemIndex) => itemIndex === index ? { ...item, description: value } : item) } })), true)}</div>)}{cmsSaveButton("Homepage")}</fieldset>
				<fieldset id="cms-about"><legend>About page</legend>{textField("Eyebrow", design.about.eyebrow, (value) => setGroupText("about", "eyebrow", value))}{textField("Title", design.about.title, (value) => setGroupText("about", "title", value), true)}{textField("Introduction", design.about.description, (value) => setGroupText("about", "description", value), true)}{textField("Team eyebrow", design.about.teamEyebrow, (value) => setGroupText("about", "teamEyebrow", value))}{textField("Team title", design.about.teamTitle, (value) => setGroupText("about", "teamTitle", value), true)}{textField("Team introduction", design.about.teamDescription, (value) => setGroupText("about", "teamDescription", value), true)}{textField("Call-to-action title", design.about.ctaTitle, (value) => setGroupText("about", "ctaTitle", value), true)}{cmsSaveButton("Site pages")}</fieldset>
				</>}
				{canEditSupport && <>
				<fieldset id="cms-support"><legend>Support page</legend>{textField("Eyebrow", design.support.eyebrow, (value) => setGroupText("support", "eyebrow", value))}{textField("Title", design.support.title, (value) => setGroupText("support", "title", value), true)}{textField("Introduction", design.support.description, (value) => setGroupText("support", "description", value), true)}{textField("Getting started eyebrow", design.support.gettingStartedEyebrow, (value) => setGroupText("support", "gettingStartedEyebrow", value))}{textField("Getting started title", design.support.gettingStartedTitle, (value) => setGroupText("support", "gettingStartedTitle", value))}{textField("Getting started text", design.support.gettingStartedDescription, (value) => setGroupText("support", "gettingStartedDescription", value), true)}{textField("Direct help eyebrow", design.support.directHelpEyebrow, (value) => setGroupText("support", "directHelpEyebrow", value))}{textField("Direct help title", design.support.directHelpTitle, (value) => setGroupText("support", "directHelpTitle", value))}{textField("Direct help text", design.support.directHelpDescription, (value) => setGroupText("support", "directHelpDescription", value), true)}{textField("Contact card eyebrow", design.support.contactEyebrow, (value) => setGroupText("support", "contactEyebrow", value))}{textField("Contact card title", design.support.contactTitle, (value) => setGroupText("support", "contactTitle", value))}{textField("Contact card text", design.support.contactDescription, (value) => setGroupText("support", "contactDescription", value), true)}{cmsSaveButton("Support")}</fieldset>
				<fieldset>
					<legend>Frequently Asked Questions</legend>
					{textField("FAQ eyebrow", design.support.faqEyebrow, (value) => setGroupText("support", "faqEyebrow", value))}
					{textField("FAQ title", design.support.faqTitle, (value) => setGroupText("support", "faqTitle", value))}
					{textField("FAQ introduction", design.support.faqDescription, (value) => setGroupText("support", "faqDescription", value), true)}
					{design.support.faqs.map((faq, index) => (
						<div className="platform-storefront-step" key={`support-faq-${index}`}>
							{textField(`Question ${index + 1}`, faq.question, (value) => setSupportFaq(index, "question", value))}
							{textField(`Answer ${index + 1}`, faq.answer, (value) => setSupportFaq(index, "answer", value), true)}
							<button className="button button--ghost button--small" type="button" onClick={() => removeSupportFaq(index)} disabled={design.support.faqs.length <= 3}>Remove question</button>
						</div>
					))}
					<button className="button button--outline button--small" type="button" onClick={addSupportFaq} disabled={design.support.faqs.length >= 12}>Add FAQ</button>
					{cmsSaveButton("Support")}
				</fieldset>
				</>}
				{canEditSite && <>
				<fieldset><legend>Salon directory page</legend>{textField("Hero eyebrow", design.directory.eyebrow, (value) => setGroupText("directory", "eyebrow", value))}{textField("Hero title", design.directory.title, (value) => setGroupText("directory", "title", value), true)}{textField("Hero description", design.directory.description, (value) => setGroupText("directory", "description", value), true)}{textField("List eyebrow", design.directory.listEyebrow, (value) => setGroupText("directory", "listEyebrow", value))}{textField("List title", design.directory.listTitle, (value) => setGroupText("directory", "listTitle", value), true)}{textField("List description", design.directory.listDescription, (value) => setGroupText("directory", "listDescription", value), true)}{textField("Call-to-action eyebrow", design.directory.ctaEyebrow, (value) => setGroupText("directory", "ctaEyebrow", value))}{textField("Call-to-action title", design.directory.ctaTitle, (value) => setGroupText("directory", "ctaTitle", value), true)}{textField("Call-to-action text", design.directory.ctaDescription, (value) => setGroupText("directory", "ctaDescription", value), true)}{cmsSaveButton("Site pages")}</fieldset>
				{isOwner && <>
				<fieldset id="cms-plans"><legend>Pricing and plan cards</legend><p>Amounts are entered in whole KES. Existing subscriptions keep their agreed rates until the price-change notice period is applied.</p>{textField("Pricing eyebrow", design.content.plansEyebrow, (value) => setContent("plansEyebrow", value))}{textField("Pricing title", design.content.plansTitle, (value) => setContent("plansTitle", value), true)}{textField("Pricing introduction", design.content.plansDescription, (value) => setContent("plansDescription", value), true)}{tiers.map((tier) => <div className="platform-storefront-step" key={tier}><h3>{design.plans[tier].name} plan</h3>{textField("Plan name", design.plans[tier].name, (value) => setPlanText(tier, "name", value))}{textField("Description", design.plans[tier].description, (value) => setPlanText(tier, "description", value), true)}{textField("Best for", design.plans[tier].bestFor, (value) => setPlanText(tier, "bestFor", value), true)}<label>Monthly price (KES)<input type="number" min="0" step="1" value={design.plans[tier].monthlyAmountMinor / 100} onChange={(event) => setPlanAmount(tier, "monthlyAmountMinor", event.target.value)} /></label><label>One-time setup fee (KES)<input type="number" min="0" step="1" value={design.plans[tier].setupFeeMinor / 100} onChange={(event) => setPlanAmount(tier, "setupFeeMinor", event.target.value)} /></label><label>Plan feature bullets<textarea value={design.plans[tier].features.join("\n")} onChange={(event) => setPlanFeatures(tier, event.target.value)} /><small>Enter one feature on each line (1–8).</small></label></div>)}{cmsSaveButton("Plans & billing")}</fieldset>
				<fieldset><legend>Billing and M-Pesa</legend><label>Collection method<select value={design.billing.paymentMode} onChange={(event) => setGroupText("billing", "paymentMode", event.target.value)}><option value="paybill-stk">M-Pesa Paybill STK Push</option><option value="till-stk">M-Pesa Buy Goods Till STK Push</option></select></label><label>M-Pesa Paybill/Till number<input inputMode="numeric" value={design.billing.businessShortCode} onChange={(event) => setGroupText("billing", "businessShortCode", event.target.value)} /><small>Enter the public Paybill or Till. A Till STK request uses the configured Daraja shortcode for credentials and sends this Till as the receiving party.</small></label>{textField("Invoice account reference prefix", design.billing.accountReferencePrefix, (value) => setGroupText("billing", "accountReferencePrefix", value))}<label>Free usage months<input type="number" min="0" max="60" value={design.billing.freeUsageMonths} onChange={(event) => setDesign((current) => ({ ...current, billing: { ...current.billing, freeUsageMonths: Number(event.target.value) || 0 } }))} /></label>{textField("Client payment instructions", design.billing.paymentInstructions, (value) => setGroupText("billing", "paymentInstructions", value), true)}{textField("Payment receipt instructions", design.billing.receiptInstructions, (value) => setGroupText("billing", "receiptInstructions", value), true)}{cmsSaveButton("Plans & billing")}</fieldset>
				</>}
				{isOwner && <>
				<fieldset><legend>Platform contact and social details</legend>{textField("Support email", design.contact.supportEmail, (value) => setGroupText("contact", "supportEmail", value))}{textField("Platform phone number", design.contact.phone, (value) => setGroupText("contact", "phone", value))}{textField("Platform WhatsApp URL", design.contact.whatsappUrl, (value) => setGroupText("contact", "whatsappUrl", value))}{textField("Facebook URL", design.contact.facebookUrl, (value) => setGroupText("contact", "facebookUrl", value))}{textField("Instagram URL", design.contact.instagramUrl, (value) => setGroupText("contact", "instagramUrl", value))}{textField("TikTok URL", design.contact.tiktokUrl, (value) => setGroupText("contact", "tiktokUrl", value))}{textField("Platform address", design.contact.address, (value) => setGroupText("contact", "address", value))}{textField("Contact section eyebrow", design.content.contactEyebrow, (value) => setContent("contactEyebrow", value))}{textField("Contact section title", design.content.contactTitle, (value) => setContent("contactTitle", value), true)}{textField("Contact section introduction", design.content.contactDescription, (value) => setContent("contactDescription", value), true)}{cmsSaveButton("Contact details")}</fieldset>
				</>}
				</>}
				{role === "STORE_SUPPORT" && <fieldset><legend>Support contact details</legend>{textField("Support email", design.contact.supportEmail, (value) => setGroupText("contact", "supportEmail", value))}{textField("Support phone number", design.contact.phone, (value) => setGroupText("contact", "phone", value))}{textField("Support WhatsApp URL", design.contact.whatsappUrl, (value) => setGroupText("contact", "whatsappUrl", value))}{cmsSaveButton("Support")}</fieldset>}
				{canEditSite && <>
				{policyEditor("Privacy policy", "privacyPolicy", design.privacyPolicy)}
				{policyEditor("Terms of service", "termsPolicy", design.termsPolicy)}
				{policyEditor("Cookie policy", "cookiePolicy", design.cookiePolicy)}
				<fieldset><legend>Footer</legend>{textField("Footer description", design.content.footerDescription, (value) => setContent("footerDescription", value), true)}{cmsSaveButton("Site pages")}</fieldset>
				</>}
				{feedback && (
					<p
						className={`form-message${feedback.type === "success" ? " form-message--success" : feedback.type === "error" ? " form-message--error" : ""}`}
						role={feedback.type === "error" ? "alert" : "status"}
						aria-live={feedback.type === "error" ? "assertive" : "polite"}
					>
						{feedback.message}
					</p>
				)}
			</form>
		</section>
	)
}
