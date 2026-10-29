"use client"

import { useEffect } from "react"
import { signIn, signOut } from "next-auth/react"
import { openNativeGoogleSignIn } from "@/lib/mobileGoogleAuth"
import { initializeMobileAppSwitchLink } from "@/lib/mobile-app-switch"

import { registerAccount } from "@/app/signup/actions"
import {
	DEFAULT_STOREFRONT_DESIGN,
	STOREFRONT_SECTION_KEYS,
	type StorefrontDesignConfig,
} from "@shared/constants/storefrontDesign"
import { safeMapEmbedUrl } from "@shared/safeMapEmbedUrl"
import { DEFAULT_THEME_PRESET } from "@shared/constants/themePresets"
import type { BookingPaymentMode } from "@shared/constants/bookingPayments"
import { BOOKING_TIME_SLOTS } from "@shared/constants/bookingAvailability"
import { SalonStorefrontMarkup } from "@/components/tenant/SalonStorefrontMarkup"
import type { SiteSearchEntry } from "@/components/shared/SiteSearch"
import type {
	SalonBlogItem,
	SalonGalleryItem,
	SalonReviewItem,
	SalonServiceItem,
} from "@/components/tenant/SalonCatalog"
import {
	SalonBlogs,
	SalonGallery,
	SalonServices,
	SalonServiceOptions,
	SalonTestimonials,
} from "@/components/tenant/SalonCatalog"
import {
	getImageUploadError,
	IMAGE_TOO_LARGE_MESSAGE,
} from "@shared/validation/media"
import { getHairGalleryFieldRules } from "@shared/validation/galleryRules"

export interface SalonClientConfig {
	readonly client?: { readonly name?: string }
	readonly brand?: {
		readonly businessName?: string
		readonly shortNameHtml?: string
		readonly logoSrc?: string
		readonly logoAlt?: string
		readonly heroImage?: string
		readonly heroImageAlt?: string
		readonly heroSubtitle?: string
		readonly heroTitleHtml?: string
		readonly heroDescription?: string
		readonly footerLogoHtml?: string
		readonly footerDescription?: string
		readonly copyright?: string
		readonly craftedBy?: string
		readonly favicon?: string
	}
	readonly appearance?: {
		readonly mode?: string
		readonly preset?: string
		readonly storageKey?: string
	}
	readonly seo?: {
		readonly title?: string
		readonly description?: string
		readonly keywords?: string
		readonly ogTitle?: string
		readonly ogImage?: string
	}
	readonly contact?: Record<string, string | undefined>
	readonly social?: Record<string, string | undefined>
	readonly bookingPayment?: {
		readonly enabled: boolean
		readonly modes: readonly BookingPaymentMode[]
		readonly depositPercent: number
		readonly currency: string
	}
	readonly catalog?: {
		readonly services?: readonly SalonServiceItem[]
		readonly stylists?: readonly {
			readonly id: string
			readonly name: string
			readonly title?: string
		}[]
		readonly gallery?: readonly SalonGalleryItem[]
		readonly testimonials?: readonly SalonReviewItem[]
		readonly blogs?: readonly SalonBlogItem[]
	}
	readonly storefront?: StorefrontDesignConfig
}

export interface SalonStorefrontRuntimeProps {
	readonly tenantSlug?: string
	readonly showAdminSearch?: boolean
	readonly turnstileSiteKey?: string
	readonly clientConfig: SalonClientConfig
}

declare global {
	interface Window {
		CLIENT_CONFIG?: Record<string, unknown>
		turnstile?: {
			render: (
				element: HTMLElement,
				options: {
					readonly sitekey: string
					readonly callback: (token: string) => void
					readonly "expired-callback": () => void
					readonly "error-callback": () => void
				},
			) => string
			remove: (widgetId: string) => void
			reset: (widgetId?: string) => void
		}
	}
}

type AdminSnapshotRecord = Record<string, unknown>

function renderAdminSnapshotList(
	elementId: string,
	items: readonly unknown[] | undefined,
	emptyMessage: string,
): void {
	const element = document.getElementById(elementId)
	if (!element) return
	element.replaceChildren()
	if (!items?.length) {
		const empty = document.createElement("p")
		empty.className = "admin-empty-state"
		empty.textContent = emptyMessage
		element.append(empty)
		return
	}
	const isSecurityCollection = elementId.startsWith("adminSecurity") ||
		elementId === "adminAccountHistoryList" ||
		elementId === "adminSessionsList" ||
		elementId === "adminTimelineList"
	if (isSecurityCollection) {
		element.classList.toggle("is-vertical-scroll-active", items.length > 4)
		element.setAttribute("data-scroll-active", items.length > 4 ? "true" : "false")
	}
	let securityRows: HTMLTableSectionElement | null = null
	if (isSecurityCollection) {
		const table = document.createElement("table")
		table.className = "admin-security-table"
		const headings = elementId === "adminSecurityActivityList"
			? ["User", "Method", "Device/Browser", "Location", "IP (Masked)", "Status", "Failed Attempts", "Lock Status", "Risk", "Suspicious", "Actions", "Time"]
			: elementId === "adminSecurityAlertsList"
				? ["Alert", "User", "Severity", "Status", "Time"]
				: elementId === "adminSessionsList"
					? ["User", "Device/Browser", "Status", "Last Active", "Duration", "Devices"]
					: elementId === "adminAccountHistoryList"
						? ["Change", "User", "Details", "Time"]
						: ["Time", "Event", "User", "Summary"]
		const head = document.createElement("thead")
		const headingRow = document.createElement("tr")
		for (const value of headings) {
			const cell = document.createElement("th")
			cell.scope = "col"
			cell.textContent = value
			headingRow.append(cell)
		}
		head.append(headingRow)
		securityRows = document.createElement("tbody")
		table.append(head, securityRows)
		element.append(table)
	}

	items.forEach((item) => {
		const record =
			typeof item === "object" && item !== null
				? (item as AdminSnapshotRecord)
				: { value: item }
		const row = document.createElement(isSecurityCollection ? "tr" : "article")
		const isBooking = elementId === "adminBookingsList"
		const isWaitlist = elementId === "adminWaitlistList"
		const isGallery = elementId === "adminGalleryList"
		const isBlog = elementId === "adminBlogsList"
		const isMessage = elementId === "adminContactList"
		const isReview = elementId === "adminReviewsList"
		const isSecurity = elementId.startsWith("adminSecurity") ||
			elementId === "adminAccountHistoryList" ||
			elementId === "adminSessionsList" ||
			elementId === "adminTimelineList"
		row.className = [
			"admin-snapshot-row",
			isBooking ? "admin-booking-item" : "",
			isWaitlist ? "admin-review-item admin-waitlist-card" : "",
			isWaitlist && String(record.status ?? "").toUpperCase() === "WAITING" && record.queuePosition
				? "admin-waitlist-card--queued"
				: "",
			isGallery ? "admin-gallery-item" : "",
			isBlog ? "admin-blog-item" : "",
			isMessage || isReview || elementId === "adminAdminsList" || elementId === "adminServicesList"
				? "admin-review-item"
				: "",
			isSecurity ? "admin-security-row-main" : "",
		].filter(Boolean).join(" ")
		row.dataset.searchText = Object.values(record)
			.map(formatAdminSnapshotValue)
			.join(" ")
			.toLowerCase()
		row.dataset.provider = String(record.provider ?? "").toLowerCase()
		const userAgent = String(record.userAgent ?? "").toLowerCase()
		row.dataset.device = /ipad|tablet|kindle|silk|android(?!.*mobile)/.test(userAgent)
			? "tablet"
			: /mobile|iphone|android/.test(userAgent)
				? "mobile"
				: userAgent
					? "desktop"
					: "unknown"
		row.dataset.userType = typeof record.userId === "string" && record.userId
			? "known-user"
			: "anonymous"
		if (elementId === "adminSessionsList")
			row.dataset.sessionUserId =
				typeof record.userId === "string" ? record.userId : ""
		row.dataset.risk = String(record.riskLevel ?? "").toLowerCase()
		row.dataset.country = String(record.country ?? "").toLowerCase()
		row.dataset.status = record.resolvedAt
			? "resolved"
			: record.resolvedAt === null
				? "open"
				: String(record.status ?? "").toLowerCase()
		if (elementId === "adminSessionsList") row.dataset.status = "active"
		row.dataset.severity = String(record.severity ?? "").toLowerCase()
		row.dataset.eventType = String(record.eventType ?? "").toLowerCase()
		row.dataset.changeType = String(record.changeType ?? "").toLowerCase()
		row.dataset.createdAt = String(record.createdAt ?? "")
		row.dataset.updatedAt = String(record.updatedAt ?? "")
		if (isReview) {
			row.dataset.rating = String(Number(record.rating ?? 0))
			row.dataset.featured = String(record.featured === true)
		}
		row.dataset.preferredDate = String(record.preferredDate ?? "")
		row.dataset.preferredTime = String(record.preferredTime ?? "")
		const person = record.user && typeof record.user === "object"
			? (record.user as AdminSnapshotRecord)
			: {}
		const customerName = [record.firstName, record.lastName]
			.filter((part): part is string => typeof part === "string" && Boolean(part.trim()))
			.join(" ") || String(record.customerName ?? record.name ?? person.name ?? record.email ?? "Record")
		const titleText = String(
			isBooking || isWaitlist
				? customerName
				: isGallery
					? record.styleName ?? record.title ?? "Untitled style"
					: isBlog
						? record.title ?? "Untitled post"
						: record.name ?? record.subject ?? record.serviceName ?? record.email ?? record.changeType ?? record.summary ?? record.value ?? "Record",
		)
		row.dataset.customerName = titleText
		const details = document.createElement("p")
		details.textContent = Object.entries(record)
			.filter(([key]) => !["serviceName", "styleName", "title", "subject", "name", "email", "value", "user", "linkedBooking"].includes(key))
			.map(([key, value]) => `${key}: ${formatAdminSnapshotValue(value)}`)
			.join(" · ")

		if (isBooking || isWaitlist) {
			const header = document.createElement("div")
			header.className = isWaitlist ? "admin-review-item-head" : "admin-booking-item-head"
			const identity = document.createElement("div")
			const name = document.createElement("div")
			name.className = "admin-booking-name"
			name.textContent = titleText
			if (isWaitlist && record.queuePosition !== undefined) {
				const queueLabel = String(record.queuePositionLabel ?? "").trim()
				if (queueLabel) {
					const nameRow = document.createElement("div")
					nameRow.className = "admin-booking-name-row"
					const queueChip = document.createElement("span")
					queueChip.className = "waitlist-queue-chip admin-waitlist-queue-chip"
					const rank = document.createElement("span")
					rank.className = "waitlist-queue-chip__rank"
					rank.textContent = queueLabel
					const label = document.createElement("span")
					label.className = "waitlist-queue-chip__text"
					label.textContent = "in queue"
					queueChip.append(rank, label)
					if (record.queueSize) {
						const size = document.createElement("span")
						size.className = "waitlist-queue-chip__size"
						size.textContent = `of ${String(record.queueSize)}`
						queueChip.append(size)
					}
					nameRow.append(name, queueChip)
					identity.append(nameRow)
				} else {
					identity.append(name)
				}
			} else {
				identity.append(name)
			}
			const idLine = document.createElement("div")
			idLine.className = "admin-booking-id"
			idLine.textContent = `${isWaitlist ? "Waitlist" : "Booking"} ID: ${String(record.id ?? "N/A")}`
			identity.append(idLine)
			if (isWaitlist && typeof record.linkedBooking === "object" && record.linkedBooking !== null) {
				const linkedId = (record.linkedBooking as AdminSnapshotRecord).id
				if (typeof linkedId === "string" && linkedId) {
					const linkedBooking = document.createElement("div")
					linkedBooking.className = "admin-booking-id"
					linkedBooking.textContent = `Linked Booking: ${linkedId}`
					identity.append(linkedBooking)
				}
			}
			const statusBadge = document.createElement("span")
			const statusClass = String(record.status ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "-")
			statusBadge.className = `admin-status-badge admin-status-${statusClass}`
			statusBadge.textContent = String(record.status ?? "Unknown")
				.replace(/[_-]+/g, " ")
				.replace(/\b\w/g, (letter) => letter.toUpperCase())
			header.append(identity, statusBadge)
			row.append(header)

			const meta = document.createElement("div")
			meta.className = isWaitlist ? "admin-review-meta" : "admin-booking-meta"
			const fields: Array<[string, unknown]> = isWaitlist
				? [["Waitlist Place", record.queuePositionLabel ? `${String(record.queuePositionLabel)}${record.queueSize ? ` of ${String(record.queueSize)}` : ""}` : "N/A"], ["Waitlist Status", record.status], ["Service", record.serviceName ?? record.service], ["Stylist", record.preferredStylist ?? "Any Available"], ["Preferred date", record.preferredDate], ["Preferred time", record.preferredTime], ["Slot ID", record.preferredSlotId ?? "N/A"], ["Email", record.email], ["Phone", record.phone], ["Joined", record.createdAt], ["Updated", record.updatedAt], ["Notified", record.notifiedAt], ["Notification channel", record.notificationChannel]]
				: [["Service", record.serviceName || record.service || "N/A"], ["Stylist", typeof record.stylist === "object" && record.stylist !== null ? (record.stylist as AdminSnapshotRecord).name : record.stylistName ?? record.stylist ?? "Any Available"], ["Date", record.appointmentDate || record.date || "N/A"], ["Time", record.timeLabel || record.time || "N/A"], ["Email", record.email || "N/A"], ["Phone", record.phone || "N/A"], ["WhatsApp", record.whatsappStatus || "pending"], ["Reminder sent", record.reminderSentAt || "Not sent"]]
			for (const [label, value] of fields) {
				if (value === null || value === undefined || value === "") continue
				const field = document.createElement("div")
				const fieldLabel = document.createElement("span")
				fieldLabel.textContent = `${label}: `
				field.append(fieldLabel)
				if (label === "Email" || label === "Phone") {
					const link = document.createElement("a")
					link.className = "admin-inline-link"
					link.href = `${label === "Email" ? "mailto:" : "tel:"}${String(value)}`
					link.textContent = String(value)
					field.append(link)
				} else {
					const dateField = ["Joined", "Updated", "Notified", "Date", "Preferred date", "Reminder sent"].includes(label)
					const dateWithTime = ["Joined", "Updated", "Notified", "Reminder sent"].includes(label)
					field.append(document.createTextNode(dateField ? formatAdminSnapshotDate(value, dateWithTime) : formatAdminSnapshotValue(value)))
				}
				meta.append(field)
			}
			row.append(meta)
			const notes = String(record.specialRequests ?? record.notes ?? "").trim()
			const request = document.createElement("div")
			request.className = "admin-booking-special-request"
			const requestLabel = document.createElement("span")
			requestLabel.textContent = isWaitlist ? "Waitlist notes:" : "Special request:"
			const requestText = document.createElement("p")
			requestText.textContent = notes || (isWaitlist ? "No notes provided." : "No special request provided.")
			request.append(requestLabel, requestText)
			row.append(request)
		} else if (isGallery || isBlog) {
			const media = document.createElement("div")
			media.className = isGallery ? "admin-gallery-thumb-wrap" : "admin-blog-thumb-wrap"
			const imageUrl = typeof record.imageUrl === "string" ? record.imageUrl.trim() : ""
			let safeImageUrl = ""
			try {
				const parsed = new URL(imageUrl, window.location.origin)
				if (parsed.protocol === "http:" || parsed.protocol === "https:") safeImageUrl = parsed.href
			} catch { /* Leave the legacy no-image placeholder in place. */ }
			if (safeImageUrl) {
				const image = document.createElement("img")
				image.className = isGallery ? "admin-gallery-thumb" : "admin-blog-thumb"
				image.src = safeImageUrl
				image.alt = titleText
				image.loading = "lazy"
				image.decoding = "async"
				media.append(image)
			} else {
				const placeholder = document.createElement("div")
				placeholder.className = isGallery ? "admin-gallery-thumb admin-gallery-thumb--empty" : "admin-blog-thumb admin-blog-thumb--empty"
				placeholder.textContent = "No Image"
				media.append(placeholder)
			}
			if (isGallery && (record.beforeImageUrl || record.beforeImage)) {
				const badge = document.createElement("span")
				badge.className = "admin-gallery-badge"
				badge.textContent = "Before & After"
				media.append(badge)
			}
			const content = document.createElement("div")
			content.className = isGallery ? "admin-gallery-content" : "admin-blog-content"
			const heading = document.createElement("h4")
			heading.textContent = titleText
			content.append(heading)
			if (isBlog) {
				const meta = document.createElement("div")
				meta.className = "admin-blog-meta"
				meta.textContent = [record.publishDate, record.readTime].filter(Boolean).map(formatAdminSnapshotValue).join(" · ")
				content.append(meta)
			}
			const summary = document.createElement("p")
			summary.textContent = isBlog
				? String(record.excerpt ?? "")
				: [record.serviceCategory ?? record.category, record.styleType, record.stylistName ? `Stylist: ${String(record.stylistName)}` : "", record.timeTaken ? `Time: ${String(record.timeTaken)}` : ""]
					.filter(Boolean)
					.map(formatAdminSnapshotValue)
					.join(" · ") || String(record.serviceName ?? "Salon style")
			content.append(summary)
			if (isGallery) {
				const tags = document.createElement("div")
				tags.className = "admin-gallery-tags"
				for (const [key, label] of [["featuredTrending", "Trending"], ["featuredMostBooked", "Most Booked"], ["priceRange", String(record.priceRange ?? "")]] as const) {
					if (record[key] !== true && (key !== "priceRange" || !label)) continue
					const tag = document.createElement("span")
					tag.textContent = label
					tags.append(tag)
				}
				content.append(tags)
			}
			if (isBlog && typeof record.readMoreUrl === "string") {
				try {
					const articleUrl = new URL(record.readMoreUrl, window.location.origin)
					if (articleUrl.protocol === "http:" || articleUrl.protocol === "https:") {
						const link = document.createElement("a")
						link.className = "admin-inline-link"
						link.href = articleUrl.href
						link.target = "_blank"
						link.rel = "noopener"
						link.textContent = "Open Article"
						content.append(link)
					}
				} catch { /* Ignore malformed legacy article links. */ }
			}
			row.append(media, content)
		} else if (isMessage || isReview) {
			const header = document.createElement("div")
			header.className = "admin-review-item-head"
			const name = document.createElement("div")
			name.className = "admin-booking-name"
			name.textContent = titleText
			const statusBadge = document.createElement("span")
			const statusClass = String(record.status ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "-")
			statusBadge.className = `admin-status-badge admin-status-${statusClass}`
			statusBadge.textContent = String(record.status ?? "Unknown")
			header.append(name, statusBadge)
			row.append(header)
			const meta = document.createElement("div")
			meta.className = "admin-review-meta"
			meta.textContent = [record.email, record.subject, record.createdAt, record.updatedAt]
				.filter(Boolean)
				.map(formatAdminSnapshotValue)
				.join(" · ")
			row.append(meta)
			const message = document.createElement("div")
			message.className = "admin-booking-special-request"
			const messageLabel = document.createElement("span")
			messageLabel.textContent = isMessage ? "Message received:" : "Review:"
			const messageText = document.createElement("p")
			messageText.textContent = String(record.message ?? record.text ?? "No content provided.")
			message.append(messageLabel, messageText)
			row.append(message)
		} else if (isSecurity) {
			const identityCell = document.createElement("td")
			const title = document.createElement("strong")
			const securityUser = record.user && typeof record.user === "object"
				? (record.user as AdminSnapshotRecord)
				: {}
			const identityLabel = String(
				securityUser.name ?? record.displayName ?? record.email ??
				record.userId ?? record.uid ?? "Unknown user",
			)
			title.textContent = elementId === "adminSecurityAlertsList"
				? String(record.message ?? "Security alert")
				: elementId === "adminAccountHistoryList"
					? String(record.changeLabel ?? (typeof record.changeType === "string"
						? record.changeType.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
						: "Account updated"))
					: elementId === "adminTimelineList"
						? formatAdminSnapshotValue(record.createdAt ?? record.updatedAt ?? "")
						: identityLabel
			identityCell.append(title)
			const email = String(securityUser.email ?? record.email ?? record.attemptedEmail ?? "").trim()
			if (email && email !== identityLabel && elementId !== "adminSecurityAlertsList") {
				const emailLine = document.createElement("div")
				emailLine.className = "admin-booking-id"
				emailLine.textContent = email
				identityCell.append(emailLine)
			}
			const textCell = (value: unknown): HTMLTableCellElement => {
				const cell = document.createElement("td")
				cell.textContent = formatAdminSnapshotValue(value) || "—"
				return cell
			}
			const statusCell = (value: unknown, className?: string): HTMLTableCellElement => {
				const cell = document.createElement("td")
				const state = String(value ?? "Recorded")
				const badge = document.createElement("span")
				badge.className = `admin-status ${className ?? `admin-status-${state.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`}`
				badge.textContent = state
				cell.append(badge)
				return cell
			}
			if (elementId === "adminSecurityActivityList") {
				const userAgent = String(record.userAgent ?? "")
				const device = row.dataset.device === "mobile" ? "Mobile" : row.dataset.device === "tablet" ? "Tablet" : row.dataset.device === "desktop" ? "Desktop" : "Unknown"
				const browser = /edg\//i.test(userAgent) ? "Edge" : /firefox\//i.test(userAgent) ? "Firefox" : /chrome\//i.test(userAgent) ? "Chrome" : /safari\//i.test(userAgent) ? "Safari" : "Unknown"
				const identityKey = String(record.userId ?? record.email ?? "").toLowerCase()
				const createdAt = Date.parse(String(record.createdAt ?? "")) || 0
				const failedIn = (minutes: number) => items.filter((candidate) => {
					if (typeof candidate !== "object" || candidate === null) return false
					const item = candidate as AdminSnapshotRecord
					return String(item.status ?? "").toLowerCase() === "failure" &&
						String(item.userId ?? item.email ?? "").toLowerCase() === identityKey &&
						(Date.parse(String(item.createdAt ?? "")) || 0) >= createdAt - minutes * 60_000 &&
						(Date.parse(String(item.createdAt ?? "")) || 0) <= createdAt
				}).length
				const user = record.user && typeof record.user === "object" ? (record.user as AdminSnapshotRecord) : {}
				const blockedUntil = user.blockedUntil ? Date.parse(String(user.blockedUntil)) : 0
				const state = String(record.status ?? "unknown").toLowerCase()
				const risk = String(record.riskLevel ?? "unknown").toUpperCase()
				const suspicious = ["medium", "high"].includes(String(record.riskLevel ?? "").toLowerCase())
				row.append(
					identityCell,
					textCell(record.provider),
					textCell(`${device} ${browser}`),
					textCell(record.country),
					textCell("Private"),
					statusCell(state, state === "success" ? "admin-status-completed" : "admin-status-cancelled"),
					textCell(`${failedIn(5)}/5m • ${failedIn(15)}/15m`),
					textCell(blockedUntil > Date.now() ? `Active until ${formatAdminSnapshotDate(user.blockedUntil, true)}` : "No"),
					textCell(`${risk} (${String(record.riskScore ?? "—")})`),
					textCell(suspicious ? "Flagged" : "No"),
					textCell(record.userId ? "See below" : "No linked account"),
					textCell(formatAdminSnapshotDate(record.createdAt, true)),
				)
			} else if (elementId === "adminSecurityAlertsList") {
				const userCell = textCell(identityLabel)
				const severity = String(record.severity ?? "unknown")
				const severityCell = statusCell(severity, severity.toLowerCase() === "high" ? "admin-status-cancelled" : "admin-status-pending")
				const state = record.resolvedAt ? "resolved" : "open"
				const stateCell = statusCell(state, state === "resolved" ? "admin-status-completed" : "admin-status-pending")
				if (state === "open" && typeof record.id === "string") {
					const resolve = document.createElement("button")
					resolve.type = "button"
					resolve.className = "admin-action-btn admin-platform-action"
					resolve.dataset.adminAction = "security-resolve-alert"
					resolve.dataset.adminId = record.id
					resolve.textContent = "Resolve"
					stateCell.append(resolve)
				}
				row.append(identityCell, userCell, severityCell, stateCell, textCell(formatAdminSnapshotDate(record.createdAt, true)))
			} else if (elementId === "adminSessionsList") {
				const userCount = items.filter((candidate) => typeof candidate === "object" && candidate !== null && String((candidate as AdminSnapshotRecord).userId ?? "") === String(record.userId ?? "")).length
				row.append(
					textCell(identityLabel),
					textCell("Not tracked"),
					statusCell("online", "admin-status-confirmed"),
					textCell("Not tracked"),
					textCell("Not tracked"),
					textCell(`${userCount} active ${userCount === 1 ? "device" : "devices"}`),
				)
			} else if (elementId === "adminAccountHistoryList") {
				row.append(identityCell, textCell(identityLabel), textCell(record.summary ?? record.details), textCell(formatAdminSnapshotDate(record.createdAt, true)))
			} else {
				const type = String(record.eventType ?? "activity").toLowerCase()
				const typeLabel = type.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
				row.append(
					textCell(formatAdminSnapshotDate(record.createdAt, true)),
					statusCell(typeLabel, type.startsWith("booking") ? "admin-status-completed" : type.startsWith("review") ? "admin-status-pending" : "admin-status-confirmed"),
					textCell(identityLabel),
					textCell(record.summary),
				)
			}
		} else {
			const title = document.createElement("strong")
			title.textContent = titleText
			row.append(title, details)
		}
		const inspirationImageUrl =
			typeof (record.inspirationImageUrl ?? record.inspirationImage ?? record.referenceImageUrl) === "string"
				? String(record.inspirationImageUrl ?? record.inspirationImage ?? record.referenceImageUrl).trim()
				: ""
		if (inspirationImageUrl && !isGallery && !isBlog) {
			try {
				const safeUrl = new URL(inspirationImageUrl, window.location.origin)
				if (safeUrl.protocol === "http:" || safeUrl.protocol === "https:") {
					const imageLink = document.createElement("a")
					imageLink.className = isBooking || isWaitlist ? "admin-booking-inspiration-link" : "admin-inline-link"
					imageLink.href = safeUrl.href
					imageLink.target = "_blank"
					imageLink.rel = "noopener noreferrer"
					if (isBooking || isWaitlist) {
						const inspiration = document.createElement("div")
						inspiration.className = "admin-booking-inspiration"
						const inspirationMeta = document.createElement("div")
						const inspirationLabel = document.createElement("span")
						inspirationLabel.textContent = "Inspiration Image: "
						const fullImageLink = document.createElement("a")
						fullImageLink.className = "admin-inline-link"
						fullImageLink.href = safeUrl.href
						fullImageLink.target = "_blank"
						fullImageLink.rel = "noopener noreferrer"
						fullImageLink.textContent = "Open full image"
						inspirationMeta.append(inspirationLabel, fullImageLink)
						inspiration.append(inspirationMeta)
						const image = document.createElement("img")
						image.className = "admin-booking-inspiration-image"
						image.src = safeUrl.href
						image.alt = `Inspiration image for ${customerName}`
						image.loading = "lazy"
						image.decoding = "async"
						imageLink.append(image)
						inspiration.append(imageLink)
						row.append(inspiration)
					} else {
						imageLink.textContent = "Open inspiration image"
					}
					row.append(imageLink)
				}
			} catch {
				// Ignore malformed legacy image URLs.
			}
		}
		if ((isBooking || isWaitlist) && !inspirationImageUrl) {
			const inspiration = document.createElement("div")
			inspiration.className = "admin-booking-inspiration"
			const inspirationLabel = document.createElement("span")
			inspirationLabel.textContent = "Inspiration Image: "
			inspiration.append(inspirationLabel, document.createTextNode("Not provided"))
			row.append(inspiration)
		}
		const recordId =
			elementId === "adminAdminsList" && typeof record.userId === "string"
				? record.userId
				: typeof record.id === "string"
					? record.id
					: ""
		const status = typeof record.status === "string" ? record.status : ""
		const actionGroup = document.createElement("div")
		actionGroup.className = isGallery || isBlog
			? "admin-gallery-actions admin-platform-actions"
			: isSecurity
				? "admin-booking-actions admin-security-inline-actions admin-platform-actions"
				: "admin-booking-actions admin-platform-actions"
		if (recordId && !isSecurity) {
			const detailButton = document.createElement("button")
			detailButton.type = "button"
			detailButton.className = "admin-action-btn admin-platform-detail"
			detailButton.dataset.adminDetail = JSON.stringify(record)
			detailButton.textContent = "Details"
			actionGroup.append(detailButton)
		}
		const addAction = (
			action: string,
			label: string,
			extra: Record<string, string> = {},
			actionId = recordId,
		) => {
			if (!actionId) return
			const button = document.createElement("button")
			button.type = "button"
			button.className = `admin-action-btn admin-platform-action${action.endsWith("-delete") ? " danger" : ""}`
			button.dataset.adminAction = action
			button.dataset.adminId = actionId
			button.dataset.adminDetail = JSON.stringify(record)
			Object.entries(extra).forEach(([key, value]) => {
				button.dataset[key] = value
			})
			button.textContent = label
			actionGroup.append(button)
		}
		if (elementId === "adminBookingsList") {
			if (status !== "WAITLISTED") {
				const reminder = document.createElement("button")
				reminder.type = "button"
				reminder.className = "admin-action-btn admin-platform-action"
				reminder.dataset.adminAction = "manual-whatsapp-reminder"
				reminder.dataset.adminId = recordId
				reminder.dataset.name = titleText
				reminder.dataset.service = String(record.serviceName ?? record.service ?? "[Service name]")
				reminder.dataset.price = String(record.price ?? record.priceRange ?? "[Price]")
				reminder.dataset.date = String(record.appointmentDate ?? record.date ?? "[Appointment date]")
				reminder.dataset.time = String(record.timeLabel ?? record.time ?? "[Appointment time]")
				const reminderIcon = document.createElement("i")
				reminderIcon.className = "fab fa-whatsapp"
				reminderIcon.setAttribute("aria-hidden", "true")
				reminder.append(reminderIcon, document.createTextNode(" Send WhatsApp Reminder"))
				actionGroup.append(reminder)
			}
			if (status === "PENDING") {
				addAction("booking-status", "Confirm", { status: "CONFIRMED" })
				addAction("booking-status", "Cancel + Release Slot", { status: "CANCELLED" })
			} else if (status === "CONFIRMED") {
				addAction("booking-status", "Complete + Release Slot", { status: "COMPLETED" })
				addAction("booking-status", "Cancel + Release Slot", { status: "CANCELLED" })
			} else if (status === "WAITLISTED") {
				const waitlistEntry = record.waitlistEntry
				const waitlistEntryId =
					typeof waitlistEntry === "object" && waitlistEntry !== null &&
					"id" in waitlistEntry && typeof waitlistEntry.id === "string"
						? waitlistEntry.id
						: ""
				if (waitlistEntryId) {
					addAction("waitlist-convert", "Move to Confirmed", {}, waitlistEntryId)
				} else {
					const note = document.createElement("span")
					note.className = "admin-empty-state"
					note.textContent = "This booking is not linked to an actionable waitlist entry."
					actionGroup.append(note)
				}
			}
		}
		if (elementId === "adminWaitlistList") {
			const normalizedStatus = status.toUpperCase()
			const isActiveWaitlistStatus = [
				"WAITING",
				"NOTIFIED",
				"CONTACTED",
				"NOTIFICATION_FAILED",
			].includes(status)
			const linkedBooking = record.linkedBooking
			const linkedBookingStatus =
				typeof linkedBooking === "object" &&
				linkedBooking !== null &&
				"status" in linkedBooking &&
				typeof linkedBooking.status === "string"
					? linkedBooking.status
					: ""
			const isQueued = isActiveWaitlistStatus
			const linkedBookingId = typeof record.linkedBookingId === "string" ? record.linkedBookingId : ""
			const linkedBookingIsWaitlisted = linkedBookingStatus.toUpperCase() === "WAITLISTED"
			const linkedBookingBlocksStatusOnlyActions = Boolean(linkedBookingId) && !linkedBookingIsWaitlisted
			if (isQueued && linkedBookingIsWaitlisted) {
				addAction("waitlist-convert", "Move to Confirmed (Locks Slot)")
			} else if (isQueued) {
				const disabledMove = document.createElement("button")
				disabledMove.type = "button"
				disabledMove.className = "admin-action-btn"
				disabledMove.disabled = true
				disabledMove.title = linkedBookingId
					? `Move to Confirmed is unavailable because the linked booking is already ${linkedBookingStatus.toLowerCase()}.`
					: "Move to Confirmed requires a linked waitlisted booking so the preferred slot can be locked."
				disabledMove.textContent = "Move to Confirmed (Locks Slot)"
				actionGroup.append(disabledMove)
			}
			if (isQueued && !linkedBookingBlocksStatusOnlyActions) {
				if (normalizedStatus !== "WAITING")
					addAction("waitlist-status", "Set Waiting", { status: "WAITING" })
				if (["WAITING", "NOTIFIED", "NOTIFICATION_FAILED"].includes(normalizedStatus))
					addAction("waitlist-status", "Mark Contacted", { status: "CONTACTED" })
				if (!linkedBookingIsWaitlisted)
					addAction("waitlist-status", "Mark Booked / Close Waitlist", { status: "BOOKED" })
				addAction("waitlist-status", "Cancel Request", { status: "CANCELLED" })
			}
		}
		if (elementId === "adminContactList") {
			if (status !== "NEW")
				addAction("message-status", "Mark new", { status: "NEW" })
			if (status !== "READ")
				addAction("message-status", "Mark read", { status: "READ" })
			if (status !== "RESOLVED")
				addAction("message-status", "Resolve", { status: "RESOLVED" })
			addAction("message-delete", "Delete")
		}
		if (elementId === "adminReviewsList") {
			if (status !== "PENDING")
				addAction("review-update", "Set pending", { status: "PENDING" })
			addAction("review-update", "Approve", { status: "APPROVED" })
			addAction("review-update", "Reject", { status: "REJECTED" })
			addAction(
				"review-update",
				record.featured === true ? "Unfeature" : "Feature",
				{ featured: String(record.featured !== true) },
			)
			addAction("review-delete", "Delete")
		}
		if (elementId === "adminGalleryList") {
			addAction("gallery-edit", "Edit")
			addAction(
				"gallery-publication",
				record.published === true ? "Unpublish" : "Publish",
				{ published: String(record.published !== true) },
			)
			addAction("gallery-delete", "Delete")
		}
		if (elementId === "adminBlogsList") {
			addAction("blog-edit", "Edit")
			addAction(
				"blog-publication",
				record.published === true ? "Unpublish" : "Publish",
				{ published: String(record.published !== true) },
			)
			addAction("blog-delete", "Delete")
		}
		if (elementId === "adminAdminsList")
			addAction("team-member-remove", "Remove")
		if (isSecurityCollection) {
			if (elementId === "adminSecurityActivityList") {
				if (typeof record.userId === "string" && record.userId) {
					addAction("security-restrict-user", "Temp Block")
					addAction("security-force-logout", "Force Logout", {}, record.userId)
					addAction("security-force-password-reset", "Force Password Reset", {}, record.userId)
					addAction("security-clear-restriction", "Clear Restrictions", {}, record.userId)
				} else {
					const unavailable = document.createElement("span")
					unavailable.textContent = "No linked account for security actions"
					actionGroup.append(unavailable)
				}
				const actionRow = document.createElement("tr")
				actionRow.className = "admin-security-row-actions"
				const actionCell = document.createElement("td")
				actionCell.colSpan = 12
				actionCell.append(actionGroup)
				actionRow.append(actionCell)
				securityRows?.append(row, actionRow)
			} else {
				securityRows?.append(row)
			}
		} else {
			row.append(actionGroup)
			element.append(row)
		}
	})
}

function formatAdminSnapshotValue(value: unknown): string {
	if (value === null || value === undefined) return ""
	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	)
		return String(value)
	if (Array.isArray(value))
		return value.map(formatAdminSnapshotValue).join(", ")
	return JSON.stringify(value)
}

function formatAdminSnapshotDate(value: unknown, includeTime = false): string {
	if (!value) return "N/A"
	const raw = String(value).trim()
	if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
		const [year, month, day] = raw.split("-").map(Number)
		return new Date(year, month - 1, day).toLocaleDateString()
	}
	const parsed = new Date(raw)
	if (Number.isNaN(parsed.getTime())) return raw
	return includeTime ? parsed.toLocaleString() : parsed.toLocaleDateString()
}

function formField(form: HTMLFormElement, id: string): string {
	const element = form.querySelector<
		HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
	>(`#${id}`)
	return element?.value.trim() ?? ""
}

function bindImageSizeGuard(): () => void {
	const handleChange = (event: Event) => {
		const input = event.target
		if (!(input instanceof HTMLInputElement) || input.type !== "file") return
		const file = input.files?.[0]
		if (!file || file.size <= 1024 * 1024) return
		input.value = ""
		event.stopPropagation()
		window.alert(IMAGE_TOO_LARGE_MESSAGE)
	}
	document.addEventListener("change", handleChange, true)
	return () => document.removeEventListener("change", handleChange, true)
}

function setFormField(form: HTMLFormElement, id: string, value: unknown): void {
	const element = form.querySelector<
		HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
	>(`#${id}`)
	if (element)
		element.value = typeof value === "string" ? value : String(value ?? "")
}

async function uploadLegacyAdminImage(
	tenantSlug: string,
	file: File,
	kind: "GALLERY" | "BLOG",
): Promise<string> {
	const imageError = getImageUploadError(file.size, file.type)
	if (imageError) throw new Error(imageError)
	const prepare = await fetch(
		`/api/manage/${encodeURIComponent(tenantSlug)}/media`,
		{
			method: "POST",
			credentials: "same-origin",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				fileName: file.name,
				mimeType: file.type,
				byteSize: file.size,
				kind,
			}),
		},
	)
	const prepared = (await prepare.json()) as {
		readonly uploadUrl?: string
		readonly assetId?: string
		readonly error?: string
	}
	if (!prepare.ok || !prepared.uploadUrl || !prepared.assetId)
		throw new Error(prepared.error ?? "The image upload could not be prepared.")
	const uploaded = await fetch(prepared.uploadUrl, {
		method: "PUT",
		headers: { "content-type": file.type },
		body: file,
	})
	if (!uploaded.ok)
		throw new Error("The image could not be uploaded to storage.")
	const finalized = await fetch(
		`/api/manage/${encodeURIComponent(tenantSlug)}/media`,
		{
			method: "PATCH",
			credentials: "same-origin",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ assetId: prepared.assetId }),
		},
	)
	const result = (await finalized.json()) as {
		readonly publicUrl?: string | null
		readonly error?: string
	}
	if (!finalized.ok || !result.publicUrl)
		throw new Error(
			result.error ?? "The uploaded image has no public URL configured.",
		)
	return result.publicUrl
}

function bindLegacyContentForms(tenantSlug: string): () => void {
	const removers: Array<() => void> = []
	const message = (id: string, text: string, error = false) => {
		const element = document.getElementById(id)
		if (!element) return
		element.textContent = text
		element.classList.toggle("error", error)
		element.classList.toggle("success", !error)
		element.style.display = "block"
	}
	const galleryForm = document.getElementById("adminGalleryForm")
	let galleryPreviewObjectUrl = ""
	let galleryPreviewFile: File | null = null
	const setGalleryText = (id: string, value: string): void => {
		const element = document.getElementById(id)
		if (element) element.textContent = value
	}
	const updateGalleryPreview = (): void => {
		if (!(galleryForm instanceof HTMLFormElement)) return
		const styleName = formField(galleryForm, "galleryStyleName")
		const styleType = formField(galleryForm, "galleryStyleType")
		const serviceName = formField(galleryForm, "galleryServiceName")
		const serviceCategory =
			formField(galleryForm, "galleryServiceCategory") || "braids-services"
		const length = formField(galleryForm, "galleryLength")
		const size = formField(galleryForm, "gallerySize")
		const priceRange = formField(galleryForm, "galleryPriceRange")
		const hairServiceType = formField(galleryForm, "galleryHairServiceType")
		const hairTechnique = formField(galleryForm, "galleryHairTechnique")
		const stylist = formField(galleryForm, "galleryStylistName")
		const timeTaken = formField(galleryForm, "galleryTimeTaken")
		setGalleryText("adminGalleryPreviewName", styleName || "Style name preview")
		const serviceLabel =
			serviceName ||
			(
				{
					"braids-services": "Braids",
					"hair-services": "Hair",
					"beauty-spa-services": "Beauty Spa",
					"nail-services": "Nails",
					"makeup-services": "Makeup",
					"barber-services": "Barber",
					"massage-wellness": "Massage",
					"eyebrow-lash-services": "Eyebrows & Lash",
					"bridal-event-packages": "Bridal / Event Packages",
					"cosmetics-products": "Cosmetics",
				} as Readonly<Record<string, string>>
			)[serviceCategory] ||
			"Braids"
		const previewMeta =
			serviceCategory === "braids-services"
				? `${serviceLabel} • ${styleType || "Type"} • ${length || "Length"} • ${size || "Size"}`
				: serviceCategory === "hair-services"
					? `${serviceLabel} • ${styleType || hairServiceType || "Type"} • ${hairTechnique || "Technique"}`
					: `${serviceLabel} • ${styleType || "Type"}`
		setGalleryText("adminGalleryPreviewMeta", previewMeta)
		setGalleryText(
			"adminGalleryPreviewDetails",
			`Stylist: ${stylist || "N/A"} • Time: ${timeTaken || "N/A"}`,
		)
		const file =
			galleryForm.querySelector<HTMLInputElement>("#galleryMainImage")
				?.files?.[0] ?? null
		if (file !== galleryPreviewFile) {
			if (galleryPreviewObjectUrl) URL.revokeObjectURL(galleryPreviewObjectUrl)
			galleryPreviewObjectUrl = file ? URL.createObjectURL(file) : ""
			galleryPreviewFile = file
		}
		const previewImage = document.getElementById("adminGalleryPreviewImage")
		const placeholder = document.getElementById(
			"adminGalleryPreviewPlaceholder",
		)
		const imageUrl = file
			? galleryPreviewObjectUrl
			: (galleryForm.dataset.imageUrl ?? "")
		if (previewImage instanceof HTMLImageElement && imageUrl) {
			previewImage.src = imageUrl
			previewImage.style.display = "block"
			if (placeholder) placeholder.style.display = "none"
		} else {
			if (previewImage instanceof HTMLImageElement) {
				previewImage.removeAttribute("src")
				previewImage.style.display = "none"
			}
			if (placeholder) placeholder.style.display = "block"
		}
		const hasBefore = Boolean(
			galleryForm.querySelector<HTMLInputElement>("#galleryBeforeImage")
				?.files?.[0] || galleryForm.dataset.beforeImageUrl,
		)
		const badge = document.getElementById("adminGalleryPreviewBeforeAfterBadge")
		if (badge) badge.style.display = hasBefore ? "inline-flex" : "none"
		const previewTags = document.getElementById("adminGalleryPreviewTags")
		if (previewTags) {
			const tags = [
				...(galleryForm.querySelector<HTMLInputElement>(
					"#galleryFeaturedTrending",
				)?.checked
					? ["Trending"]
					: []),
				...(galleryForm.querySelector<HTMLInputElement>(
					"#galleryFeaturedMostBooked",
				)?.checked
					? ["Most Booked"]
					: []),
				...(priceRange ? [priceRange] : []),
			]
			previewTags.replaceChildren(
				...(tags.length
					? tags.map((tag) => {
							const element = document.createElement("span")
							element.className = "admin-gallery-preview-tag"
							element.textContent = tag
							return element
						})
					: (() => {
							const element = document.createElement("span")
							element.className = "admin-gallery-preview-tag is-empty"
							element.textContent = "No tags yet"
							return [element]
						})()),
			)
		}
		const checks: Readonly<Record<string, boolean>> = {
			styleName: Boolean(styleName),
			styleType: Boolean(styleType),
			stylistName: Boolean(stylist),
			timeTaken: Boolean(timeTaken),
			mainImage: Boolean(imageUrl),
		}
		let complete = 0
		Object.entries(checks).forEach(([key, checked]) => {
			const item = galleryForm.querySelector<HTMLElement>(
				`[data-check="${key}"]`,
			)
			item?.classList.toggle("completed", checked)
			item?.querySelector(".check-dot")?.classList.toggle("completed", checked)
			if (checked) complete += 1
		})
		setGalleryText(
			"adminGalleryChecklistProgressText",
			`${complete}/5 completed`,
		)
		const fill = document.getElementById("adminGalleryChecklistProgressFill")
		if (fill instanceof HTMLElement) fill.style.width = `${complete * 20}%`
	}
	const updateGalleryHairFields = (): void => {
		if (!(galleryForm instanceof HTMLFormElement)) return
		const isHair =
			formField(galleryForm, "galleryServiceCategory") === "hair-services"
		const rules = getHairGalleryFieldRules(
			formField(galleryForm, "galleryHairServiceType"),
		)
		const fields = [
			{
				id: "galleryHairTechnique",
				visible: rules.showTechnique,
				required: rules.requireTechnique,
			},
			{
				id: "galleryHairLengthDensity",
				visible: rules.showLengthDensity,
				required: false,
			},
			{
				id: "galleryHairProductsUsed",
				visible: rules.showProductsUsed,
				required: rules.requireProductsUsed,
			},
		] as const
		for (const field of fields) {
			const control = document.getElementById(field.id)
			const wrapper = control?.closest<HTMLElement>(".admin-hair-field")
			if (!control || !wrapper) continue
			const visible = isHair && field.visible
			wrapper.style.display = visible ? "" : "none"
			if (
				control instanceof HTMLInputElement ||
				control instanceof HTMLSelectElement ||
				control instanceof HTMLTextAreaElement
			) {
				control.required = visible && field.required
				if (!visible) control.value = ""
			}
		}
	}
	const updateGalleryCategory = (category: string): void => {
		if (!(galleryForm instanceof HTMLFormElement)) return
		setFormField(galleryForm, "galleryServiceCategory", category)
		document
			.querySelectorAll<HTMLElement>("[data-admin-gallery-service]")
			.forEach((button) => {
				button.classList.toggle(
					"active",
					button.dataset.adminGalleryService === category,
				)
			})
		const isBraids = category === "braids-services"
		const isHair = category === "hair-services"
		const isCosmetics = category === "cosmetics-products"
		const categoryLabels: Readonly<Record<string, string>> = {
			"braids-services": "Braids",
			"hair-services": "Hair",
			"beauty-spa-services": "Beauty Spa",
			"nail-services": "Nails",
			"makeup-services": "Makeup",
			"barber-services": "Barber",
			"massage-wellness": "Massage",
			"eyebrow-lash-services": "Eyebrows & Lash",
			"bridal-event-packages": "Bridal / Event Packages",
			"cosmetics-products": "Cosmetics",
		}
		const categoryLabel = categoryLabels[category] ?? "Braids"
		const serviceNameInput = document.getElementById("galleryServiceName")
		if (serviceNameInput instanceof HTMLInputElement)
			serviceNameInput.placeholder = `e.g. ${categoryLabel} Style`
		const setLabel = (id: string, text: string): void => {
			const label = document.querySelector<HTMLLabelElement>(
				`label[for="${id}"]`,
			)
			if (label) label.textContent = text
		}
		setLabel(
			"galleryStyleName",
			isCosmetics ? "Product Name *" : "Style Name *",
		)
		setLabel(
			"galleryStyleType",
			isCosmetics ? "Product Type *" : "Style Type *",
		)
		setLabel("galleryPriceRange", isCosmetics ? "Price" : "Price Range")
		setLabel(
			"galleryMainImage",
			isCosmetics ? "Product Image *" : "After (Final Style) Image *",
		)
		const setPlaceholder = (id: string, placeholder: string): void => {
			const control = document.getElementById(id)
			if (control instanceof HTMLInputElement) control.placeholder = placeholder
		}
		setPlaceholder(
			"galleryStyleName",
			isCosmetics
				? "e.g. Nourish & Shine Hair Oil"
				: "e.g. Boho Knotless Braids",
		)
		setPlaceholder(
			"galleryStyleType",
			isCosmetics ? "e.g. Hair Oil" : "e.g. Knotless",
		)
		setPlaceholder(
			"galleryPriceRange",
			isCosmetics ? "e.g. KSh 1,200" : "e.g. KSh 4,000 - 6,000",
		)
		const trendingLabel = document.getElementById(
			"galleryFeaturedTrendingLabel",
		)
		const mostBookedLabel = document.getElementById(
			"galleryFeaturedMostBookedLabel",
		)
		if (trendingLabel) trendingLabel.textContent = `Trending ${categoryLabel}`
		if (mostBookedLabel)
			mostBookedLabel.textContent = `Most Booked ${categoryLabel}`
		const setGroupVisibility = (
			selector: string,
			visible: boolean,
			clearWhenHidden: boolean,
		): void => {
			document.querySelectorAll<HTMLElement>(selector).forEach((group) => {
				group.style.display = visible ? "" : "none"
				if (visible || !clearWhenHidden) return
				group
					.querySelectorAll<
						HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
					>("input, select, textarea")
					.forEach((control) => {
						control.required = false
						if (
							control instanceof HTMLInputElement &&
							control.type === "checkbox"
						)
							control.checked = false
						else if (
							!(control instanceof HTMLInputElement && control.type === "file")
						)
							control.value = ""
					})
			})
		}
		setGroupVisibility(".admin-braids-field", isBraids, true)
		setGroupVisibility(".admin-hair-field", isHair, true)
		document
			.querySelectorAll<HTMLElement>(".admin-cosmetics-field")
			.forEach((field) => {
				field.style.display = isCosmetics ? "" : "none"
			})
		for (const [id, visible] of [
			["galleryServiceNameGroup", !isCosmetics],
			["galleryTimeTakenGroup", !isCosmetics],
			["galleryStylistNameGroup", !isCosmetics],
			["galleryBeforeImageGroup", !isCosmetics],
		] as const) {
			const group = document.getElementById(id)
			if (group instanceof HTMLElement)
				group.style.display = visible ? "" : "none"
		}
		const setRequired = (id: string, required: boolean): void => {
			const element = document.getElementById(id)
			if (
				element instanceof HTMLInputElement ||
				element instanceof HTMLSelectElement ||
				element instanceof HTMLTextAreaElement
			)
				element.required = required
		}
		setRequired("galleryServiceName", !isCosmetics)
		setRequired("galleryTimeTaken", !isCosmetics)
		setRequired("galleryStylistName", !isCosmetics)
		setRequired("galleryLength", isBraids)
		setRequired("gallerySize", isBraids)
		setRequired("galleryHairType", isBraids)
		setRequired("galleryHairServiceType", isHair)
		setRequired("galleryHairTechnique", false)
		updateGalleryHairFields()
		updateGalleryPreview()
	}
	if (galleryForm instanceof HTMLFormElement) {
		const refreshGalleryPreview = (): void => {
			updateGalleryHairFields()
			updateGalleryPreview()
		}
		window.addEventListener(
			"admin-gallery-refresh-preview",
			refreshGalleryPreview,
		)
		removers.push(() =>
			window.removeEventListener(
				"admin-gallery-refresh-preview",
				refreshGalleryPreview,
			),
		)
		document
			.querySelectorAll<HTMLElement>("[data-admin-gallery-service]")
			.forEach((button) => {
				const handler = () =>
					updateGalleryCategory(
						button.dataset.adminGalleryService ?? "braids-services",
					)
				button.addEventListener("click", handler)
				removers.push(() => button.removeEventListener("click", handler))
			})
		galleryForm
			.querySelectorAll<
				HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
			>("input, textarea, select")
			.forEach((field) => {
				const handler = () => {
					if (field.id === "galleryHairServiceType") updateGalleryHairFields()
					updateGalleryPreview()
				}
				field.addEventListener("input", handler)
				field.addEventListener("change", handler)
				removers.push(() => {
					field.removeEventListener("input", handler)
					field.removeEventListener("change", handler)
				})
			})
		updateGalleryCategory(
			formField(galleryForm, "galleryServiceCategory") || "braids-services",
		)
	}
	const bind = (
		formId: string,
		handler: (form: HTMLFormElement) => Promise<void>,
	) => {
		const form = document.getElementById(formId)
		if (!(form instanceof HTMLFormElement)) return
		const submit = (event: SubmitEvent) => {
			event.preventDefault()
			const saveButton = form.querySelector<HTMLButtonElement>(
				"button[type=submit]",
			)
			const originalText = saveButton?.textContent ?? "Save"
			if (saveButton instanceof HTMLButtonElement) {
				saveButton.disabled = true
				saveButton.setAttribute("aria-busy", "true")
				saveButton.textContent = formField(
					form,
					formId === "adminGalleryForm"
						? "galleryEditId"
						: formId === "adminBlogsForm"
							? "blogEditId"
							: "adminAdminEditUid",
				)
					? "Updating..."
					: "Saving..."
			}
			void handler(form).catch((error: unknown) => {
				const messageId =
					formId === "adminGalleryForm"
						? "adminGalleryMessage"
						: formId === "adminBlogsForm"
							? "adminBlogsMessage"
							: "adminAdminsMessage"
				message(
					messageId,
					error instanceof Error
						? error.message
						: "The content could not be saved.",
					true,
				)
				if (saveButton instanceof HTMLButtonElement) {
					saveButton.disabled = false
					saveButton.removeAttribute("aria-busy")
					saveButton.textContent = originalText
				}
			})
		}
		form.addEventListener("submit", submit)
		removers.push(() => form.removeEventListener("submit", submit))
	}
	bind("adminGalleryForm", async (form) => {
		const file =
			form.querySelector<HTMLInputElement>("#galleryMainImage")?.files?.[0]
		const imageUrl = file
			? await uploadLegacyAdminImage(tenantSlug, file, "GALLERY")
			: (form.dataset.imageUrl ?? "")
		if (!imageUrl) throw new Error("Select a gallery image before saving.")
		const beforeFile = form.querySelector<HTMLInputElement>(
			"#galleryBeforeImage",
		)?.files?.[0]
		const beforeImageUrl = beforeFile
			? await uploadLegacyAdminImage(tenantSlug, beforeFile, "GALLERY")
			: (form.dataset.beforeImageUrl ?? "")
		const id = formField(form, "galleryEditId")
		const categoryKey =
			formField(form, "galleryServiceCategory") || "braids-services"
		const isBraids = categoryKey === "braids-services"
		const isHair = categoryKey === "hair-services"
		const isCosmetics = categoryKey === "cosmetics-products"
		const hairRules = getHairGalleryFieldRules(
			formField(form, "galleryHairServiceType"),
		)
		const response = await fetch(
			`/api/manage/${encodeURIComponent(tenantSlug)}/actions`,
			{
				method: "POST",
				credentials: "same-origin",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					action: id ? "gallery-update" : "gallery-create",
					id,
					categoryKey,
					styleName: formField(form, "galleryStyleName"),
					imageUrl,
					beforeImageUrl,
					styleType: formField(form, "galleryStyleType"),
					serviceName: isCosmetics
						? "Cosmetics Products"
						: formField(form, "galleryServiceName"),
					length: isBraids ? formField(form, "galleryLength") : "",
					size: isBraids ? formField(form, "gallerySize") : "",
					timeTaken: isCosmetics ? "" : formField(form, "galleryTimeTaken"),
					priceRange: formField(form, "galleryPriceRange"),
					productBrand: isCosmetics
						? formField(form, "galleryProductBrand")
						: "",
					productSize: isCosmetics ? formField(form, "galleryProductSize") : "",
					productDescription: isCosmetics
						? formField(form, "galleryProductDescription")
						: "",
					hairType: isBraids ? formField(form, "galleryHairType") : "",
					hairServiceType: isHair
						? formField(form, "galleryHairServiceType")
						: "",
					hairTechnique: isHair ? formField(form, "galleryHairTechnique") : "",
					hairLengthDensity: isHair
						? formField(form, "galleryHairLengthDensity")
						: "",
					hairProductsUsed:
						isHair && hairRules.showProductsUsed
							? formField(form, "galleryHairProductsUsed")
							: "",
					stylistName: isCosmetics ? "" : formField(form, "galleryStylistName"),
					featuredTrending:
						form.querySelector<HTMLInputElement>("#galleryFeaturedTrending")
							?.checked === true,
					featuredMostBooked:
						form.querySelector<HTMLInputElement>("#galleryFeaturedMostBooked")
							?.checked === true,
					published: true,
				}),
			},
		)
		if (!response.ok) {
			const result = (await response.json()) as { readonly error?: string }
			throw new Error(result.error ?? "The gallery style could not be saved.")
		}
		message(
			"adminGalleryMessage",
			id
				? "Gallery style updated successfully."
				: "Gallery style created successfully.",
		)
		window.setTimeout(() => window.location.reload(), 650)
	})
	bind("adminBlogsForm", async (form) => {
		const file = form.querySelector<HTMLInputElement>("#blogImage")?.files?.[0]
		const imageUrl = file
			? await uploadLegacyAdminImage(tenantSlug, file, "BLOG")
			: (form.dataset.imageUrl ?? "")
		if (!imageUrl) throw new Error("Select a blog image before saving.")
		const title = formField(form, "blogTitle")
		const slug = title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/(^-|-$)/g, "")
		const id = formField(form, "blogEditId")
		const response = await fetch(
			`/api/manage/${encodeURIComponent(tenantSlug)}/actions`,
			{
				method: "POST",
				credentials: "same-origin",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					action: id ? "blog-update" : "blog-create",
					id,
					title,
					slug,
					excerpt: formField(form, "blogExcerpt"),
					imageUrl,
					readTime: formField(form, "blogReadTime"),
					publishDate: formField(form, "blogDate"),
					readMoreUrl: formField(form, "blogReadMoreUrl"),
					published: true,
				}),
			},
		)
		if (!response.ok) {
			const result = (await response.json()) as { readonly error?: string }
			throw new Error(result.error ?? "The blog post could not be saved.")
		}
		window.location.reload()
	})
	bind("adminAdminsForm", async (form) => {
		const email = formField(form, "adminManageEmail")
		const role =
			formField(form, "adminManageRole") === "super_admin" ? "ADMIN" : "STAFF"
		const response = await fetch(
			`/api/manage/${encodeURIComponent(tenantSlug)}/invitations`,
			{
				method: "POST",
				credentials: "same-origin",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					email,
					role,
					canManageAdmins:
						document.getElementById("adminPermManageAdmins") instanceof
							HTMLInputElement &&
						(
							document.getElementById(
								"adminPermManageAdmins",
							) as HTMLInputElement
						).checked,
					canManageBookings:
						document.getElementById("adminPermManageBookings") instanceof
							HTMLInputElement &&
						(
							document.getElementById(
								"adminPermManageBookings",
							) as HTMLInputElement
						).checked,
					canManageContent:
						document.getElementById("adminPermManageContent") instanceof
							HTMLInputElement &&
						(
							document.getElementById(
								"adminPermManageContent",
							) as HTMLInputElement
						).checked,
					canManageSecurity:
						document.getElementById("adminPermManageSecurity") instanceof
							HTMLInputElement &&
						(
							document.getElementById(
								"adminPermManageSecurity",
							) as HTMLInputElement
						).checked,
				}),
			},
		)
		if (!response.ok) {
			const result = (await response.json()) as { readonly error?: string }
			throw new Error(
				result.error ?? "The team invitation could not be created.",
			)
		}
		window.location.reload()
	})
	const cancelMap: ReadonlyArray<readonly [string, string, string]> = [
		["adminGalleryCancelEdit", "adminGalleryForm", "adminGalleryFormTitle"],
		["adminBlogsCancelEdit", "adminBlogsForm", "adminBlogsFormTitle"],
		["adminAdminsCancelEdit", "adminAdminsForm", "adminAdminsFormTitle"],
	]
	cancelMap.forEach(([buttonId, formId, titleId]) => {
		const button = document.getElementById(buttonId)
		const form = document.getElementById(formId)
		if (
			!(button instanceof HTMLButtonElement) ||
			!(form instanceof HTMLFormElement)
		)
			return
		const handler = () => {
			form.reset()
			delete form.dataset.imageUrl
			delete form.dataset.beforeImageUrl
			if (formId === "adminGalleryForm") {
				if (galleryPreviewObjectUrl) {
					URL.revokeObjectURL(galleryPreviewObjectUrl)
					galleryPreviewObjectUrl = ""
				}
				galleryPreviewFile = null
				document
					.querySelector<HTMLButtonElement>(
						'[data-admin-gallery-service="braids-services"]',
					)
					?.click()
				updateGalleryPreview()
			}
			const title = document.getElementById(titleId)
			if (title)
				title.textContent =
					formId === "adminGalleryForm"
						? "Add New Gallery Style"
						: formId === "adminBlogsForm"
							? "Add New Blog"
							: "Create Admin Access"
			button.style.display = "none"
		}
		button.addEventListener("click", handler)
		removers.push(() => button.removeEventListener("click", handler))
	})
	return () => {
		removers.forEach((remove) => remove())
		if (galleryPreviewObjectUrl) URL.revokeObjectURL(galleryPreviewObjectUrl)
		galleryPreviewFile = null
	}
}

function bindAdminSnapshotFilters(): () => void {
	const removers: Array<() => void> = []
	const getValue = (id: string): string => {
		const element = document.getElementById(id)
		return element instanceof HTMLInputElement ||
			element instanceof HTMLSelectElement
			? element.value.trim().toLowerCase()
			: ""
	}
	const apply = () => {
		applyLegacyReviewAndMessageFilters()
		const search = getValue("adminSecuritySearchInput")
		const provider = getValue("adminSecurityProviderFilterSelect")
		const risk = getValue("adminSecurityRiskFilterSelect")
		const country = getValue("adminSecurityCountryFilterInput")
		const status = getValue("adminSecurityStatusFilterSelect")
		const device = getValue("adminSecurityDeviceFilterSelect")
		const user = getValue("adminSecurityUserFilterSelect")
		const from = getValue("adminSecurityDateFromFilter")
		const to = getValue("adminSecurityDateToFilter")
		const exactDate = getValue("adminSecurityDateFilter")
		const rows = document.querySelectorAll<HTMLElement>(
			"#adminSecurityActivityList .admin-snapshot-row",
		)
		rows.forEach((row) => {
			const date = row.dataset.createdAt?.slice(0, 10) ?? ""
			row.hidden = Boolean(
				(search && !row.dataset.searchText?.includes(search)) ||
				(provider && provider !== "all" && row.dataset.provider !== provider) ||
				(risk && risk !== "all" && row.dataset.risk !== risk) ||
				(country && !row.dataset.country?.includes(country)) ||
				(status && status !== "all" && row.dataset.status !== status) ||
				(device && device !== "all" && row.dataset.device !== device) ||
				(user && user !== "all" && row.dataset.userType !== user) ||
				(from && date < from) ||
				(to && date > to) ||
				(exactDate && date !== exactDate),
			)
		})
		const sortRows = (selector: string, mode: string) => {
			const container = document.querySelector<HTMLElement>(selector)
			if (!container) return
			const rows = Array.from(
				container.querySelectorAll<HTMLElement>(".admin-snapshot-row"),
			)
			if (selector === "#adminWaitlistList") {
				const statusPriority: Record<string, number> = {
					waiting: 0,
					notification_failed: 1,
					notified: 2,
					contacted: 2,
					booked: 3,
					cancelled: 4,
				}
				rows.sort((left, right) => {
					if (mode === "oldest")
						return (left.dataset.createdAt ?? "").localeCompare(right.dataset.createdAt ?? "")
					if (mode === "date-time") {
						const leftDate = `${left.dataset.preferredDate ?? "9999"}T${left.dataset.preferredTime ?? "23:59"}`
						const rightDate = `${right.dataset.preferredDate ?? "9999"}T${right.dataset.preferredTime ?? "23:59"}`
						return leftDate.localeCompare(rightDate)
					}
					if (mode === "status-waiting-first") {
						const priorityDiff = (statusPriority[left.dataset.status ?? ""] ?? 9) - (statusPriority[right.dataset.status ?? ""] ?? 9)
						if (priorityDiff !== 0) return priorityDiff
						return (left.dataset.createdAt ?? "").localeCompare(right.dataset.createdAt ?? "")
					}
					if (mode === "name-az")
						return (left.dataset.customerName ?? "").localeCompare(right.dataset.customerName ?? "", undefined, { sensitivity: "base" })
					const leftUpdated = left.dataset.updatedAt || left.dataset.createdAt || ""
					const rightUpdated = right.dataset.updatedAt || right.dataset.createdAt || ""
					return rightUpdated.localeCompare(leftUpdated)
				})
				rows.forEach((row) => container.append(row))
				return
			}
			if (selector === "#adminSessionsList") {
				const sessionCountByUser = new Map<string, number>()
				for (const row of rows) {
					const userId = row.dataset.sessionUserId
					if (userId)
						sessionCountByUser.set(
							userId,
							(sessionCountByUser.get(userId) ?? 0) + 1,
						)
				}
			rows.sort((left, right) => {
				if (mode === "multi-device-first") {
					const leftCount = sessionCountByUser.get(left.dataset.sessionUserId ?? "") ?? 0
					const rightCount = sessionCountByUser.get(right.dataset.sessionUserId ?? "") ?? 0
					if (leftCount !== rightCount) return rightCount - leftCount
				}
				if (mode === "online-first")
					return Number(right.dataset.status === "active") - Number(left.dataset.status === "active")
				// Auth.js JWT sessions do not expose last-active or duration telemetry.
				// Use a timestamp only when the backing snapshot provides one.
				if (mode === "last-active-newest")
					return (right.dataset.lastActiveAt ?? "").localeCompare(left.dataset.lastActiveAt ?? "")
				if (mode === "longest-session")
					return Number(right.dataset.durationSeconds ?? 0) - Number(left.dataset.durationSeconds ?? 0)
				return (right.dataset.createdAt ?? "").localeCompare(left.dataset.createdAt ?? "")
			})
				const destination = container.querySelector<HTMLElement>("tbody") ?? container
				rows.forEach((row) => destination.append(row))
			return
		}
			if (selector === "#adminAccountHistoryList") {
				rows.sort((left, right) => {
					if (mode === "oldest")
						return (left.dataset.createdAt ?? "").localeCompare(right.dataset.createdAt ?? "")
					if (mode === "critical-first") {
					const critical = new Set(["password_changed", "email_changed", "account_deleted", "account_deactivated"])
					const criticalDiff = Number(critical.has(right.dataset.changeType ?? "")) - Number(critical.has(left.dataset.changeType ?? ""))
					if (criticalDiff) return criticalDiff
					}
					if (mode === "type") {
						const typeDiff = (left.dataset.changeType ?? "").localeCompare(right.dataset.changeType ?? "")
						if (typeDiff) return typeDiff
					}
					return (right.dataset.createdAt ?? "").localeCompare(left.dataset.createdAt ?? "")
				})
				const destination = container.querySelector<HTMLElement>("tbody") ?? container
				rows.forEach((row) => destination.append(row))
				return
			}
			if (selector === "#adminTimelineList") {
				rows.sort((left, right) => {
					if (mode === "oldest")
						return (left.dataset.createdAt ?? "").localeCompare(right.dataset.createdAt ?? "")
					const category = (eventType: string | undefined) => {
						const normalized = eventType ?? ""
						if (mode === "bookings-first") return ["booking_created", "booking_canceled"].includes(normalized) ? 0 : 1
						if (mode === "reviews-first") return ["review_posted", "review_edited"].includes(normalized) ? 0 : 1
						if (mode === "contact-first") return normalized === "contact_submitted" ? 0 : 1
						return 0
					}
					const categoryDiff = category(left.dataset.eventType) - category(right.dataset.eventType)
					if (categoryDiff) return categoryDiff
					return (right.dataset.createdAt ?? "").localeCompare(left.dataset.createdAt ?? "")
				})
				const destination = container.querySelector<HTMLElement>("tbody") ?? container
				rows.forEach((row) => destination.append(row))
				return
			}
			rows.sort((left, right) => {
				if (mode.includes("oldest"))
					return (left.dataset.createdAt ?? "").localeCompare(
						right.dataset.createdAt ?? "",
					)
				if (mode.includes("failed")) {
					const failedDiff = (
						Number(right.dataset.status === "failure") -
						Number(left.dataset.status === "failure")
					)
					if (failedDiff) return failedDiff
				}
				if (mode.includes("suspicious"))
					{
					const suspiciousDiff = (
						Number(right.dataset.risk === "high") -
						Number(left.dataset.risk === "high")
					)
					if (suspiciousDiff) return suspiciousDiff
				}
				if (mode.includes("high"))
					return (
						Number(right.dataset.severity === "high") -
						Number(left.dataset.severity === "high")
					)
				if (mode.includes("open"))
					return (
						Number(right.dataset.status !== "resolved") -
						Number(left.dataset.status !== "resolved")
					)
				return (right.dataset.createdAt ?? "").localeCompare(
					left.dataset.createdAt ?? "",
				)
			})
			const destination = container.querySelector<HTMLElement>("tbody") ?? container
			rows.forEach((row) => destination.append(row))
		}
		sortRows("#adminSecurityActivityList", getValue("adminSecuritySortSelect"))
		sortRows("#adminWaitlistList", getValue("adminWaitlistSortSelect"))
		sortRows(
			"#adminSecurityAlertsList",
			getValue("adminSecurityAlertsSortSelect"),
		)
		sortRows(
			"#adminAccountHistoryList",
			getValue("adminAccountHistorySortSelect"),
		)
		sortRows("#adminTimelineList", getValue("adminTimelineSortSelect"))
		sortRows("#adminSessionsList", getValue("adminSessionsSortSelect"))
		const teamSearch = getValue("adminAdminsSearchInput")
		const teamRole = getValue("adminAdminsRoleFilter")
		const teamStatus = getValue("adminAdminsStatusFilter")
		document
			.querySelectorAll<HTMLElement>("#adminAdminsList .admin-snapshot-row")
			.forEach((row) => {
				row.hidden = Boolean(
					(teamSearch && !row.dataset.searchText?.includes(teamSearch)) ||
					(teamRole &&
						teamRole !== "all" &&
						!row.dataset.searchText?.includes(teamRole)) ||
					(teamStatus &&
						teamStatus !== "all" &&
						row.dataset.status !== teamStatus),
				)
			})
	}
	const ids = [
		"adminReviewsSortSelect",
		"adminMessagesSortSelect",
		"adminWaitlistSortSelect",
		"adminSecuritySortSelect",
		"adminSecurityAlertsSortSelect",
		"adminAccountHistorySortSelect",
		"adminTimelineSortSelect",
		"adminSessionsSortSelect",
		"adminSecuritySearchInput",
		"adminSecurityProviderFilterSelect",
		"adminSecurityRiskFilterSelect",
		"adminSecurityCountryFilterInput",
		"adminSecurityStatusFilterSelect",
		"adminSecurityDeviceFilterSelect",
		"adminSecurityUserFilterSelect",
		"adminSecurityDateFromFilter",
		"adminSecurityDateToFilter",
		"adminSecurityDateFilter",
		"adminAdminsSearchInput",
		"adminAdminsRoleFilter",
		"adminAdminsStatusFilter",
	]
	ids.forEach((id) => {
		const element = document.getElementById(id)
		if (
			!(
				element instanceof HTMLInputElement ||
				element instanceof HTMLSelectElement
			)
		)
			return
		const eventName =
			element instanceof HTMLInputElement && element.type === "search"
				? "input"
				: "change"
		element.addEventListener(eventName, apply)
		removers.push(() => element.removeEventListener(eventName, apply))
	})
	const reviewFilters = document.getElementById("adminReviewStatusFilterControls")
	const messageFilters = document.getElementById("adminContactStatusFilterControls")
	const bindStatusFilter = (
		controls: HTMLElement | null,
		attribute: "reviewStatusFilter" | "contactStatusFilter",
	) => {
		if (!controls) return
		const handler = (event: Event) => {
			const target = event.target
			if (!(target instanceof Element)) return
			const button = target.closest<HTMLButtonElement>(`button[data-${attribute.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}]`)
			if (!button) return
			const filter = button.dataset[attribute]?.toLowerCase() ?? "all"
			controls.dataset.activeStatusFilter =
				controls.dataset.activeStatusFilter === filter ? "all" : filter
			apply()
		}
		controls.addEventListener("click", handler)
		removers.push(() => controls.removeEventListener("click", handler))
	}
	bindStatusFilter(reviewFilters, "reviewStatusFilter")
	bindStatusFilter(messageFilters, "contactStatusFilter")
	const clear = document.getElementById("adminSecurityClearFiltersBtn")
	if (clear instanceof HTMLButtonElement) {
		const handler = () => {
			ids.forEach((id) => {
				const element = document.getElementById(id)
				if (
					element instanceof HTMLInputElement ||
					element instanceof HTMLSelectElement
				) {
					element.value = element instanceof HTMLSelectElement ? "all" : ""
				}
			})
			apply()
		}
		clear.addEventListener("click", handler)
		removers.push(() => clear.removeEventListener("click", handler))
	}
	apply()
	return () => removers.forEach((remove) => remove())
}

function applyLegacyReviewAndMessageFilters(): void {
	const applyList = (
		listId: string,
		controlsId: string,
		filterAttribute: "reviewStatusFilter" | "contactStatusFilter",
		sortId: string,
	) => {
		const list = document.getElementById(listId)
		const controls = document.getElementById(controlsId)
		const sortSelect = document.getElementById(sortId)
		if (!list || !controls) return
		const activeFilter = controls.dataset.activeStatusFilter ?? "all"
		const rows = Array.from(list.querySelectorAll<HTMLElement>(".admin-snapshot-row"))
		for (const row of rows) row.hidden = activeFilter !== "all" && row.dataset.status !== activeFilter
		controls.querySelectorAll<HTMLButtonElement>(`[data-${filterAttribute.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}]`).forEach((button) => {
			const active = button.dataset[filterAttribute]?.toLowerCase() === activeFilter
			button.classList.toggle("active", active)
			button.setAttribute("aria-pressed", String(active))
		})
		const mode = sortSelect instanceof HTMLSelectElement ? sortSelect.value : ""
		const timestamp = (row: HTMLElement, key: "createdAt" | "updatedAt") => Date.parse(row.dataset[key] ?? "") || 0
		if (listId === "adminReviewsList") {
			rows.sort((a, b) => {
				if (mode === "newest") return timestamp(b, "updatedAt") - timestamp(a, "updatedAt") || timestamp(b, "createdAt") - timestamp(a, "createdAt")
				if (mode === "highest-rated") return Number(b.dataset.rating) - Number(a.dataset.rating) || Number(b.dataset.featured === "true") - Number(a.dataset.featured === "true") || timestamp(b, "createdAt") - timestamp(a, "createdAt")
				return Number(b.dataset.featured === "true") - Number(a.dataset.featured === "true") || timestamp(b, "updatedAt") - timestamp(a, "updatedAt") || timestamp(b, "createdAt") - timestamp(a, "createdAt")
			})
		} else {
			const priorities: Record<string, number> = { new: 0, read: 1, resolved: 2 }
			rows.sort((a, b) => {
				if (mode === "oldest") return timestamp(a, "createdAt") - timestamp(b, "createdAt") || timestamp(a, "updatedAt") - timestamp(b, "updatedAt")
				if (mode === "status-new-first") return (priorities[a.dataset.status ?? ""] ?? 9) - (priorities[b.dataset.status ?? ""] ?? 9) || timestamp(b, "updatedAt") - timestamp(a, "updatedAt") || timestamp(b, "createdAt") - timestamp(a, "createdAt")
				if (mode === "status-unresolved-first") return Number(a.dataset.status === "resolved") - Number(b.dataset.status === "resolved") || timestamp(b, "updatedAt") - timestamp(a, "updatedAt") || timestamp(b, "createdAt") - timestamp(a, "createdAt")
				if (mode === "name-az") return (a.dataset.customerName ?? "").localeCompare(b.dataset.customerName ?? "", undefined, { sensitivity: "base" })
				return timestamp(b, "updatedAt") - timestamp(a, "updatedAt") || timestamp(b, "createdAt") - timestamp(a, "createdAt")
			})
		}
		rows.forEach((row) => list.append(row))
		let filteredEmpty = list.querySelector<HTMLElement>("[data-legacy-filter-empty]")
		const hasVisibleRows = rows.some((row) => !row.hidden)
		if (activeFilter !== "all" && rows.length > 0 && !hasVisibleRows) {
			if (!filteredEmpty) {
				filteredEmpty = document.createElement("p")
				filteredEmpty.className = "admin-empty-state"
				filteredEmpty.dataset.legacyFilterEmpty = "true"
				list.append(filteredEmpty)
			}
			filteredEmpty.textContent = listId === "adminReviewsList"
				? `No ${activeFilter} reviews found.`
				: `No ${activeFilter} messages found.`
		} else {
			filteredEmpty?.remove()
		}
	}
	applyList("adminReviewsList", "adminReviewStatusFilterControls", "reviewStatusFilter", "adminReviewsSortSelect")
	applyList("adminContactList", "adminContactStatusFilterControls", "contactStatusFilter", "adminMessagesSortSelect")
}

function bindAdminBookingFilters(): {
	apply: () => void
	remove: () => void
} {
	const controls = document.getElementById("adminBookingFilterControls")
	const list = document.getElementById("adminBookingsList")
	const waitlistList = document.getElementById("adminWaitlistList")
	let activeFilter = "all"
	const allowedFilters = new Set([
		"all",
		"pending",
		"confirmed",
		"completed",
		"cancelled",
		"waitlisted",
	])
	const apply = (): void => {
		if (!controls || !list) return
		list
			.querySelectorAll<HTMLElement>("[data-booking-waitlist-clone]")
			.forEach((row) => row.remove())
		const rows = Array.from(
			list.querySelectorAll<HTMLElement>(
				".admin-snapshot-row:not([data-booking-waitlist-clone])",
			),
		)
		let visibleCount = 0
		for (const row of rows) {
			const status = row.dataset.status?.toLowerCase() ?? ""
			const visible =
				activeFilter !== "waitlisted" &&
				(activeFilter === "all" || status === activeFilter)
			row.hidden = !visible
			if (visible) visibleCount += 1
		}
		if (activeFilter === "waitlisted" && waitlistList) {
			const activeQueueStatuses = new Set([
				"waiting",
				"notified",
				"contacted",
				"notification_failed",
			])
			for (const sourceRow of waitlistList.querySelectorAll<HTMLElement>(
				".admin-snapshot-row",
			)) {
				if (!activeQueueStatuses.has(sourceRow.dataset.status?.toLowerCase() ?? ""))
					continue
				const clone = sourceRow.cloneNode(true)
				if (!(clone instanceof HTMLElement)) continue
				clone.classList.remove("admin-review-item", "admin-waitlist-card")
				clone.classList.add(
					"admin-booking-item",
					"admin-booking-item-waitlisted",
					"admin-booking-item-waitlist-record",
				)
				clone.hidden = false
				clone.dataset.status = "waitlisted"
				clone.dataset.bookingWaitlistClone = "true"
				list.append(clone)
				visibleCount += 1
			}
		}
		controls
			.querySelectorAll<HTMLButtonElement>("[data-booking-status-filter]")
			.forEach((button) => {
				const filter = button.dataset.bookingStatusFilter?.toLowerCase() ?? "all"
				const isActive = filter === activeFilter
				button.classList.toggle("active", isActive)
				button.setAttribute("aria-pressed", String(isActive))
			})
		let emptyState = list.querySelector<HTMLElement>(
			"[data-booking-filter-empty]",
		)
		const defaultEmptyState = list.querySelector<HTMLElement>(
			".admin-empty-state:not([data-booking-filter-empty])",
		)
		if (visibleCount === 0 && (rows.length > 0 || activeFilter === "waitlisted")) {
			if (!emptyState) {
				emptyState = document.createElement("p")
				emptyState.className = "admin-empty-state"
				emptyState.dataset.bookingFilterEmpty = "true"
				list.append(emptyState)
			}
			emptyState.textContent =
				activeFilter === "waitlisted"
					? "No waitlist entries right now."
					: `No ${activeFilter} bookings match this filter.`
			if (defaultEmptyState) defaultEmptyState.hidden = true
		} else {
			emptyState?.remove()
			if (defaultEmptyState)
				defaultEmptyState.hidden = activeFilter !== "all" || visibleCount > 0
		}
	}
	const clickHandler = (event: Event): void => {
		const target = event.target
		if (!(target instanceof Element)) return
		const button = target.closest<HTMLButtonElement>(
			"[data-booking-status-filter]",
		)
		if (!button || !controls?.contains(button)) return
		const candidate = button.dataset.bookingStatusFilter?.toLowerCase() ?? "all"
		activeFilter = allowedFilters.has(candidate) ? candidate : "all"
		apply()
	}
	controls?.addEventListener("click", clickHandler)
	apply()
	return {
		apply,
		remove: () => controls?.removeEventListener("click", clickHandler),
	}
}

function exportVisibleSecurityRows(format: "csv" | "excel"): void {
	const rows = Array.from(
		document.querySelectorAll<HTMLElement>(
			"#adminSecurityActivityList .admin-snapshot-row:not([hidden])",
		),
	)
	if (!rows.length) return
	const values = rows.map((row) => [
		row.dataset.createdAt ?? "",
		row.querySelector("strong")?.textContent ?? "",
		row.querySelector("p")?.textContent ?? "",
	])
	const escape = (value: string) => {
		const spreadsheetSafe = /^[=+@\-\t\r]/.test(value) ? `'${value}` : value
		return spreadsheetSafe.replaceAll('"', '""')
	}
	const date = new Date().toISOString().slice(0, 10)
	let contents: string
	let mimeType: string
	let extension: string
	if (format === "csv") {
		contents = [
			["Timestamp", "User", "Details"],
			...values,
		].map((line) => line.map((value) => `"${escape(value)}"`).join(",")).join("\r\n")
		mimeType = "text/csv;charset=utf-8"
		extension = "csv"
	} else {
		const cells = (line: readonly string[], tag: "td" | "th") =>
			`<tr>${line.map((value) => `<${tag}>${escapeClientHtml(value)}</${tag}>`).join("")}</tr>`
		contents = `<html><head><meta charset="UTF-8"></head><body><table>${cells(["Timestamp", "User", "Details"], "th")}${values.map((line) => cells(line, "td")).join("")}</table></body></html>`
		mimeType = "application/vnd.ms-excel;charset=utf-8"
		extension = "xls"
	}
	const url = URL.createObjectURL(new Blob([contents], { type: mimeType }))
	const link = document.createElement("a")
	link.href = url
	link.download = `security-logs-${date}.${extension}`
	link.click()
	window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function recordValue(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {}
}

function setDesignControl(id: string, value: unknown): void {
	const element = document.getElementById(id)
	if (
		element instanceof HTMLInputElement ||
		element instanceof HTMLTextAreaElement ||
		element instanceof HTMLSelectElement
	) {
		element.value = typeof value === "string" ? value : String(value ?? "")
	}
	const previewId =
		id === "adminDesignLogoUrl"
			? "adminDesignLogoPreview"
			: id === "adminDesignHeroUrl"
				? "adminDesignHeroPreview"
				: null
	if (previewId) {
		const preview = document.getElementById(previewId)
		if (preview instanceof HTMLImageElement) {
			const imageUrl = typeof value === "string" ? value.trim() : ""
			preview.hidden = !imageUrl
			if (imageUrl) preview.src = imageUrl
			else preview.removeAttribute("src")
		}
	}
}

function getDesignControl(id: string): string {
	const element = document.getElementById(id)
	return element instanceof HTMLInputElement ||
		element instanceof HTMLTextAreaElement ||
		element instanceof HTMLSelectElement
		? element.value.trim()
		: ""
}

function setDesignMessage(
	message: string,
	type: "error" | "success" = "success",
): void {
	const element = document.getElementById("adminDesignMessage")
	if (!element) return
	element.textContent = message
	element.classList.remove("error", "success")
	element.classList.add(type)
	element.style.display = "block"
}

function bindStorefrontDesignEditor(
	tenantSlug: string,
	snapshot: AdminSnapshotRecord,
): () => void {
	const settings = recordValue(snapshot.settings)
	const savedDesign = recordValue(settings.storefrontConfig)
	const savedCopy = recordValue(savedDesign.sectionCopy)
	const savedVisibility = recordValue(savedDesign.sectionVisibility)
	const design: StorefrontDesignConfig = {
		...DEFAULT_STOREFRONT_DESIGN,
		...savedDesign,
		heroDescription:
			typeof savedDesign.heroDescription === "string"
				? savedDesign.heroDescription
				: DEFAULT_STOREFRONT_DESIGN.heroDescription,
		sectionCopy: {
			...DEFAULT_STOREFRONT_DESIGN.sectionCopy,
			...savedCopy,
		},
		sectionVisibility: {
			...DEFAULT_STOREFRONT_DESIGN.sectionVisibility,
			...savedVisibility,
		},
		mapEmbedUrl: safeMapEmbedUrl(
			savedDesign.mapEmbedUrl,
			DEFAULT_STOREFRONT_DESIGN.mapEmbedUrl,
		),
	}
	setDesignControl("adminDesignThemePreset", settings.themePreset ?? DEFAULT_THEME_PRESET)
	setDesignControl("adminDesignThemeMode", settings.themeMode ?? "dark")
	setDesignControl(
		"adminDesignLogoUrl",
		settings.logoUrl ??
			(tenantSlug === "royal-braids"
				? "/assets/salon/RoyalBraidsnewlogo.png"
				: ""),
	)
	setDesignControl(
		"adminDesignHeroUrl",
		settings.heroImageUrl ??
			"/assets/salon/1000_F_595420115_RZi6MAsq90qVRMfFz37ZKBianocAltUu.jpg",
	)
	setDesignControl(
		"adminDesignHeroTitle",
		settings.heroTitle ??
			"Celebrate Your Crown with <span>Beautiful Braids</span>",
	)
	setDesignControl(
		"adminDesignHeroSubtitle",
		settings.heroSubtitle ?? "Premium African Hair Braiding & Beauty",
	)
	setDesignControl("adminDesignHeroDescription", design.heroDescription)
	for (const key of [
		"phonePrimary",
		"phoneSecondary",
		"emailPrimary",
		"emailBookings",
		"address",
	] as const)
		setDesignControl(
			`adminDesign${key[0].toUpperCase()}${key.slice(1)}`,
			settings[key] ?? "",
		)
	setDesignControl("adminDesignWhatsappUrl", settings.whatsappUrl ?? "")
	const copyMap: Record<string, string> = {
		gallerySubtitle: "adminDesigngallerySubtitle",
		galleryTitle: "adminDesigngalleryTitle",
		galleryDescription: "adminDesigngalleryDescription",
		servicesSubtitle: "adminDesignservicesSubtitle",
		servicesTitle: "adminDesignservicesTitle",
		servicesDescription: "adminDesignservicesDescription",
		bookingSubtitle: "adminDesignbookingSubtitle",
		bookingTitle: "adminDesignbookingTitle",
		bookingDescription: "adminDesignbookingDescription",
		testimonialsSubtitle: "adminDesigntestimonialsSubtitle",
		testimonialsTitle: "adminDesigntestimonialsTitle",
		testimonialsDescription: "adminDesigntestimonialsDescription",
		blogSubtitle: "adminDesignblogSubtitle",
		blogTitle: "adminDesignblogTitle",
		blogDescription: "adminDesignblogDescription",
		visitSubtitle: "adminDesignvisitSubtitle",
		visitTitle: "adminDesignvisitTitle",
		visitDescription: "adminDesignvisitDescription",
		contactTitle: "adminDesigncontactTitle",
		contactDescription: "adminDesigncontactDescription",
		footerDescription: "adminDesignFooterDescription",
		copyright: "adminDesignCopyright",
		craftedBy: "adminDesignCraftedBy",
	}
	Object.entries(copyMap).forEach(([key, id]) =>
		setDesignControl(
			id,
			design.sectionCopy[key as keyof typeof design.sectionCopy],
		),
	)
	STOREFRONT_SECTION_KEYS.forEach((section) => {
		const input = document.getElementById(`adminDesignVisible${section}`)
		if (input instanceof HTMLInputElement)
			input.checked = design.sectionVisibility[section]
	})
	const openingHours = recordValue(settings.openingHours)
	for (const key of ["weekday", "saturday", "sunday", "publicHoliday"] as const)
		setDesignControl(`adminDesignHours${key}`, openingHours[key] ?? "")
	const socialLinks = recordValue(settings.socialLinks)
	for (const key of [
		"instagram",
		"facebook",
		"twitter",
		"tiktok",
		"whatsapp",
	] as const)
		setDesignControl(`adminDesignSocial${key}`, socialLinks[key] ?? "")
	setDesignControl("adminDesignMapEmbedUrl", design.mapEmbedUrl)

	const fileUploads: Array<() => void> = []
	const bindUpload = (fileId: string, urlId: string, kind: "LOGO" | "HERO") => {
		const input = document.getElementById(fileId)
		if (!(input instanceof HTMLInputElement)) return
		const handler = async () => {
			const file = input.files?.[0]
			if (!file) return
			const imageError = getImageUploadError(file.size, file.type)
			if (imageError) {
				setDesignMessage(imageError, "error")
				input.value = ""
				return
			}
			setDesignMessage("Uploading image…")
			try {
				const prepare = await fetch(
					`/api/manage/${encodeURIComponent(tenantSlug)}/media`,
					{
						method: "POST",
						credentials: "same-origin",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							fileName: file.name,
							mimeType: file.type,
							byteSize: file.size,
							kind,
						}),
					},
				)
				const prepared = (await prepare.json()) as {
					uploadUrl?: string
					assetId?: string
					publicUrl?: string | null
					error?: string
				}
				if (!prepare.ok || !prepared.uploadUrl || !prepared.assetId)
					throw new Error(
						prepared.error ?? "The image upload could not be prepared.",
					)
				const uploaded = await fetch(prepared.uploadUrl, {
					method: "PUT",
					headers: { "content-type": file.type },
					body: file,
				})
				if (!uploaded.ok)
					throw new Error("The image could not be uploaded to storage.")
				const finalized = await fetch(
					`/api/manage/${encodeURIComponent(tenantSlug)}/media`,
					{
						method: "PATCH",
						credentials: "same-origin",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ assetId: prepared.assetId }),
					},
				)
				const result = (await finalized.json()) as {
					publicUrl?: string | null
					error?: string
				}
				if (!finalized.ok || !result.publicUrl)
					throw new Error(
						result.error ?? "The uploaded image has no public URL configured.",
					)
				setDesignControl(urlId, result.publicUrl)
				setDesignMessage("Image uploaded. Save Salon Design to publish it.")
			} catch (error) {
				setDesignMessage(
					error instanceof Error ? error.message : "The image upload failed.",
					"error",
				)
			}
		}
		input.addEventListener("change", handler)
		fileUploads.push(() => input.removeEventListener("change", handler))
	}
	bindUpload("adminDesignLogoFile", "adminDesignLogoUrl", "LOGO")
	bindUpload("adminDesignHeroFile", "adminDesignHeroUrl", "HERO")
	const saveButtons = Array.from(
		document.querySelectorAll<HTMLButtonElement>("[data-save-store-design]"),
	)
	if (saveButtons.length === 0)
		return () => fileUploads.forEach((remove) => remove())
	const saveHandler = async () => {
		saveButtons.forEach((button) => (button.disabled = true))
		setDesignMessage("Saving Salon Design…")
		const sectionCopy = Object.fromEntries(
			Object.entries(copyMap).map(([key, id]) => [key, getDesignControl(id)]),
		)
		const sectionVisibility = Object.fromEntries(
			STOREFRONT_SECTION_KEYS.map((section) => [
				section,
				(
					document.getElementById(
						`adminDesignVisible${section}`,
					) as HTMLInputElement | null
				)?.checked === true,
			]),
		)
		const body = {
			action: "storefront-design",
			themePreset: getDesignControl("adminDesignThemePreset"),
			themeMode: getDesignControl("adminDesignThemeMode"),
			logoUrl: getDesignControl("adminDesignLogoUrl"),
			heroImageUrl: getDesignControl("adminDesignHeroUrl"),
			heroTitle: getDesignControl("adminDesignHeroTitle"),
			heroSubtitle: getDesignControl("adminDesignHeroSubtitle"),
			phonePrimary: getDesignControl("adminDesignPhonePrimary"),
			phoneSecondary: getDesignControl("adminDesignPhoneSecondary"),
			emailPrimary: getDesignControl("adminDesignEmailPrimary"),
			emailBookings: getDesignControl("adminDesignEmailBookings"),
			address: getDesignControl("adminDesignAddress"),
			whatsappUrl: getDesignControl("adminDesignWhatsappUrl"),
			storefrontConfig: {
				heroDescription: getDesignControl("adminDesignHeroDescription"),
				sectionCopy,
				sectionVisibility,
				mapEmbedUrl: getDesignControl("adminDesignMapEmbedUrl"),
			},
			openingHours: Object.fromEntries(
				["weekday", "saturday", "sunday", "publicHoliday"].map((key) => [
					key,
					getDesignControl(`adminDesignHours${key}`),
				]),
			),
			socialLinks: Object.fromEntries(
				["instagram", "facebook", "twitter", "tiktok", "whatsapp"].map(
					(key) => [key, getDesignControl(`adminDesignSocial${key}`)],
				),
			),
		}
		try {
			const response = await fetch(
				`/api/manage/${encodeURIComponent(tenantSlug)}/actions`,
				{
					method: "POST",
					credentials: "same-origin",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(body),
				},
			)
			const result = (await response.json()) as { error?: string }
			if (!response.ok)
				throw new Error(result.error ?? "Salon Design could not be saved.")
			setDesignMessage("Salon Design saved successfully.")
			window.setTimeout(() => window.location.reload(), 450)
		} catch (error) {
			setDesignMessage(
				error instanceof Error
					? error.message
					: "Salon Design could not be saved.",
				"error",
			)
			saveButtons.forEach((button) => (button.disabled = false))
		}
	}
	saveButtons.forEach((button) => button.addEventListener("click", saveHandler))
	return () => {
		fileUploads.forEach((remove) => remove())
		saveButtons.forEach((button) => button.removeEventListener("click", saveHandler))
	}
}

export function bindAdminSnapshotAdapter(
	tenantSlug: string,
	userEmail = "your account",
): () => void {
	const loginForm = document.getElementById("adminLoginForm")
	const panel = document.getElementById("adminPanel")
	const confirmationModal = document.getElementById("adminConfirmModal")
	let pendingConfirmationButton: HTMLButtonElement | null = null
	let confirmedActionButton: HTMLButtonElement | null = null
	const removeTabHandlers: Array<() => void> = []
	const logoutButton = document.getElementById("adminLogoutBtn")
	if (logoutButton instanceof HTMLButtonElement) {
		const logoutHandler = async () => {
			logoutButton.disabled = true
			try {
				await signOut({ redirect: false })
				window.location.reload()
			} catch {
				logoutButton.disabled = false
				const message = document.getElementById("adminAuthMessage")
				if (message) {
					message.textContent = "You could not be signed out. Please try again."
					message.classList.add("error")
					message.style.display = "block"
				}
			}
		}
		logoutButton.addEventListener("click", logoutHandler)
		removeTabHandlers.push(() =>
			logoutButton.removeEventListener("click", logoutHandler),
		)
	}
	const pendingServiceCategoryChanges = new Map<string, boolean>()
	const serviceCategorySaveButton = document.getElementById(
		"adminSaveServiceCategoriesBtn",
	)
	const serviceCategoryMessage = document.getElementById("adminServicesMessage")
	const renderServiceCategoryControls = (services: readonly unknown[]) => {
		const mount = document.getElementById("adminServiceCategoryToggles")
		if (!mount) return
		mount.replaceChildren()
		const categories = services
			.map((item) => item as AdminSnapshotRecord)
			.filter((category): category is AdminSnapshotRecord & { id: string } =>
				typeof category.id === "string",
			)
			.map((category) => ({
				id: category.id,
				label: String(category.label ?? "Service category"),
				savedEnabled: category.enabled === true,
				enabled: pendingServiceCategoryChanges.has(category.id)
					? pendingServiceCategoryChanges.get(category.id) === true
					: category.enabled === true,
			}))
		const active = categories.filter((category) => category.enabled)
			.sort((a, b) => a.label.localeCompare(b.label))
		const inactive = categories.filter((category) => !category.enabled)
			.sort((a, b) => a.label.localeCompare(b.label))

		const summary = document.createElement("div")
		summary.className = "admin-service-settings-summary"
		summary.setAttribute("aria-live", "polite")
		for (const [label, count, state] of [
			["Active", active.length, "is-active"],
			["Inactive", inactive.length, "is-inactive"],
		] as const) {
			const item = document.createElement("div")
			item.className = `admin-service-settings-summary-item ${state}`
			item.append(document.createTextNode(`${label}: `))
			const value = document.createElement("strong")
			value.textContent = String(count)
			item.append(value)
			summary.append(item)
		}
		mount.append(summary)

		const groups = document.createElement("div")
		groups.className = "admin-service-settings-groups"
		const renderGroup = (
			label: string,
			items: typeof active,
			state: "active" | "inactive",
		) => {
			const section = document.createElement("section")
			section.className = `admin-service-settings-group is-${state}-group`
			const header = document.createElement("header")
			header.className = "admin-service-settings-group-head"
			const heading = document.createElement("h4")
			heading.className = "admin-service-settings-group-title"
			const icon = document.createElement("span")
			icon.className = `admin-service-settings-group-icon is-${state}`
			icon.setAttribute("aria-hidden", "true")
			icon.textContent = state === "active" ? "✓" : "⏸"
			heading.append(icon, document.createTextNode(` ${label}`))
			const description = document.createElement("p")
			description.textContent = state === "active"
				? "These categories are visible on the live website and booking form."
				: "These categories are hidden from public view until re-enabled."
			header.append(heading, description)
			const cards = document.createElement("div")
			cards.className = "admin-service-settings-cards"
			if (items.length === 0) {
				const empty = document.createElement("div")
				empty.className = "admin-service-settings-empty"
				empty.textContent = state === "active"
					? "No active categories right now."
					: "All categories are currently active."
				cards.append(empty)
			}
			for (const category of items) {
				const enabled = state === "active"
				const card = document.createElement("article")
				card.className = `admin-service-category-card ${enabled ? "is-enabled" : "is-disabled"}`
				const main = document.createElement("div")
				main.className = "admin-service-category-main"
				const copy = document.createElement("div")
				copy.className = "admin-service-category-copy"
				const titleRow = document.createElement("div")
				titleRow.className = "admin-service-category-title-row"
				const title = document.createElement("h4")
				title.className = "admin-service-category-title"
				title.textContent = category.label
				const pill = document.createElement("span")
				pill.className = `admin-service-category-pill ${enabled ? "is-visible" : "is-hidden"}`
				pill.textContent = enabled ? "ACTIVE" : "OFF"
				titleRow.append(title, pill)
				const visibility = document.createElement("p")
				visibility.className = `admin-service-category-state ${enabled ? "is-visible" : "is-hidden"}`
				visibility.textContent = enabled ? "Visible on website" : "Hidden on website"
				copy.append(titleRow, visibility)

				const switchLabel = document.createElement("label")
				switchLabel.className = "admin-service-toggle"
				const input = document.createElement("input")
				input.type = "checkbox"
				input.id = `adminServiceCategory_${category.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`
				input.dataset.serviceCategoryId = category.id
				input.dataset.serviceCategoryToggle = category.id
				input.checked = enabled
				switchLabel.htmlFor = input.id
				switchLabel.setAttribute("aria-label", `Toggle ${category.label}`)
				const slider = document.createElement("span")
				slider.className = "admin-service-toggle-slider"
				slider.setAttribute("aria-hidden", "true")
				switchLabel.append(input, slider)
				input.addEventListener("change", () => {
					if (input.checked === category.savedEnabled)
						pendingServiceCategoryChanges.delete(category.id)
					else pendingServiceCategoryChanges.set(category.id, input.checked)
					if (serviceCategorySaveButton instanceof HTMLButtonElement)
						serviceCategorySaveButton.disabled = pendingServiceCategoryChanges.size === 0
					if (serviceCategoryMessage) {
						serviceCategoryMessage.textContent = pendingServiceCategoryChanges.size > 0
							? "Unsaved category changes. Save to apply them to the storefront."
							: ""
						serviceCategoryMessage.classList.remove("success", "error")
						serviceCategoryMessage.style.display = pendingServiceCategoryChanges.size > 0
							? "block"
							: "none"
					}
					renderServiceCategoryControls(services)
				})
				main.append(copy, switchLabel)
				card.append(main)
				cards.append(card)
			}
			section.append(header, cards)
			groups.append(section)
		}
		renderGroup("Active Services", active, "active")
		renderGroup("Inactive Services", inactive, "inactive")
		mount.append(groups)
	}
	if (serviceCategorySaveButton instanceof HTMLButtonElement) {
		serviceCategorySaveButton.disabled = true
		const saveServiceCategories = async () => {
			const updates = Array.from(pendingServiceCategoryChanges, ([categoryId, enabled]) => ({
				categoryId,
				enabled,
			}))
			if (updates.length === 0) return
			serviceCategorySaveButton.disabled = true
			if (serviceCategoryMessage) {
				serviceCategoryMessage.textContent = "Saving service categories…"
				serviceCategoryMessage.classList.remove("success", "error")
				serviceCategoryMessage.style.display = "block"
			}
			try {
				const response = await fetch(
					`/api/manage/${encodeURIComponent(tenantSlug)}/actions`,
					{
						method: "POST",
						credentials: "same-origin",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ action: "category-visibility-bulk", updates }),
					},
				)
				const result = (await response.json()) as { error?: string }
				if (!response.ok) throw new Error(result.error ?? "Service categories could not be saved.")
				pendingServiceCategoryChanges.clear()
				if (serviceCategoryMessage) {
					serviceCategoryMessage.textContent = "Service category settings saved."
					serviceCategoryMessage.classList.add("success")
				}
			} catch (error) {
				if (serviceCategoryMessage) {
					serviceCategoryMessage.textContent = error instanceof Error ? error.message : "Service categories could not be saved."
					serviceCategoryMessage.classList.add("error")
				}
			}
			serviceCategorySaveButton.disabled = pendingServiceCategoryChanges.size === 0
		}
		serviceCategorySaveButton.addEventListener("click", saveServiceCategories)
		removeTabHandlers.push(() => serviceCategorySaveButton.removeEventListener("click", saveServiceCategories))
	}
	const closeConfirmation = () => {
		confirmationModal?.classList.remove("active")
		confirmationModal?.setAttribute("aria-hidden", "true")
		pendingConfirmationButton = null
	}
	const userState = document.getElementById("adminUserState")
	const authMessage = document.getElementById("adminAuthMessage")
	const profanityWordsInput = document.getElementById("adminProfanityWords")
	const saveProfanityButton = document.getElementById("adminSaveProfanityList")
	const profanityStorageKey = `rb_admin_profanity_words_${tenantSlug}`
	const defaultProfanityWords = ["fuck", "shit", "bitch", "asshole", "idiot", "scam"]
	const readProfanityWords = (): string[] => {
		try {
			const stored = window.localStorage.getItem(profanityStorageKey)
			const parsed: unknown = stored ? JSON.parse(stored) : null
			if (!Array.isArray(parsed)) return defaultProfanityWords
			const cleaned = parsed
				.filter((word): word is string => typeof word === "string")
				.map((word) => word.trim().toLowerCase())
				.filter((word) => word.length > 0 && word.length <= 64)
			return cleaned.length > 0 ? cleaned.slice(0, 100) : defaultProfanityWords
		} catch {
			return defaultProfanityWords
		}
	}
	if (profanityWordsInput instanceof HTMLTextAreaElement)
		profanityWordsInput.value = readProfanityWords().join(", ")
	const saveProfanityHandler = () => {
		if (!(profanityWordsInput instanceof HTMLTextAreaElement)) return
		const words = profanityWordsInput.value
			.split(",")
			.map((word) => word.trim().toLowerCase())
			.filter(Boolean)
		if (words.length > 100 || words.some((word) => word.length > 64)) {
			const message = document.getElementById("adminReviewsMessage")
			if (message) {
				message.textContent = "Use at most 100 blocked terms, each no longer than 64 characters."
				message.style.display = "block"
			}
			return
		}
		const normalized = words.length > 0 ? words : defaultProfanityWords
		window.localStorage.setItem(profanityStorageKey, JSON.stringify(normalized))
		profanityWordsInput.value = normalized.join(", ")
		const message = document.getElementById("adminReviewsMessage")
		if (message) {
			message.textContent = "Review content filter saved for this salon on this device."
			message.style.display = "block"
		}
	}
	saveProfanityButton?.addEventListener("click", saveProfanityHandler)
	removeTabHandlers.push(() =>
		saveProfanityButton?.removeEventListener("click", saveProfanityHandler),
	)
	if (loginForm instanceof HTMLElement) loginForm.style.display = "none"
	if (panel instanceof HTMLElement) panel.style.display = "block"
	if (userState) userState.textContent = `Signed in as ${userEmail}`
	if (authMessage) authMessage.textContent = ""

	let removeSnapshotFilters: () => void = () => undefined
	const bookingFilters = bindAdminBookingFilters()
	removeTabHandlers.push(bookingFilters.remove)
	const adminBackToTop = document.getElementById("backToTop")
	if (adminBackToTop) {
		const updateAdminBackToTopVisibility = (): void => {
			adminBackToTop.classList.toggle("visible", window.scrollY > 500)
		}
		const handleAdminBackToTopClick = (event: Event): void => {
			event.preventDefault()
			window.scrollTo({
				top: 0,
				behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")
					.matches
					? "auto"
					: "smooth",
			})
		}
		window.addEventListener("scroll", updateAdminBackToTopVisibility, {
			passive: true,
		})
		adminBackToTop.addEventListener("click", handleAdminBackToTopClick)
		updateAdminBackToTopVisibility()
		removeTabHandlers.push(() => {
			window.removeEventListener("scroll", updateAdminBackToTopVisibility)
			adminBackToTop.removeEventListener("click", handleAdminBackToTopClick)
		})
	}
	const actionHandler = (event: Event) => {
		const target = event.target
		if (!(target instanceof HTMLElement)) return
		const button = target.closest<HTMLButtonElement>(".admin-platform-action")
		if (!button) return
		const action = button.dataset.adminAction
		const id = button.dataset.adminId
		if (!action || !id) return
		if (action === "security-restrict-user" && !button.dataset.durationMinutes) {
			const value = window.prompt(
				"Enter temporary block duration in minutes (5 - 10080):",
				"30",
			)
			if (value === null) return
			const durationMinutes = Number(value)
			if (!Number.isFinite(durationMinutes) || durationMinutes < 5 || durationMinutes > 10080) {
				const message = document.getElementById("adminSecurityEventsMessage")
				if (message) {
					message.textContent = "Enter a valid block duration between 5 and 10080 minutes."
					message.classList.add("error")
					message.style.display = "block"
				}
				return
			}
			button.dataset.durationMinutes = String(Math.round(durationMinutes))
		}
		if (action === "review-update" && button.dataset.status === "APPROVED") {
			try {
				const record = JSON.parse(
					button.dataset.adminDetail ?? "{}",
				) as AdminSnapshotRecord
				const text = typeof record.text === "string" ? record.text.toLowerCase() : ""
				const flagged = readProfanityWords().filter((word) => text.includes(word))
				if (flagged.length > 0) {
					const message = document.getElementById("adminReviewsMessage")
					if (message) {
						message.textContent = `Cannot approve: flagged content found (${flagged.join(", ")}). Edit review text first.`
						message.style.display = "block"
					}
					return
				}
			} catch {
				return
			}
		}
		const securityConfirmText: Record<string, string> = {
			"security-restrict-user": `Temporarily block this account for ${button.dataset.durationMinutes} minutes?`,
			"security-force-logout": "Force logout this account from all active sessions immediately?",
			"security-force-password-reset": "Force this user to reset their password and end current sessions?",
			"security-clear-restriction": "Clear all restrictions for this user?",
		}
		const requiresConfirmation =
			action.endsWith("-delete") ||
			action === "team-member-remove" ||
			action in securityConfirmText
		if (requiresConfirmation && confirmedActionButton !== button) {
			pendingConfirmationButton = button
			const title = document.getElementById("adminConfirmTitle")
			const message = document.getElementById("adminConfirmMessage")
			if (title) title.textContent = securityConfirmText[action] ? "Confirm security action" : "Confirm removal"
			if (message)
				message.textContent = securityConfirmText[action] ?? (
					action === "team-member-remove"
						? "Remove this team member’s access to the salon?"
						: "Delete this item? This action cannot be undone."
				)
			confirmationModal?.classList.add("active")
			confirmationModal?.setAttribute("aria-hidden", "false")
			return
		}
		if (confirmedActionButton === button) confirmedActionButton = null
		if (action === "gallery-edit" || action === "blog-edit") {
			const formId =
				action === "gallery-edit" ? "adminGalleryForm" : "adminBlogsForm"
			const form = document.getElementById(formId)
			if (!(form instanceof HTMLFormElement) || !button.dataset.adminDetail)
				return
			try {
				const record = JSON.parse(
					button.dataset.adminDetail,
				) as AdminSnapshotRecord
				if (action === "gallery-edit") {
					setFormField(form, "galleryEditId", id)
					const category =
						record.category && typeof record.category === "object"
							? (record.category as AdminSnapshotRecord)
							: {}
					setFormField(form, "galleryServiceCategory", category.key)
					document
						.querySelector<HTMLButtonElement>(
							`[data-admin-gallery-service="${String(category.key ?? "braids-services")}"]`,
						)
						?.click()
					setFormField(form, "galleryStyleName", record.styleName)
					setFormField(form, "galleryStyleType", record.styleType)
					setFormField(form, "galleryServiceName", record.serviceName)
					setFormField(form, "galleryLength", record.length)
					setFormField(form, "gallerySize", record.size)
					setFormField(form, "galleryTimeTaken", record.timeTaken)
					setFormField(form, "galleryPriceRange", record.priceRange)
					setFormField(form, "galleryProductBrand", record.productBrand)
					setFormField(form, "galleryProductSize", record.productSize)
					setFormField(
						form,
						"galleryProductDescription",
						record.productDescription,
					)
					setFormField(form, "galleryHairType", record.hairType)
					setFormField(form, "galleryHairServiceType", record.hairServiceType)
					setFormField(form, "galleryHairTechnique", record.hairTechnique)
					setFormField(
						form,
						"galleryHairLengthDensity",
						record.hairLengthDensity,
					)
					setFormField(form, "galleryHairProductsUsed", record.hairProductsUsed)
					setFormField(form, "galleryStylistName", record.stylistName)
					form.dataset.imageUrl =
						typeof record.imageUrl === "string" ? record.imageUrl : ""
					form.dataset.beforeImageUrl =
						typeof record.beforeImageUrl === "string"
							? record.beforeImageUrl
							: ""
					const trending = form.querySelector<HTMLInputElement>(
						"#galleryFeaturedTrending",
					)
					const mostBooked = form.querySelector<HTMLInputElement>(
						"#galleryFeaturedMostBooked",
					)
					if (trending) trending.checked = record.featuredTrending === true
					if (mostBooked)
						mostBooked.checked = record.featuredMostBooked === true
					window.dispatchEvent(new Event("admin-gallery-refresh-preview"))
					const title = document.getElementById("adminGalleryFormTitle")
					if (title) title.textContent = "Edit Gallery Style"
					const cancel = document.getElementById("adminGalleryCancelEdit")
					if (cancel) cancel.style.display = "inline-flex"
				} else {
					setFormField(form, "blogEditId", id)
					setFormField(form, "blogTitle", record.title)
					setFormField(form, "blogExcerpt", record.excerpt)
					setFormField(form, "blogReadTime", record.readTime)
					setFormField(form, "blogReadMoreUrl", record.readMoreUrl)
					setFormField(
						form,
						"blogDate",
						typeof record.publishDate === "string"
							? record.publishDate.slice(0, 10)
							: "",
					)
					form.dataset.imageUrl =
						typeof record.imageUrl === "string" ? record.imageUrl : ""
					const title = document.getElementById("adminBlogsFormTitle")
					if (title) title.textContent = "Edit Blog"
					const cancel = document.getElementById("adminBlogsCancelEdit")
					if (cancel) cancel.style.display = "inline-flex"
				}
				form.scrollIntoView({ behavior: "smooth", block: "center" })
			} catch {
				// The detail payload is generated locally from the server snapshot.
			}
			return
		}
		if (action === "manual-whatsapp-reminder") {
			const config = (window.CLIENT_CONFIG ?? {}) as SalonClientConfig
			const businessName = config.client?.name ?? config.brand?.businessName ?? "the salon"
			const customerLine = button.dataset.name ? ` for ${button.dataset.name}` : ""
			const reminderText = `Hello ${businessName}, this is a manual appointment reminder${customerLine}. Service: ${button.dataset.service || "[Service name]"}. Price: ${button.dataset.price || "[Price]"}. Date: ${button.dataset.date || "[Appointment date]"}. Time: ${button.dataset.time || "[Appointment time]"}. Please confirm you received this reminder.`
			const baseUrl = getConfiguredWhatsAppUrl()
			const separator = baseUrl.includes("?") ? "&" : "?"
			window.open(
				`${baseUrl}${separator}text=${encodeURIComponent(reminderText)}`,
				"_blank",
				"noopener,noreferrer",
			)
			const message = document.getElementById("adminActionMessage")
			if (message) {
				message.textContent = "WhatsApp opened with a ready-to-send manual reminder."
				message.classList.remove("error")
				message.classList.add("success")
				message.style.display = "block"
			}
			return
		}
		button.disabled = true
		const payload: Record<string, unknown> = { action, id }
		if (button.dataset.status) payload.status = button.dataset.status
		if (button.dataset.featured)
			payload.featured = button.dataset.featured === "true"
		if (button.dataset.published)
			payload.published = button.dataset.published === "true"
		if (button.dataset.durationMinutes)
			payload.durationMinutes = Number(button.dataset.durationMinutes)
		void fetch(`/api/manage/${encodeURIComponent(tenantSlug)}/actions`, {
			method: "POST",
			credentials: "same-origin",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(payload),
		})
			.then((response) => {
				if (!response.ok)
					throw new Error("The admin action could not be completed.")
				window.location.reload()
			})
			.catch((error: unknown) => {
				button.disabled = false
				const message = document.getElementById("adminActionMessage")
				if (message) {
					message.textContent =
						error instanceof Error
							? error.message
							: "The admin action could not be completed."
					message.style.display = "block"
				}
			})
	}
	document.addEventListener("click", actionHandler)
	removeTabHandlers.push(() =>
		document.removeEventListener("click", actionHandler),
	)
	document
		.getElementById("adminConfirmClose")
		?.addEventListener("click", closeConfirmation)
	const confirmationBackdropHandler = (event: Event) => {
		if (event.target === confirmationModal) closeConfirmation()
	}
	const confirmActionHandler = () => {
		const button = pendingConfirmationButton
		if (!button) return
		pendingConfirmationButton = null
		confirmedActionButton = button
		closeConfirmation()
		button.click()
	}
	document
		.getElementById("adminConfirmCancel")
		?.addEventListener("click", closeConfirmation)
	document
		.getElementById("adminConfirmOk")
		?.addEventListener("click", confirmActionHandler)
	confirmationModal?.addEventListener("click", confirmationBackdropHandler)
	removeTabHandlers.push(() => {
		document
			.getElementById("adminConfirmClose")
			?.removeEventListener("click", closeConfirmation)
		document
			.getElementById("adminConfirmCancel")
			?.removeEventListener("click", closeConfirmation)
		document
			.getElementById("adminConfirmOk")
			?.removeEventListener("click", confirmActionHandler)
		confirmationModal?.removeEventListener("click", confirmationBackdropHandler)
	})
	const detailHandler = (event: Event) => {
		const target = event.target
		if (!(target instanceof HTMLElement)) return
		const button = target.closest<HTMLButtonElement>(".admin-platform-detail")
		if (!button?.dataset.adminDetail) return
		const panel = document.getElementById("adminScheduleDetails")
		if (!panel) return
		panel.replaceChildren()
		const heading = document.createElement("h3")
		heading.textContent = "Record details"
		panel.append(heading)
		try {
			const record = JSON.parse(
				button.dataset.adminDetail,
			) as AdminSnapshotRecord
			Object.entries(record).forEach(([key, value]) => {
				if (key === "text" || key === "replyText") return
				const line = document.createElement("p")
				line.textContent = `${key}: ${formatAdminSnapshotValue(value)}`
				panel.append(line)
			})
			if (typeof record.text === "string") {
				const reviewText = document.createElement("textarea")
				reviewText.value = record.text
				reviewText.setAttribute("aria-label", "Edit review text")
				reviewText.rows = 4
				reviewText.addEventListener("input", () =>
					reviewText.setCustomValidity(""),
				)
				const saveReview = document.createElement("button")
				saveReview.type = "button"
				saveReview.className = "btn btn-primary"
				saveReview.textContent = "Save Edit"
				saveReview.onclick = () => {
					const text = reviewText.value.trim()
					if (text.length < 10 || text.length > 3000) {
						reviewText.setCustomValidity(
							"Review text must be between 10 and 3000 characters.",
						)
						reviewText.reportValidity()
						return
					}
					if (typeof record.id !== "string") return
					saveReview.disabled = true
					void fetch(`/api/manage/${encodeURIComponent(tenantSlug)}/actions`, {
						method: "POST",
						credentials: "same-origin",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							action: "review-update",
							id: record.id,
							status: "PENDING",
							text,
						}),
					})
						.then((response) => {
							if (!response.ok)
								throw new Error("Review text could not be saved.")
							window.location.reload()
						})
						.catch((error: unknown) => {
							saveReview.disabled = false
							const message = document.getElementById("adminActionMessage")
							if (message) {
								message.textContent =
									error instanceof Error
										? error.message
										: "Review text could not be saved."
								message.style.display = "block"
							}
						})
				}
				panel.append(reviewText, saveReview)
			}
			if (typeof record.replyText === "string" || "replyText" in record) {
				const reply = document.createElement("textarea")
				reply.value =
					typeof record.replyText === "string" ? record.replyText : ""
				reply.placeholder = "Reply to this review"
				reply.rows = 3
				const save = document.createElement("button")
				save.type = "button"
				save.className = "btn btn-primary"
				save.textContent = "Save review reply"
				save.onclick = () => {
					if (typeof record.id !== "string") return
					void fetch(`/api/manage/${encodeURIComponent(tenantSlug)}/actions`, {
						method: "POST",
						credentials: "same-origin",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							action: "review-update",
							id: record.id,
							replyText: reply.value,
						}),
					}).then((response) => {
						if (!response.ok)
							throw new Error("Review reply could not be saved.")
						window.location.reload()
					})
				}
				panel.append(reply, save)
			}
			if (typeof record.userId === "string") {
				const permissions = [
					"canManageBookings",
					"canManageContent",
					"canManageSecurity",
				]
				const permissionWrap = document.createElement("div")
				permissions.forEach((permission) => {
					const label = document.createElement("label")
					const input = document.createElement("input")
					input.type = "checkbox"
					input.checked = record[permission] === true
					input.dataset.permission = permission
					label.append(
						input,
						document.createTextNode(` ${permission.replace("canManage", "")}`),
					)
					permissionWrap.append(label)
				})
				const savePermissions = document.createElement("button")
				savePermissions.type = "button"
				savePermissions.className = "btn btn-primary"
				savePermissions.textContent = "Save permissions"
				savePermissions.onclick = () => {
					const payload: Record<string, unknown> = {
						action: "team-member-permissions",
						id: record.userId,
					}
					permissionWrap
						.querySelectorAll<HTMLInputElement>("[data-permission]")
						.forEach((input) => {
							if (input.dataset.permission)
								payload[input.dataset.permission] = input.checked
						})
					void fetch(`/api/manage/${encodeURIComponent(tenantSlug)}/actions`, {
						method: "POST",
						credentials: "same-origin",
						headers: { "content-type": "application/json" },
						body: JSON.stringify(payload),
					}).then((response) => {
						if (!response.ok)
							throw new Error("Team permissions could not be saved.")
						window.location.reload()
					})
				}
				panel.append(permissionWrap, savePermissions)
			}
		} catch {
			const error = document.createElement("p")
			error.textContent = "Details could not be displayed."
			panel.append(error)
		}
	}
	document.addEventListener("click", detailHandler)
	removeTabHandlers.push(() =>
		document.removeEventListener("click", detailHandler),
	)
	document
		.querySelectorAll<HTMLElement>("[data-admin-section-tab]")
		.forEach((tab) => {
			const handler = () => {
				const section = tab.dataset.adminSectionTab
				if (!section || tab.hidden) return
				document
					.querySelectorAll<HTMLElement>("[data-admin-section-tab]")
					.forEach((item) => {
						const active = item === tab
						item.classList.toggle("active", active)
						item.setAttribute("aria-pressed", String(active))
					})
				document
					.querySelectorAll<HTMLElement>("[data-admin-section]")
					.forEach((item) => {
						const active = item.dataset.adminSection === section
						item.classList.toggle("active", active)
						if (active)
							item.scrollIntoView({ behavior: "smooth", block: "start" })
					})
				const nextUrl = new URL(window.location.href)
				nextUrl.searchParams.set("section", section)
				window.history.replaceState(window.history.state, "", nextUrl)
			}
			tab.addEventListener("click", handler)
			removeTabHandlers.push(() => tab.removeEventListener("click", handler))
		})

	let cancelled = false
	let scheduleDate = new Date()
	let scheduleMode: "day" | "week" = "week"
	let scheduleBookings: AdminSnapshotRecord[] = []
	let selectedScheduleBookingId = ""
	let visibleScheduleBookingIds: string[] = []
	const scheduleDateKey = (date: Date): string =>
		`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
	const bookingDateKey = (value: unknown): string => {
		if (typeof value === "string") {
			const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/)
			if (match) return match[1]
		}
		const date = value instanceof Date ? value : new Date(String(value ?? ""))
		return Number.isNaN(date.getTime()) ? "" : scheduleDateKey(date)
	}
	const bookingTimeMinutes = (value: unknown): number => {
		const text = String(value ?? "")
			.trim()
			.toLowerCase()
			.replace(/\./g, "")
			.replace(/\s+/g, "")
		const match = text.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm)?$/)
		if (!match) return 9 * 60
		let hours = Number(match[1])
		const minutes = Number(match[2] ?? 0)
		if (minutes > 59) return 9 * 60
		if (match[3] === "pm" && hours < 12) hours += 12
		if (match[3] === "am" && hours === 12) hours = 0
		if (!match[3] && hours === 24 && minutes === 0) hours = 0
		return hours >= 0 && hours < 24 ? hours * 60 + minutes : 9 * 60
	}
	const scheduleCustomerName = (booking: AdminSnapshotRecord): string =>
		`${String(booking.firstName ?? "")} ${String(booking.lastName ?? "")}`.trim() ||
		String(booking.name ?? "Unknown Customer")
	const scheduleStatus = (booking: AdminSnapshotRecord): string =>
		String(booking.status ?? "PENDING")
			.toLowerCase()
			.replace(/[_-]+/g, " ")
	const renderScheduleDetails = (booking?: AdminSnapshotRecord): void => {
		const details = document.getElementById("adminScheduleDetails")
		if (!details) return
		if (!booking) {
			const empty = document.createElement("div")
			empty.className = "admin-empty-state"
			empty.textContent =
				"Click a calendar event to view booking details and quick actions."
			details.replaceChildren(empty)
			return
		}
		const article = document.createElement("article")
		article.className = "admin-booking-item admin-schedule-detail-card"
		const head = document.createElement("div")
		head.className = "admin-booking-item-head"
		const identity = document.createElement("div")
		const name = document.createElement("div")
		name.className = "admin-booking-name"
		name.textContent = scheduleCustomerName(booking)
		const id = document.createElement("div")
		id.className = "admin-booking-id"
		id.textContent = `Booking ID: ${String(booking.id ?? "N/A")}`
		identity.append(name, id)
		const badge = document.createElement("span")
		badge.className = `admin-status-badge admin-status-${scheduleStatus(booking).replace(/\s+/g, "-")}`
		badge.textContent = scheduleStatus(booking)
		head.append(identity, badge)
		const meta = document.createElement("div")
		meta.className = "admin-booking-meta"
		const dateKey = bookingDateKey(booking.appointmentDate)
		const date = dateKey ? new Date(`${dateKey}T12:00:00`) : null
		const dateLabel =
			date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : "N/A"
		const stylist =
			typeof booking.stylist === "object" &&
			booking.stylist !== null &&
			"name" in booking.stylist &&
			typeof booking.stylist.name === "string"
				? booking.stylist.name
				: "Any Available"
		const fields: Array<[string, unknown]> = [
			["Service", booking.serviceName],
			["Stylist", stylist],
			["Date", dateLabel],
			["Time", booking.timeLabel],
			["Email", booking.email],
			["Phone", booking.phone],
		]
		fields.forEach(([label, value]) => {
			const field = document.createElement("div")
			const fieldLabel = document.createElement("span")
			fieldLabel.textContent = `${label}: `
			field.append(fieldLabel, document.createTextNode(String(value || "N/A")))
			meta.append(field)
		})
		const request = document.createElement("div")
		request.className = "admin-booking-special-request"
		const requestLabel = document.createElement("span")
		requestLabel.textContent = "Special Request:"
		const requestText = document.createElement("p")
		requestText.textContent = String(
			booking.specialRequests || "No special request provided.",
		)
		request.append(requestLabel, requestText)
		const inspiration = document.createElement("div")
		inspiration.className = "admin-booking-inspiration"
		const inspirationLabel = document.createElement("span")
		inspirationLabel.textContent = "Inspiration Image: "
		const inspirationUrl =
			typeof booking.inspirationImageUrl === "string"
				? booking.inspirationImageUrl.trim()
				: ""
		if (inspirationUrl) {
			try {
				const safeInspirationUrl = new URL(
					inspirationUrl,
					window.location.origin,
				)
				if (
					safeInspirationUrl.protocol === "http:" ||
					safeInspirationUrl.protocol === "https:"
				) {
					const link = document.createElement("a")
					link.className = "admin-inline-link"
					link.href = safeInspirationUrl.href
					link.target = "_blank"
					link.rel = "noopener noreferrer"
					link.textContent = "Open full image"
					inspiration.append(inspirationLabel, link)
				} else {
					inspiration.append(
						inspirationLabel,
						document.createTextNode("Not provided"),
					)
				}
			} catch {
				inspiration.append(
					inspirationLabel,
					document.createTextNode("Not provided"),
				)
			}
		} else {
			inspiration.append(
				inspirationLabel,
				document.createTextNode("Not provided"),
			)
		}
		const actions = document.createElement("div")
		actions.className = "admin-booking-actions admin-schedule-detail-actions"
		const addNavigation = (
			direction: "previous" | "next",
			label: string,
		): void => {
			const button = document.createElement("button")
			button.type = "button"
			button.className = `admin-action-btn admin-schedule-${direction}-btn`
			button.dataset.scheduleNav = direction
			button.textContent = label
			actions.append(button)
		}
		addNavigation("previous", "← Previous Booking")
		addNavigation("next", "Next Booking →")
		const status = String(booking.status ?? "PENDING")
		const addStatusAction = (
			label: string,
			nextStatus: string,
			danger = false,
		): void => {
			const button = document.createElement("button")
			button.type = "button"
			button.className = `admin-action-btn admin-platform-action${danger ? " danger" : ""}`
			button.dataset.adminAction = "booking-status"
			button.dataset.adminId = String(booking.id ?? "")
			button.dataset.status = nextStatus
			button.textContent = label
			actions.append(button)
		}
		if (status === "PENDING") {
			addStatusAction("Confirm", "CONFIRMED")
			addStatusAction("Cancel + Release Slot", "CANCELLED", true)
		} else if (status === "CONFIRMED") {
			addStatusAction("Complete + Release Slot", "COMPLETED")
			addStatusAction("Cancel + Release Slot", "CANCELLED", true)
		} else if (status === "WAITLISTED") {
			const waitlistEntry = booking.waitlistEntry
			const waitlistEntryId =
				typeof waitlistEntry === "object" &&
				waitlistEntry !== null &&
				"id" in waitlistEntry &&
				typeof waitlistEntry.id === "string"
					? waitlistEntry.id
					: ""
			if (waitlistEntryId) {
				const move = document.createElement("button")
				move.type = "button"
				move.className = "admin-action-btn admin-platform-action"
				move.dataset.adminAction = "waitlist-convert"
				move.dataset.adminId = waitlistEntryId
				move.textContent = "Move to Confirmed"
				actions.append(move)
			} else {
				const note = document.createElement("span")
				note.className = "admin-empty-state"
				note.textContent =
					"This booking is not linked to an actionable waitlist entry."
				actions.append(note)
			}
		} else {
			const note = document.createElement("button")
			note.type = "button"
			note.className = "admin-action-btn"
			note.disabled = true
			note.textContent = "No quick actions available"
			actions.append(note)
		}
		article.append(head, meta, request, inspiration, actions)
		details.replaceChildren(article)
	}
	const renderSchedule = () => {
		const grid = document.getElementById("adminScheduleGrid")
		if (!grid) return
		const start = new Date(scheduleDate)
		start.setHours(0, 0, 0, 0)
		if (scheduleMode === "week") {
			const day = start.getDay()
			start.setDate(start.getDate() - (day === 0 ? 6 : day - 1))
		}
		const days = scheduleMode === "day" ? 1 : 7
		grid.replaceChildren()
		grid.classList.toggle("is-week-view", scheduleMode === "week")
		const visibleBookings: AdminSnapshotRecord[] = []
		for (let offset = 0; offset < days; offset += 1) {
			const date = new Date(start)
			date.setDate(start.getDate() + offset)
			const key = scheduleDateKey(date)
			const column = document.createElement("div")
			column.className = "admin-schedule-day-column"
			const header = document.createElement("div")
			header.className = "admin-schedule-day-header"
			const heading = document.createElement("h4")
			heading.textContent = date.toLocaleDateString(undefined, {
				weekday: "short",
			})
			const dayItems = scheduleBookings
				.filter((record) => bookingDateKey(record.appointmentDate) === key)
				.sort(
					(a, b) =>
						bookingTimeMinutes(a.timeLabel) - bookingTimeMinutes(b.timeLabel),
				)
			const dayCount = document.createElement("p")
			dayCount.className = "admin-schedule-day-count"
			dayCount.textContent = `${dayItems.length} appointment${dayItems.length === 1 ? "" : "s"}`
			const dateLabel = document.createElement("p")
			dateLabel.className = "admin-schedule-day-date"
			dateLabel.textContent = date.toLocaleDateString(undefined, {
				month: "short",
				day: "numeric",
			})
			header.append(heading, dateLabel, dayCount)
			column.append(header)
			const eventList = document.createElement("div")
			eventList.className = "admin-schedule-day-events"
			if (!dayItems.length) {
				const empty = document.createElement("p")
				empty.className = "admin-schedule-empty-day"
				empty.textContent = "No appointments"
				eventList.append(empty)
			}
			const buckets = [
				{ label: "Morning", start: 6 * 60, end: 12 * 60 },
				{ label: "Afternoon", start: 12 * 60, end: 17 * 60 },
				{ label: "Evening", start: 17 * 60, end: 22 * 60 },
				{ label: "Late Night", start: 22 * 60, end: 24 * 60 },
			]
			buckets.forEach((bucket) => {
				const bucketItems = dayItems.filter((record) => {
					const minutes = bookingTimeMinutes(record.timeLabel)
					return bucket.label === "Late Night"
						? minutes < 6 * 60 || minutes >= bucket.start
						: minutes >= bucket.start && minutes < bucket.end
				})
				if (!bucketItems.length) return
				const section = document.createElement("section")
				section.className = "admin-schedule-bucket"
				const bucketLabel = document.createElement("div")
				bucketLabel.className = "admin-schedule-bucket-label"
				bucketLabel.textContent = bucket.label
				section.append(bucketLabel)
				bucketItems.forEach((record) => {
					const id = String(record.id ?? "")
					if (!id) return
					visibleBookings.push(record)
					const event = document.createElement("button")
					event.type = "button"
					event.className = `admin-schedule-event admin-status-${scheduleStatus(record).replace(/\s+/g, "-")}${id === selectedScheduleBookingId ? " is-selected" : ""}`
					event.dataset.scheduleBooking = id
					event.setAttribute(
						"aria-pressed",
						String(id === selectedScheduleBookingId),
					)
					const time = document.createElement("span")
					time.className = "admin-schedule-event-time"
					time.textContent = String(record.timeLabel ?? "Time")
					const customer = document.createElement("span")
					customer.className = "admin-schedule-event-name"
					customer.textContent = scheduleCustomerName(record)
					const service = document.createElement("span")
					service.className = "admin-schedule-event-service"
					service.textContent = String(record.serviceName ?? "Appointment")
					event.append(time, customer, service)
					event.title = `${scheduleCustomerName(record)} · ${scheduleStatus(record)}`
					section.append(event)
				})
				eventList.append(section)
			})
			grid.append(column)
			column.append(eventList)
		}
		visibleScheduleBookingIds = visibleBookings.map((booking) =>
			String(booking.id ?? ""),
		)
		if (!visibleScheduleBookingIds.includes(selectedScheduleBookingId))
			selectedScheduleBookingId = visibleScheduleBookingIds[0] ?? ""
		grid
			.querySelectorAll<HTMLButtonElement>("[data-schedule-booking]")
			.forEach((button) => {
				const isSelected =
					button.dataset.scheduleBooking === selectedScheduleBookingId
				button.classList.toggle("is-selected", isSelected)
				button.setAttribute("aria-pressed", String(isSelected))
			})
		const selected = scheduleBookings.find(
			(booking) => String(booking.id ?? "") === selectedScheduleBookingId,
		)
		renderScheduleDetails(selected)
		const label = document.getElementById("adminScheduleRangeLabel")
		if (label)
			label.textContent =
				scheduleMode === "day"
					? start.toLocaleDateString(undefined, {
							weekday: "long",
							month: "long",
							day: "numeric",
							year: "numeric",
						})
					: `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
	}
	const scheduleHandler = (event: Event) => {
		const target = event.target
		if (!(target instanceof HTMLElement)) return
		const scheduleEvent = target.closest<HTMLButtonElement>(
			"[data-schedule-booking]",
		)
		if (scheduleEvent?.dataset.scheduleBooking) {
			selectedScheduleBookingId = scheduleEvent.dataset.scheduleBooking
			renderSchedule()
			return
		}
		const scheduleNav = target.closest<HTMLButtonElement>("[data-schedule-nav]")
		if (scheduleNav?.dataset.scheduleNav && visibleScheduleBookingIds.length) {
			const index = visibleScheduleBookingIds.indexOf(selectedScheduleBookingId)
			const nextIndex =
				scheduleNav.dataset.scheduleNav === "previous"
					? index <= 0
						? visibleScheduleBookingIds.length - 1
						: index - 1
					: (index + 1) % visibleScheduleBookingIds.length
			selectedScheduleBookingId = visibleScheduleBookingIds[nextIndex]
			renderSchedule()
			return
		}
		if (target.id === "adminScheduleToday") scheduleDate = new Date()
		if (target.id === "adminSchedulePrev")
			scheduleDate.setDate(
				scheduleDate.getDate() - (scheduleMode === "day" ? 1 : 7),
			)
		if (target.id === "adminScheduleNext")
			scheduleDate.setDate(
				scheduleDate.getDate() + (scheduleMode === "day" ? 1 : 7),
			)
		const view = target.closest<HTMLElement>("[data-schedule-view]")?.dataset
			.scheduleView
		if (view === "day" || view === "week") {
			scheduleMode = view
			document
				.querySelectorAll<HTMLButtonElement>("[data-schedule-view]")
				.forEach((button) => {
					const active = button.dataset.scheduleView === view
					button.classList.toggle("active", active)
					button.setAttribute("aria-pressed", String(active))
				})
		}
		if (
			target.id === "adminScheduleToday" ||
			target.id === "adminSchedulePrev" ||
			target.id === "adminScheduleNext" ||
			view
		)
			renderSchedule()
	}
	document.addEventListener("click", scheduleHandler)
	removeTabHandlers.push(() =>
		document.removeEventListener("click", scheduleHandler),
	)
	// Bind content forms immediately after the admin markup mounts. The snapshot
	// populates lists asynchronously and must not control whether Save/Edit
	// buttons are interactive.
	removeTabHandlers.push(bindLegacyContentForms(tenantSlug))
	void fetch(`/api/manage/${encodeURIComponent(tenantSlug)}/snapshot`, {
		credentials: "same-origin",
		cache: "no-store",
	})
		.then(async (response) => {
			if (!response.ok) throw new Error("Admin data could not be loaded.")
			return (await response.json()) as AdminSnapshotRecord
		})
		.then((snapshot) => {
			if (cancelled) return
			const bookings = Array.isArray(snapshot.bookings) ? snapshot.bookings : []
			const waitlist = Array.isArray(snapshot.waitlist) ? snapshot.waitlist : []
			const reviews = Array.isArray(snapshot.reviews) ? snapshot.reviews : []
			const messages = Array.isArray(snapshot.messages) ? snapshot.messages : []
			const gallery = Array.isArray(snapshot.gallery) ? snapshot.gallery : []
			const blogs = Array.isArray(snapshot.blogs) ? snapshot.blogs : []
			const services = Array.isArray(snapshot.services) ? snapshot.services : []
			removeTabHandlers.push(bindStorefrontDesignEditor(tenantSlug, snapshot))
			renderServiceCategoryControls(services)
			scheduleBookings = bookings.filter(
				(item): item is AdminSnapshotRecord =>
					typeof item === "object" && item !== null,
			)
			renderSchedule()
			const team = Array.isArray(snapshot.team) ? snapshot.team : []
			const security = snapshot.security as AdminSnapshotRecord | undefined
			const securityLogins = Array.isArray(security?.logins)
				? security.logins
				: []
			const securityAlerts = Array.isArray(security?.alerts)
				? security.alerts
				: []
			const accountChanges = Array.isArray(security?.changes)
				? security.changes
				: []
			const securitySessions = Array.isArray(security?.sessions)
				? security.sessions
				: []
			const securityTimeline = Array.isArray(security?.timeline)
				? security.timeline
				: []
			const securityStats =
				security?.stats && typeof security.stats === "object"
					? (security.stats as AdminSnapshotRecord)
					: {}
			renderAdminSnapshotList(
				"adminBookingsList",
				bookings,
				"No bookings found.",
			)
			renderAdminSnapshotList(
				"adminWaitlistList",
				waitlist,
				"No waitlist entries found.",
			)
			bookingFilters.apply()
			renderAdminSnapshotList("adminReviewsList", reviews, "No reviews found.")
			renderAdminSnapshotList(
				"adminContactList",
				messages,
				"No messages found.",
			)
			applyLegacyReviewAndMessageFilters()
			renderAdminSnapshotList(
				"adminGalleryList",
				gallery,
				"No gallery styles found.",
			)
			renderAdminSnapshotList("adminBlogsList", blogs, "No blog posts found.")
			renderAdminSnapshotList(
				"adminServicesList",
				services,
				"No services found.",
			)
			renderAdminSnapshotList("adminAdminsList", team, "No team members found.")
			renderAdminSnapshotList(
				"adminSecurityActivityList",
				securityLogins,
				"No security activity found.",
			)
			renderAdminSnapshotList(
				"adminSecurityAlertsList",
				securityAlerts,
				"No security alerts found.",
			)
			renderAdminSnapshotList(
				"adminAccountHistoryList",
				accountChanges,
				"No account changes found.",
			)
			renderAdminSnapshotList(
				"adminSessionsList",
				securitySessions,
				"No active session data found.",
			)
			renderAdminSnapshotList(
				"adminTimelineList",
				securityTimeline,
				"No activity timeline events found.",
			)
			removeSnapshotFilters = bindAdminSnapshotFilters()
			removeTabHandlers.push(() => removeSnapshotFilters())
			const csvExportButton = document.getElementById("adminSecurityExportCsvBtn")
			if (csvExportButton instanceof HTMLButtonElement) {
				csvExportButton.onclick = () => exportVisibleSecurityRows("csv")
			}
			const excelExportButton = document.getElementById("adminSecurityExportExcelBtn")
			if (excelExportButton instanceof HTMLButtonElement) {
				excelExportButton.onclick = () => exportVisibleSecurityRows("excel")
			}
			const counts: Record<string, number> = {
				adminTotalCount: bookings.length,
				adminPendingCount: bookings.filter(
					(item) => (item as AdminSnapshotRecord).status === "PENDING",
				).length,
				adminConfirmedCount: bookings.filter(
					(item) => (item as AdminSnapshotRecord).status === "CONFIRMED",
				).length,
				adminWaitlistedBookingCount: bookings.filter(
					(item) => (item as AdminSnapshotRecord).status === "WAITLISTED",
				).length,
				adminCompletedCount: bookings.filter(
					(item) => (item as AdminSnapshotRecord).status === "COMPLETED",
				).length,
				adminCancelledCount: bookings.filter(
					(item) => (item as AdminSnapshotRecord).status === "CANCELLED",
				).length,
				adminReviewsTotalCount: reviews.length,
				adminReviewsPendingCount: reviews.filter(
					(item) => (item as AdminSnapshotRecord).status === "PENDING",
				).length,
				adminReviewsApprovedCount: reviews.filter(
					(item) => (item as AdminSnapshotRecord).status === "APPROVED",
				).length,
				adminReviewsRejectedCount: reviews.filter(
					(item) => (item as AdminSnapshotRecord).status === "REJECTED",
				).length,
				adminMessagesTotalCount: messages.length,
				adminMessagesNewCount: messages.filter(
					(item) => (item as AdminSnapshotRecord).status === "NEW",
				).length,
				adminMessagesReadCount: messages.filter(
					(item) => (item as AdminSnapshotRecord).status === "READ",
				).length,
				adminMessagesResolvedCount: messages.filter(
					(item) => (item as AdminSnapshotRecord).status === "RESOLVED",
				).length,
				adminWaitlistTotalCount: waitlist.length,
				adminWaitlistWaitingCount: waitlist.filter(
					(item) => (item as AdminSnapshotRecord).status === "WAITING",
				).length,
				adminWaitlistContactedCount: waitlist.filter(
					(item) => (item as AdminSnapshotRecord).status === "CONTACTED",
				).length,
				adminWaitlistBookedCount: waitlist.filter(
					(item) => (item as AdminSnapshotRecord).status === "BOOKED",
				).length,
				adminWaitlistCancelledCount: waitlist.filter(
					(item) => (item as AdminSnapshotRecord).status === "CANCELLED",
				).length,
				adminAdminsTotalCount: team.length,
				adminAdminsActiveCount: team.filter(
					(item) => (item as AdminSnapshotRecord).status === "ACTIVE",
				).length,
				adminAdminsSuperCount: team.filter(
					(item) =>
						(item as AdminSnapshotRecord).role === "OWNER" ||
						(item as AdminSnapshotRecord).role === "ADMIN",
				).length,
				adminAdminsStandardCount: team.filter(
					(item) => (item as AdminSnapshotRecord).role === "STAFF",
				).length,
				adminSecurityTotalCount: Number(
					securityStats.totalLogins ?? securityLogins.length,
				),
				adminSecuritySuccessCount: Number(securityStats.successfulLogins ?? 0),
				adminSecurityFailedCount: Number(securityStats.failedLogins ?? 0),
				adminSecuritySuspiciousCount: Number(securityStats.suspiciousLogins ?? 0),
				adminSecurityLockedCount: Number(securityStats.lockedAccounts ?? 0),
				adminSecurityRepeatedWrongCount: Number(
					securityStats.repeatedWrongPasswords ?? 0,
				),
				adminSecurityHighRiskCount: Number(securityStats.highRiskLogins ?? 0),
				adminSecurityAlertsTotalCount: Number(
					securityStats.totalAlerts ?? securityAlerts.length,
				),
				adminSecurityAlertsOpenCount: Number(securityStats.openAlerts ?? 0),
				adminSecurityAlertsHighCount: Number(
					securityStats.highSeverityAlerts ?? 0,
				),
				adminAccountHistoryTotalCount: Number(
					securityStats.totalAccountChanges ?? accountChanges.length,
				),
				adminSessionsTotalCount: securitySessions.length,
				adminSessionsOnlineCount: Number(
					securityStats.activeSessions ?? securitySessions.length,
				),
				adminSessionsMultiDeviceCount: (() => {
					const users = new Map<string, number>()
					securitySessions.forEach((item) => {
						const userId = (item as AdminSnapshotRecord).userId
						if (typeof userId === "string" && userId)
							users.set(userId, (users.get(userId) ?? 0) + 1)
					})
					return Array.from(users.values()).filter((count) => count >= 2).length
				})(),
				adminSessionsOnlineUsersCount: Number(securityStats.activeUsers ?? 0),
				adminTimelineTotalCount: Number(
					securityStats.totalTimelineEvents ?? securityTimeline.length,
				),
				adminSecurityWidgetTotalLoginsToday: Number(
					securityStats.totalLoginsToday ?? 0,
				),
				adminSecurityWidgetActiveUsersNow: Number(
					securityStats.activeUsers ?? 0,
				),
				adminSecurityWidgetFailedLoginAttempts: Number(
					securityStats.failedLoginAttemptsToday ?? 0,
				),
				adminSecurityWidgetNewRegistrations: Number(
					securityStats.newRegistrations ?? 0,
				),
				adminSecurityWidgetReturningCustomers: Number(
					securityStats.returningCustomers ?? 0,
				),
				adminSecurityWidgetAnonymousUsers: Number(
					securityStats.anonymousUsers ?? 0,
				),
				adminSecurityWidgetGoogleSignIns: Number(
					securityStats.googleSignIns ?? 0,
				),
				adminSecurityWidgetEmailSignIns: Number(
					securityStats.emailSignIns ?? 0,
				),
			}
			Object.entries(counts).forEach(([id, count]) => {
				const element = document.getElementById(id)
				if (element) element.textContent = String(count)
			})
			let snapshotRefreshInFlight = false
			const refreshSnapshot = async (): Promise<void> => {
				if (
					cancelled ||
					document.visibilityState !== "visible" ||
					snapshotRefreshInFlight
				)
					return
				snapshotRefreshInFlight = true
				try {
					const response = await fetch(
						`/api/manage/${encodeURIComponent(tenantSlug)}/snapshot`,
						{ credentials: "same-origin", cache: "no-store" },
					)
					if (!response.ok) return
					const latest = (await response.json()) as AdminSnapshotRecord
					const latestBookings = Array.isArray(latest.bookings)
						? latest.bookings
						: []
					const latestWaitlist = Array.isArray(latest.waitlist)
						? latest.waitlist
						: []
					const latestReviews = Array.isArray(latest.reviews)
						? latest.reviews
						: []
					const latestMessages = Array.isArray(latest.messages)
						? latest.messages
						: []
					const latestGallery = Array.isArray(latest.gallery)
						? latest.gallery
						: []
					const latestBlogs = Array.isArray(latest.blogs) ? latest.blogs : []
					const latestServices = Array.isArray(latest.services)
						? latest.services
						: []
					const latestTeam = Array.isArray(latest.team) ? latest.team : []
					const latestSecurity = recordValue(latest.security)
					const latestLogins = Array.isArray(latestSecurity.logins)
						? latestSecurity.logins
						: []
					const latestAlerts = Array.isArray(latestSecurity.alerts)
						? latestSecurity.alerts
						: []
					const latestChanges = Array.isArray(latestSecurity.changes)
						? latestSecurity.changes
						: []
					const latestSessions = Array.isArray(latestSecurity.sessions)
						? latestSecurity.sessions
						: []
					const latestTimeline = Array.isArray(latestSecurity.timeline)
						? latestSecurity.timeline
						: []
					const latestStats = recordValue(latestSecurity.stats)
					scheduleBookings = latestBookings.filter(
						(item): item is AdminSnapshotRecord =>
							typeof item === "object" && item !== null,
					)
					renderSchedule()
					renderAdminSnapshotList(
						"adminBookingsList",
						latestBookings,
						"No bookings found.",
					)
					renderAdminSnapshotList(
						"adminWaitlistList",
						latestWaitlist,
						"No waitlist entries found.",
					)
					bookingFilters.apply()
					renderAdminSnapshotList(
						"adminReviewsList",
						latestReviews,
						"No reviews found.",
					)
					renderAdminSnapshotList(
						"adminContactList",
						latestMessages,
						"No messages found.",
					)
					applyLegacyReviewAndMessageFilters()
					renderAdminSnapshotList(
						"adminGalleryList",
						latestGallery,
						"No gallery styles found.",
					)
					renderAdminSnapshotList(
						"adminBlogsList",
						latestBlogs,
						"No blog posts found.",
					)
					renderAdminSnapshotList(
						"adminServicesList",
						latestServices,
						"No services found.",
					)
					renderServiceCategoryControls(latestServices)
					renderAdminSnapshotList(
						"adminAdminsList",
						latestTeam,
						"No team members found.",
					)
					renderAdminSnapshotList(
						"adminSecurityActivityList",
						latestLogins,
						"No security activity found.",
					)
					renderAdminSnapshotList(
						"adminSecurityAlertsList",
						latestAlerts,
						"No security alerts found.",
					)
					renderAdminSnapshotList(
						"adminAccountHistoryList",
						latestChanges,
						"No account changes found.",
					)
					renderAdminSnapshotList(
						"adminSessionsList",
						latestSessions,
						"No active session data found.",
					)
					renderAdminSnapshotList(
						"adminTimelineList",
						latestTimeline,
						"No activity timeline events found.",
					)
					const latestCounts: Record<string, number> = {
						adminTotalCount: latestBookings.length,
						adminPendingCount: latestBookings.filter(
							(item) => recordValue(item).status === "PENDING",
						).length,
						adminConfirmedCount: latestBookings.filter(
							(item) => recordValue(item).status === "CONFIRMED",
						).length,
						adminWaitlistedBookingCount: latestBookings.filter(
							(item) => recordValue(item).status === "WAITLISTED",
						).length,
						adminCompletedCount: latestBookings.filter(
							(item) => recordValue(item).status === "COMPLETED",
						).length,
						adminCancelledCount: latestBookings.filter(
							(item) => recordValue(item).status === "CANCELLED",
						).length,
						adminReviewsTotalCount: latestReviews.length,
						adminReviewsPendingCount: latestReviews.filter(
							(item) => recordValue(item).status === "PENDING",
						).length,
						adminReviewsApprovedCount: latestReviews.filter(
							(item) => recordValue(item).status === "APPROVED",
						).length,
						adminReviewsRejectedCount: latestReviews.filter(
							(item) => recordValue(item).status === "REJECTED",
						).length,
						adminMessagesTotalCount: latestMessages.length,
						adminMessagesNewCount: latestMessages.filter(
							(item) => recordValue(item).status === "NEW",
						).length,
						adminMessagesReadCount: latestMessages.filter(
							(item) => recordValue(item).status === "READ",
						).length,
						adminMessagesResolvedCount: latestMessages.filter(
							(item) => recordValue(item).status === "RESOLVED",
						).length,
						adminWaitlistTotalCount: latestWaitlist.length,
						adminWaitlistWaitingCount: latestWaitlist.filter(
							(item) => recordValue(item).status === "WAITING",
						).length,
						adminWaitlistContactedCount: latestWaitlist.filter(
							(item) => recordValue(item).status === "CONTACTED",
						).length,
						adminWaitlistBookedCount: latestWaitlist.filter(
							(item) => recordValue(item).status === "BOOKED",
						).length,
						adminWaitlistCancelledCount: latestWaitlist.filter(
							(item) => recordValue(item).status === "CANCELLED",
						).length,
						adminAdminsTotalCount: latestTeam.length,
						adminAdminsActiveCount: latestTeam.filter(
							(item) => recordValue(item).status === "ACTIVE",
						).length,
						adminAdminsSuperCount: latestTeam.filter(
							(item) =>
								recordValue(item).role === "OWNER" ||
								recordValue(item).role === "ADMIN",
						).length,
						adminAdminsStandardCount: latestTeam.filter(
							(item) => recordValue(item).role === "STAFF",
						).length,
						adminSecurityTotalCount: Number(
							latestStats.totalLogins ?? latestLogins.length,
						),
						adminSecuritySuccessCount: Number(
							latestStats.successfulLogins ?? 0,
						),
						adminSecurityFailedCount: Number(latestStats.failedLogins ?? 0),
						adminSecuritySuspiciousCount: Number(
							latestStats.suspiciousLogins ?? 0,
						),
						adminSecurityLockedCount: Number(latestStats.lockedAccounts ?? 0),
						adminSecurityRepeatedWrongCount: Number(
							latestStats.repeatedWrongPasswords ?? 0,
						),
						adminSecurityHighRiskCount: Number(latestStats.highRiskLogins ?? 0),
						adminSecurityAlertsTotalCount: Number(
							latestStats.totalAlerts ?? latestAlerts.length,
						),
						adminSecurityAlertsOpenCount: Number(latestStats.openAlerts ?? 0),
						adminSecurityAlertsHighCount: Number(
							latestStats.highSeverityAlerts ?? 0,
						),
						adminAccountHistoryTotalCount: Number(
							latestStats.totalAccountChanges ?? latestChanges.length,
						),
						adminSessionsTotalCount: latestSessions.length,
						adminSessionsOnlineCount: Number(
							latestStats.activeSessions ?? latestSessions.length,
						),
						adminSessionsMultiDeviceCount: (() => {
							const users = new Map<string, number>()
							latestSessions.forEach((item) => {
								const userId = recordValue(item).userId
								if (typeof userId === "string" && userId)
									users.set(userId, (users.get(userId) ?? 0) + 1)
							})
							return Array.from(users.values()).filter((count) => count >= 2).length
						})(),
						adminSessionsOnlineUsersCount: Number(latestStats.activeUsers ?? 0),
						adminTimelineTotalCount: Number(
							latestStats.totalTimelineEvents ?? latestTimeline.length,
						),
						adminSecurityWidgetTotalLoginsToday: Number(
							latestStats.totalLoginsToday ?? 0,
						),
						adminSecurityWidgetActiveUsersNow: Number(
							latestStats.activeUsers ?? 0,
						),
						adminSecurityWidgetFailedLoginAttempts: Number(
							latestStats.failedLoginAttemptsToday ?? 0,
						),
						adminSecurityWidgetNewRegistrations: Number(
							latestStats.newRegistrations ?? 0,
						),
						adminSecurityWidgetReturningCustomers: Number(
							latestStats.returningCustomers ?? 0,
						),
						adminSecurityWidgetAnonymousUsers: Number(
							latestStats.anonymousUsers ?? 0,
						),
						adminSecurityWidgetGoogleSignIns: Number(
							latestStats.googleSignIns ?? 0,
						),
						adminSecurityWidgetEmailSignIns: Number(
							latestStats.emailSignIns ?? 0,
						),
					}
					Object.entries(latestCounts).forEach(([id, count]) => {
						const element = document.getElementById(id)
						if (element) element.textContent = String(count)
					})
					removeSnapshotFilters()
					removeSnapshotFilters = bindAdminSnapshotFilters()
				} catch (error) {
					console.error("Admin snapshot refresh failed", error)
				} finally {
					snapshotRefreshInFlight = false
				}
			}
			const refreshTimer = window.setInterval(
				() => void refreshSnapshot(),
				30_000,
			)
			const refreshOnVisibility = (): void => {
				if (document.visibilityState === "visible") void refreshSnapshot()
			}
			document.addEventListener("visibilitychange", refreshOnVisibility)
			removeTabHandlers.push(() => {
				window.clearInterval(refreshTimer)
				document.removeEventListener("visibilitychange", refreshOnVisibility)
			})
			const actionMessage = document.getElementById("adminActionMessage")
			if (actionMessage)
				actionMessage.textContent =
					"Admin data loaded from the platform database."
		})
		.catch((error: unknown) => {
			if (!cancelled && authMessage)
				authMessage.textContent =
					error instanceof Error
						? error.message
						: "Admin data could not be loaded."
		})

	return () => {
		cancelled = true
		removeTabHandlers.forEach((remove) => remove())
	}
}

function getFormValue(form: HTMLFormElement, name: string): string {
	const value = new FormData(form).get(name)
	return typeof value === "string" ? value.trim() : ""
}

function setBookingMessage(message: string, type: "error" | "success"): void {
	const element = document.getElementById("bookingMessage")
	if (!element) return
	element.textContent = message
	element.classList.remove("error", "success")
	element.classList.add(type)
}

function setBookingLoading(button: HTMLButtonElement, loading: boolean): void {
	button.disabled = loading
	button.setAttribute("aria-busy", String(loading))
	const label = button.querySelector<HTMLElement>("[data-booking-submit-label]")
	if (label) label.textContent = loading ? "Processing..." : "Confirm Booking"
	else button.textContent = loading ? "Processing..." : "Confirm Booking"
}

function showBookingSuccess(): void {
	const form = document.getElementById("bookingForm")
	const success = document.getElementById("bookingSuccess")
	if (!(form instanceof HTMLElement) || !(success instanceof HTMLElement))
		return

	form.style.display = "none"
	success.style.display = "block"
	success.setAttribute("tabindex", "-1")
	success.scrollIntoView({ behavior: "smooth", block: "center" })
	success.focus({ preventScroll: true })
}

function getConfiguredWhatsAppUrl(): string {
	const social = window.CLIENT_CONFIG?.social
	if (typeof social === "object" && social !== null && "whatsapp" in social) {
		const value = social.whatsapp
		if (typeof value === "string" && value.startsWith("https://")) return value
	}
	return "https://wa.me/254740470381"
}

function addTenantNavigationLinks(tenantSlug: string): () => void {
	const root = document.querySelector<HTMLElement>(".salon-storefront-root")
	if (!root) return () => undefined
	const actionBar = root.querySelector<HTMLElement>(".saas-tenant-mobile-actions")
	if (!actionBar) return () => undefined

	// The dashboard section ships hidden (display:none) so anchors alone can't
	// reveal it. For the Favorites/Account mobile tabs we reveal the section,
	// then smooth-scroll to the targeted dashboard card. The other tabs remain
	// plain hash links.
	const revealAndFocusDashboardCard = (cardId: string): boolean => {
		const section = document.getElementById("clientDashboard")
		if (section?.classList.contains("hidden")) {
			const authButton = document.getElementById("dashboardAuthBtn")
			if (
				authButton instanceof HTMLButtonElement &&
				!authButton.hidden &&
				!authButton.classList.contains("hidden")
			) {
				authButton.click()
				return true
			}
			section.classList.remove("hidden")
		}
		const target = document.getElementById(cardId)
		if (!target) return false
		target.scrollIntoView({ behavior: "smooth", block: "center" })
		target.setAttribute("tabindex", "-1")
		target.focus({ preventScroll: true })
		return true
	}

	const dashboardLinks = Array.from(actionBar.querySelectorAll<HTMLAnchorElement>("[data-dashboard-card]"))
	const revealHandlers = dashboardLinks.map((link) => {
		const handleClick = (event: MouseEvent): void => {
			event.preventDefault()
			const cardId = link.dataset.dashboardCard
			if (cardId) revealAndFocusDashboardCard(cardId)
		}
		link.addEventListener("click", handleClick)
		return () => link.removeEventListener("click", handleClick)
	})

	const footer = root.querySelector<HTMLElement>("footer.footer")
	const footerLink = document.createElement("a")
	footerLink.href = "/"
	footerLink.textContent = "Beauty Sphia Homepage"
	footerLink.className = "saas-platform-home-link"
	footerLink.setAttribute("data-saas-platform-link", tenantSlug)
	const quickLinks = root.querySelector<HTMLElement>(".footer-links")
	if (quickLinks) {
		const quickLinkItem = document.createElement("li")
		quickLinkItem.append(footerLink)
		quickLinks.append(quickLinkItem)
	} else if (footer) {
		footer.append(footerLink)
	}

	return () => {
		revealHandlers.forEach((cleanup) => cleanup())
		footerLink.remove()
	}
}

function openReferenceWhatsAppOrder(serviceName: string, price: string): void {
	const text =
		"Hello, I would like to order " +
		serviceName +
		(price ? " (" + price + ")" : "") +
		"."
	const baseUrl = getConfiguredWhatsAppUrl()
	const separator = baseUrl.includes("?") ? "&" : "?"
	window.open(
		baseUrl + separator + "text=" + encodeURIComponent(text),
		"_blank",
		"noopener,noreferrer",
	)
}

function setReferenceFormMessage(
	elementId: string,
	message: string,
	type: "error" | "success",
): void {
	const element = document.getElementById(elementId)
	if (!element) return
	element.textContent = message
	element.classList.remove("error", "success")
	element.classList.add(type)
	element.style.display = message ? "block" : "none"
}

function showTransientPopup(id: string, durationMs: number): () => void {
	const popup = document.getElementById(id)
	if (!(popup instanceof HTMLElement)) return () => undefined
	popup.classList.remove("show")
	void popup.offsetWidth
	popup.classList.add("show")
	const timer = window.setTimeout(
		() => popup.classList.remove("show"),
		durationMs,
	)
	return () => window.clearTimeout(timer)
}

async function readReferenceJson(
	response: Response,
): Promise<{ readonly error?: string; readonly message?: string }> {
	try {
		const payload: unknown = await response.json()
		if (typeof payload === "object" && payload !== null) {
			const error =
				"error" in payload && typeof payload.error === "string"
					? payload.error
					: undefined
			const message =
				"message" in payload && typeof payload.message === "string"
					? payload.message
					: undefined
			return { error, message }
		}
	} catch {
		return {}
	}
	return {}
}

function bindPublicParityAdapters(
	tenantSlug: string,
	turnstileSiteKey: string,
	galleryItems: readonly SalonGalleryItem[],
): () => void {
	const contactForm = document.getElementById("contactForm")
	const reviewForm = document.getElementById("reviewForm")
	const termsModal = document.getElementById("termsModal")
	const termsCheckbox = document.getElementById("termsConsentCheckbox")
	const termsAcceptButton = document.getElementById("acceptTermsBtn")
	const contactSuccessClose = document.getElementById(
		"contactSuccessPopupClose",
	)
	const closeTermsModal = () => {
		termsModal?.classList.remove("active")
		termsModal?.setAttribute("aria-hidden", "true")
		document.body.style.overflow = ""
	}
	const updateTermsAcceptance = (): void => {
		if (
			termsAcceptButton instanceof HTMLButtonElement &&
			termsCheckbox instanceof HTMLInputElement
		) {
			termsAcceptButton.disabled = !termsCheckbox.checked
		}
	}
	const acceptTerms = (): void => {
		if (!(termsCheckbox instanceof HTMLInputElement) || !termsCheckbox.checked)
			return
		try {
			localStorage.setItem("royal_braids_terms_accepted_v1", "true")
		} catch {
			// Continue for this visit when browser storage is unavailable.
		}
		closeTermsModal()
	}
	let contactSuccessCleanup = (): void => undefined
	const closeContactSuccess = (): void => {
		contactSuccessCleanup()
		const popup = document.getElementById("contactSuccessPopup")
		popup?.classList.remove("show")
	}
	try {
		if (localStorage.getItem("royal_braids_terms_accepted_v1") !== "true") {
			if (termsCheckbox instanceof HTMLInputElement)
				termsCheckbox.checked = false
			updateTermsAcceptance()
			setModalState("termsModal", true)
		}
	} catch {
		setModalState("termsModal", true)
	}
	if (contactForm instanceof HTMLFormElement)
		ensureTurnstile(contactForm, turnstileSiteKey)
	if (reviewForm instanceof HTMLFormElement)
		ensureTurnstile(reviewForm, turnstileSiteKey)

	const submitContact = async (event: Event): Promise<void> => {
		event.preventDefault()
		event.stopImmediatePropagation()
		if (!(contactForm instanceof HTMLFormElement)) return
		const submitButton = contactForm.querySelector<HTMLButtonElement>(
			"button[type=submit]",
		)
		if (submitButton) submitButton.disabled = true
		try {
			const response = await fetch("/api/contact", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					tenantSlug,
					name: getFormValue(contactForm, "name"),
					email: getFormValue(contactForm, "email"),
					subject: getFormValue(contactForm, "subject"),
					message: getFormValue(contactForm, "message"),
					turnstileToken: getTurnstileToken(contactForm),
				}),
			})
			const result = await readReferenceJson(response)
			if (response.ok) {
				setReferenceFormMessage(
					"contactFormMessage",
					"Thanks, your message has been sent.",
					"success",
				)
				contactForm.reset()
				contactSuccessCleanup = showTransientPopup("contactSuccessPopup", 5000)
			} else {
				setReferenceFormMessage(
					"contactFormMessage",
					result.error ?? "The message could not be sent.",
					"error",
				)
			}
		} catch {
			setReferenceFormMessage(
				"contactFormMessage",
				"The message could not be sent. Please try again.",
				"error",
			)
		} finally {
			resetTurnstile(contactForm)
			if (submitButton) submitButton.disabled = false
		}
	}

	const submitReview = async (event: Event): Promise<void> => {
		event.preventDefault()
		event.stopImmediatePropagation()
		if (!(reviewForm instanceof HTMLFormElement)) return
		const rating = document.getElementById("reviewRating")
		const service = document.getElementById("reviewService")
		const text = document.getElementById("reviewText")
		const submitButton = document.getElementById("submitReviewBtn")
		if (
			!(rating instanceof HTMLSelectElement) ||
			!(text instanceof HTMLTextAreaElement)
		)
			return
		if (submitButton instanceof HTMLButtonElement) submitButton.disabled = true
		try {
			const response = await fetch("/api/reviews", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					tenantSlug,
					rating: Number(rating.value),
					serviceName:
						service instanceof HTMLSelectElement ? service.value : "",
					text: text.value.trim(),
					turnstileToken: getTurnstileToken(reviewForm),
				}),
			})
			const result = await readReferenceJson(response)
			setReferenceFormMessage(
				"reviewMessage",
				response.ok
					? "Your review was submitted for approval."
					: (result.error ?? "The review could not be submitted."),
				response.ok ? "success" : "error",
			)
			if (response.ok) reviewForm.reset()
		} catch {
			setReferenceFormMessage(
				"reviewMessage",
				"The review could not be submitted. Please try again.",
				"error",
			)
		} finally {
			resetTurnstile(reviewForm)
			if (submitButton instanceof HTMLButtonElement)
				submitButton.disabled = false
		}
	}
	const favoriteLoginMessage = (galleryStyleId: string): string => {
		const galleryItem = galleryItems.find((item) => item.id === galleryStyleId)
		const category = galleryItem?.serviceCategory?.trim().toLowerCase() ?? ""
		const displayLabels: Readonly<Record<string, string>> = {
			"braids-services": "Braids",
			"hair-services": "Hair",
			"beauty-spa-services": "Beauty Spa",
			"nail-services": "Nails",
			"makeup-services": "Makeup",
			"barber-services": "Barber",
			"massage-wellness": "Massage",
			"eyebrow-lash-services": "Eyebrows & Lash",
			"bridal-event-packages": "Bridal / Event Packages",
			"cosmetics-products": "Cosmetics",
		}
		const label = displayLabels[category] ?? galleryItem?.serviceCategory?.trim() ?? "Gallery"
		const categoryText = label
			.replace(/\s+services$/i, "")
			.trim()
			.toLowerCase()
			.replace(/s$/, "")
		return `🔐 Log in to save this ${categoryText || "gallery"} style.`
	}

	const toggleFavorite = async (event: Event): Promise<void> => {
		const target = event.target
		if (!(target instanceof Element)) return
		const button = target.closest<HTMLElement>(
			".gallery-save-favorite-btn, #lightboxFavoriteBtn",
		)
		const galleryStyleId = button?.dataset.favStyleId
		if (!button || !galleryStyleId) return
		event.preventDefault()
		event.stopImmediatePropagation()
		const isSaved = button.getAttribute("aria-pressed") === "true"
		const originalText = button.textContent ?? "♡ Save"
		let stateUpdated = false
		if (button instanceof HTMLButtonElement) {
			button.disabled = true
			button.classList.add("btn-loading")
			button.setAttribute("aria-busy", "true")
			button.textContent = isSaved ? "Removing…" : "Saving…"
		}
		try {
			const response = await fetch("/api/favorites", {
				method: isSaved ? "DELETE" : "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ tenantSlug, galleryStyleId }),
			})
			const result = await readReferenceJson(response)
			if (!response.ok) {
				if (response.status === 401 || response.status === 403) {
					openSignInModal(favoriteLoginMessage(galleryStyleId))
					return
				}
				showFavoritesToast(
					result.error ?? "The gallery favorite could not be updated.",
				)
				return
			}
			setFavoriteButtonsState(galleryStyleId, !isSaved)
			stateUpdated = true
			showFavoritesToast(
				isSaved ? "Removed from favorites" : "Saved to favorites",
			)
			void loadReferenceDashboardData(tenantSlug)
		} catch {
			showFavoritesToast(
				"The gallery favorite could not be updated. Please try again.",
			)
		} finally {
			if (button instanceof HTMLButtonElement) {
				button.disabled = false
				button.classList.remove("btn-loading")
				button.removeAttribute("aria-busy")
				if (!stateUpdated) button.textContent = originalText
			}
		}
	}

	const cancelBooking = async (event: Event): Promise<void> => {
		const target = event.target
		if (!(target instanceof Element)) return
		const button = target.closest<HTMLButtonElement>(
			'[data-dashboard-booking-action="cancel"]',
		)
		const bookingId = button?.dataset.bookingId
		if (!button || !bookingId) return
		event.preventDefault()
		event.stopImmediatePropagation()
		button.disabled = true
		const response = await fetch("/api/account/bookings", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ tenantSlug, bookingId }),
		})
		const result = await readReferenceJson(response)
		if (!response.ok) {
			setDashboardMessage(
				result.error ?? "The booking could not be cancelled.",
				"error",
			)
			button.disabled = false
			return
		}
		button.textContent = "Cancelled"
		setDashboardMessage("Your booking was cancelled.", "success")
	}

	let rescheduleBookingId = ""
	const rescheduleBooking = async (event: Event): Promise<void> => {
		const target = event.target
		if (!(target instanceof Element)) return
		const button = target.closest<HTMLElement>(
			'[data-dashboard-booking-action="reschedule"]',
		)
		if (!button?.dataset.bookingId) return
		event.preventDefault()
		event.stopImmediatePropagation()
		rescheduleBookingId = button.dataset.bookingId
		const modal = document.getElementById("dashboardRescheduleModal")
		if (modal) {
			modal.classList.add("active")
			modal.setAttribute("aria-hidden", "false")
			document.body.style.overflow = "hidden"
		}
	}

	const saveRescheduledBooking = async (): Promise<void> => {
		const date = document.getElementById("dashboardRescheduleDate")
		const time = document.getElementById("dashboardRescheduleTime")
		const stylist = document.getElementById("dashboardRescheduleStylist")
		const save = document.getElementById("dashboardRescheduleSaveBtn")
		if (
			!(date instanceof HTMLInputElement) ||
			!(time instanceof HTMLSelectElement) ||
			!(stylist instanceof HTMLSelectElement) ||
			!rescheduleBookingId
		)
			return
		if (save instanceof HTMLButtonElement) save.disabled = true
		const response = await fetch("/api/account/bookings/reschedule", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				tenantSlug,
				bookingId: rescheduleBookingId,
				appointmentDate: date.value,
				timeLabel: time.value,
				stylistId: stylist.value || undefined,
			}),
		})
		const result = await readReferenceJson(response)
		const message = document.getElementById("dashboardRescheduleMessage")
		if (message) {
			message.textContent = response.ok
				? "Your booking was rescheduled."
				: (result.error ?? "The booking could not be rescheduled.")
			message.style.display = "block"
			message.classList.toggle("error", !response.ok)
			message.classList.toggle("success", response.ok)
		}
		if (response.ok) closeReschedule()
		if (save instanceof HTMLButtonElement) save.disabled = false
	}

	const closeReschedule = (): void => {
		const modal = document.getElementById("dashboardRescheduleModal")
		modal?.classList.remove("active")
		modal?.setAttribute("aria-hidden", "true")
		document.body.style.overflow = ""
		rescheduleBookingId = ""
	}

	contactForm?.addEventListener("submit", submitContact, true)
	reviewForm?.addEventListener("submit", submitReview, true)
	termsCheckbox?.addEventListener("change", updateTermsAcceptance)
	termsAcceptButton?.addEventListener("click", acceptTerms)
	contactSuccessClose?.addEventListener("click", closeContactSuccess)
	document.addEventListener("click", toggleFavorite, true)
	document.addEventListener("click", cancelBooking, true)
	document.addEventListener("click", rescheduleBooking, true)
	document
		.getElementById("dashboardRescheduleSaveBtn")
		?.addEventListener("click", saveRescheduledBooking)
	document
		.getElementById("dashboardRescheduleCloseBtn")
		?.addEventListener("click", closeReschedule)
	document
		.getElementById("dashboardRescheduleCancelBtn")
		?.addEventListener("click", closeReschedule)
	document
		.getElementById("dashboardRescheduleBackdrop")
		?.addEventListener("click", closeReschedule)
	document
		.getElementById("termsModalCloseBtn")
		?.addEventListener("click", closeTermsModal)
	document
		.getElementById("termsModalBackdrop")
		?.addEventListener("click", closeTermsModal)
	return () => {
		contactForm?.removeEventListener("submit", submitContact, true)
		reviewForm?.removeEventListener("submit", submitReview, true)
		termsCheckbox?.removeEventListener("change", updateTermsAcceptance)
		termsAcceptButton?.removeEventListener("click", acceptTerms)
		contactSuccessClose?.removeEventListener("click", closeContactSuccess)
		document.removeEventListener("click", toggleFavorite, true)
		document.removeEventListener("click", cancelBooking, true)
		document.removeEventListener("click", rescheduleBooking, true)
		document
			.getElementById("dashboardRescheduleSaveBtn")
			?.removeEventListener("click", saveRescheduledBooking)
		document
			.getElementById("dashboardRescheduleCloseBtn")
			?.removeEventListener("click", closeReschedule)
		document
			.getElementById("dashboardRescheduleCancelBtn")
			?.removeEventListener("click", closeReschedule)
		document
			.getElementById("dashboardRescheduleBackdrop")
			?.removeEventListener("click", closeReschedule)
		document
			.getElementById("termsModalCloseBtn")
			?.removeEventListener("click", closeTermsModal)
		document
			.getElementById("termsModalBackdrop")
			?.removeEventListener("click", closeTermsModal)
	}
}

function getTurnstileToken(form: HTMLFormElement): string {
	const input = form.querySelector<HTMLInputElement>(
		'input[name="turnstileToken"]',
	)
	return input?.value.trim() ?? ""
}

function resetTurnstile(form: HTMLFormElement): void {
	const container = form.querySelector<HTMLElement>("[data-saas-turnstile]")
	const input = form.querySelector<HTMLInputElement>(
		'input[name="turnstileToken"]',
	)
	if (input) input.value = ""
	const widgetId = container?.dataset.saasTurnstileWidgetId
	if (widgetId) window.turnstile?.reset(widgetId)
}

function ensureTurnstile(form: HTMLFormElement, siteKey: string): void {
	if (!siteKey || form.querySelector("[data-saas-turnstile]")) return

	const container = document.createElement("div")
	container.dataset.saasTurnstile = "true"
	container.className = "form-group full"
	container.setAttribute("aria-live", "polite")
	const input = document.createElement("input")
	input.type = "hidden"
	input.name = "turnstileToken"
	container.appendChild(input)
	form.appendChild(container)

	const render = () => {
		if (!window.turnstile || container.dataset.saasTurnstileRendered === "true")
			return
		container.dataset.saasTurnstileRendered = "true"
		container.dataset.saasTurnstileWidgetId = window.turnstile.render(container, {
			sitekey: siteKey,
			callback: (token) => {
				input.value = token
			},
			"expired-callback": () => {
				input.value = ""
			},
			"error-callback": () => {
				input.value = ""
			},
		})
	}

	if (window.turnstile) {
		render()
		return
	}

	const existingScript = document.querySelector<HTMLScriptElement>(
		'script[data-turnstile="true"]',
	)
	const script = existingScript ?? document.createElement("script")
	if (!existingScript) {
		script.src =
			"https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
		script.async = true
		script.defer = true
		script.dataset.turnstile = "true"
		document.head.appendChild(script)
	}
	script.addEventListener("load", render, { once: true })
}

interface SessionUser {
	readonly name?: string | null
	readonly email?: string | null
}

function readSessionUser(payload: unknown): SessionUser | null {
	if (typeof payload !== "object" || payload === null || !("user" in payload)) {
		return null
	}
	const user = payload.user
	if (typeof user !== "object" || user === null) return null
	const name =
		"name" in user && typeof user.name === "string" ? user.name : null
	const email =
		"email" in user && typeof user.email === "string" ? user.email : null
	return name || email ? { name, email } : null
}

function setAuthMessage(message: string, type: "error" | "success"): void {
	const element = document.getElementById("authMessage")
	if (!element) return
	element.textContent = message
	element.classList.remove("error", "success")
	if (message) element.classList.add(type)
}

function openSignInModal(message = ""): void {
	const modal = document.getElementById("authModal")
	if (!modal) return
	const nameGroup = document.getElementById("authNameGroup")
	const submitButton = document.getElementById("emailAuthSubmit")
	if (nameGroup instanceof HTMLElement) nameGroup.style.display = "none"
	if (submitButton instanceof HTMLButtonElement)
		submitButton.textContent = "Log In"
	modal.classList.add("active")
	modal.setAttribute("aria-hidden", "false")
	document.body.style.overflow = "hidden"
	setAuthMessage(message, "error")
}

function setReferenceAuthMode(mode: "signin" | "signup"): void {
	const isSignup = mode === "signup"
	const nameGroup = document.getElementById("authNameGroup")
	const submitButton = document.getElementById("emailAuthSubmit")
	const signupButton = document.getElementById("switchToSignupBtn")
	const signinButton = document.getElementById("switchToSigninBtn")
	const passwordInput = document.getElementById("authPassword")
	if (nameGroup instanceof HTMLElement)
		nameGroup.style.display = isSignup ? "block" : "none"
	if (submitButton instanceof HTMLButtonElement)
		submitButton.textContent = isSignup ? "Create Account" : "Log In"
	signupButton?.classList.toggle("hidden", isSignup)
	signinButton?.classList.toggle("hidden", !isSignup)
	if (passwordInput instanceof HTMLInputElement) {
		passwordInput.type = "password"
		passwordInput.setAttribute(
			"autocomplete",
			isSignup ? "new-password" : "current-password",
		)
	}
}

function updateReferenceAuthUi(user: SessionUser | null): void {
	const loginButton = document.getElementById("openAuthModalBtn")
	const profileMenu = document.getElementById("authProfileMenu")
	const profileInitial = document.getElementById("authProfileInitial")
	const profileName = document.getElementById("authProfileName")
	const dashboardLink = document.getElementById("navDashboardLink")
	const dashboard = document.getElementById("clientDashboard")
	const dashboardAuthButton = document.getElementById("dashboardAuthBtn")
	const dashboardName = document.getElementById("dashboardProfileName")
	const dashboardEmail = document.getElementById("dashboardProfileEmail")
	const reviewAuthHint = document.getElementById("reviewAuthHint")
	const reviewSubmitAuthGate = document.getElementById("reviewSubmitAuthGate")
	const reviewSubmitWrap = document.getElementById("reviewSubmitWrap")

	const signedIn = Boolean(user)
	loginButton?.classList.toggle("hidden", signedIn)
	profileMenu?.classList.toggle("hidden", !signedIn)
	dashboardLink?.classList.toggle("hidden", !signedIn)
	dashboard?.classList.toggle("hidden", !signedIn)
	dashboardAuthButton?.classList.toggle("hidden", signedIn)
	reviewAuthHint?.classList.toggle("hidden", signedIn)
	reviewSubmitAuthGate?.classList.toggle("hidden", signedIn)
	reviewSubmitWrap?.classList.toggle("hidden", !signedIn)

	const displayName = user?.name || user?.email || "Client"
	if (profileInitial)
		profileInitial.textContent = displayName.charAt(0).toUpperCase()
	if (profileName)
		profileName.textContent = user ? "Welcome, " + displayName : "Welcome back"
	if (dashboardName) dashboardName.textContent = user?.name || "Not provided"
	if (dashboardEmail)
		dashboardEmail.textContent = user?.email || "Not signed in"
}

async function refreshReferenceAuthUi(tenantSlug = ""): Promise<void> {
	try {
		const response = await fetch("/api/auth/session", {
			cache: "no-store",
			credentials: "same-origin",
		})
		const payload: unknown = await response.json()
		const user = readSessionUser(payload)
		updateReferenceAuthUi(user)
		if (user && tenantSlug) await loadReferenceDashboardData(tenantSlug)
	} catch {
		updateReferenceAuthUi(null)
	}
}

interface ClientAccountSnapshotPayload {
	readonly profile: {
		readonly name: string | null
		readonly email: string
		readonly phone: string | null
		readonly image: string | null
	}
	readonly preferences: {
		readonly theme: "dark" | "light"
		readonly fontSize: "small" | "medium" | "large"
		readonly highContrast: boolean
		readonly reducedMotion: boolean
		readonly notifyEmail: boolean
		readonly notifySms: boolean
		readonly notifyPush: boolean
	} | null
	readonly bookings: readonly {
		readonly id: string
		readonly serviceName: string
		readonly appointmentDate: string
		readonly timeLabel: string
		readonly status: string
		readonly stylistName: string | null
		readonly specialRequests: string | null
		readonly waitlistId?: string | null
		readonly waitlistPosition?: number | null
		readonly waitlistLabel?: string
		readonly waitlistQueueSize?: number | null
		readonly waitlistStatus?: string | null
	}[]
	readonly reviews: readonly {
		readonly id: string
		readonly serviceName: string | null
		readonly rating: number
		readonly text: string
		readonly status: string
		readonly createdAt: string
	}[]
	readonly favorites: readonly {
		readonly id: string
		readonly galleryStyleId: string
		readonly styleName: string
		readonly imageUrl: string
		readonly category: string | null
	}[]
	readonly loginHistory: readonly {
		readonly id: string
		readonly provider: string
		readonly status: string
		readonly riskLevel: string | null
		readonly userAgent: string | null
		readonly country: string | null
		readonly createdAt: string
	}[]
}

interface ClientWaitlistQueuePayload {
	readonly waitlistId: string
	readonly position: number | null
	readonly label: string
	readonly size: number | null
	readonly status: string
}

function escapeClientHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;")
}

function setDashboardMessage(message: string, type: "error" | "success"): void {
	const element = document.getElementById("dashboardMessage")
	if (!element) return
	element.textContent = message
	element.classList.remove("error", "success")
	if (message) element.classList.add(type)
}

function setDashboardList(
	elementId: string,
	html: string,
	emptyText: string,
): void {
	const element = document.getElementById(elementId)
	if (!element) return
	element.innerHTML = html || "<li>" + escapeClientHtml(emptyText) + "</li>"
}

function setFavoriteButtonsState(
	galleryStyleId: string,
	favorited: boolean,
): void {
	const buttons = document.querySelectorAll<HTMLElement>(
		".gallery-save-favorite-btn, #lightboxFavoriteBtn",
	)
	for (const button of buttons) {
		if (button.dataset.favStyleId !== galleryStyleId) continue
		button.classList.toggle("is-favorited", favorited)
		button.setAttribute("aria-pressed", String(favorited))
		button.setAttribute(
			"aria-label",
			favorited
				? "Remove saved gallery style from favorites"
				: "Save gallery style to favorites",
		)
		button.textContent = favorited ? "♥ Saved" : "♡ Save"
	}
}

function showFavoritesToast(message: string): void {
	const toast = document.getElementById("favoritesToast")
	if (!toast) return
	toast.textContent = message
	toast.classList.add("show")
	window.setTimeout(() => toast.classList.remove("show"), 1800)
}

function renderReferenceDashboard(
	snapshot: ClientAccountSnapshotPayload,
): void {
	const profileControls = {
		name: document.getElementById("manageAccountName"),
		email: document.getElementById("manageAccountEmail"),
		phone: document.getElementById("manageAccountPhone"),
	}
	if (profileControls.name instanceof HTMLInputElement && !profileControls.name.dataset.dirty)
		profileControls.name.value = snapshot.profile.name ?? ""
	if (profileControls.email instanceof HTMLInputElement) {
		profileControls.email.dataset.currentValue = snapshot.profile.email
		if (!profileControls.email.dataset.dirty)
			profileControls.email.value = snapshot.profile.email
	}
	if (profileControls.phone instanceof HTMLInputElement && !profileControls.phone.dataset.dirty)
		profileControls.phone.value = snapshot.profile.phone ?? ""
	const preferenceControls = {
		theme: document.getElementById("manageAccountThemeSelect"),
		fontSize: document.getElementById("manageAccountFontSizeSelect"),
		highContrast: document.getElementById("manageAccountHighContrast"),
		reducedMotion: document.getElementById("manageAccountReducedMotion"),
		notifyEmail: document.getElementById("manageAccountNotifEmail"),
		notifySms: document.getElementById("manageAccountNotifSms"),
		notifyPush: document.getElementById("manageAccountNotifPush"),
	}
	if (snapshot.preferences) {
		if (preferenceControls.theme instanceof HTMLSelectElement && !preferenceControls.theme.dataset.dirty) {
			preferenceControls.theme.value = snapshot.preferences.theme
			applyStorefrontColorMode(snapshot.preferences.theme)
		}
		if (preferenceControls.fontSize instanceof HTMLSelectElement) preferenceControls.fontSize.value = snapshot.preferences.fontSize
		if (preferenceControls.highContrast instanceof HTMLInputElement) preferenceControls.highContrast.checked = snapshot.preferences.highContrast
		if (preferenceControls.reducedMotion instanceof HTMLInputElement) preferenceControls.reducedMotion.checked = snapshot.preferences.reducedMotion
		if (preferenceControls.notifyEmail instanceof HTMLInputElement) preferenceControls.notifyEmail.checked = snapshot.preferences.notifyEmail
		if (preferenceControls.notifySms instanceof HTMLInputElement) preferenceControls.notifySms.checked = snapshot.preferences.notifySms
		if (preferenceControls.notifyPush instanceof HTMLInputElement) preferenceControls.notifyPush.checked = snapshot.preferences.notifyPush
	}
	const bookingsHtml = snapshot.bookings
		.map((booking) => {
			const status = escapeClientHtml(booking.status)
			return (
				'<li class="dashboard-booking-row">' +
				"<strong>" +
				escapeClientHtml(booking.serviceName) +
				"</strong>" +
				"<span>" +
				escapeClientHtml(booking.appointmentDate) +
				" at " +
				escapeClientHtml(booking.timeLabel) +
				"</span>" +
				"<span>Stylist: " +
				escapeClientHtml(booking.stylistName || "Any Available") +
				"</span>" +
				'<span class="dashboard-booking-status-line">Status: ' +
				status +
				(booking.waitlistPosition
					? ' · <span class="dashboard-waitlist-position">Waitlist: ' +
						escapeClientHtml(
							booking.waitlistLabel || String(booking.waitlistPosition),
						) +
						(booking.waitlistQueueSize
							? " of " + escapeClientHtml(String(booking.waitlistQueueSize))
							: "") +
						"</span>"
					: "") +
				"</span>" +
				(["pending", "confirmed", "waitlisted"].includes(booking.status)
					? '<button type="button" class="btn btn-outline dashboard-booking-action" data-dashboard-booking-action="cancel" data-booking-id="' +
						escapeClientHtml(booking.id) +
						'">Cancel</button><button type="button" class="btn btn-outline dashboard-booking-action" data-dashboard-booking-action="reschedule" data-booking-id="' +
						escapeClientHtml(booking.id) +
						'">Reschedule</button>'
					: "") +
				(booking.specialRequests
					? "<span>Notes: " +
						escapeClientHtml(booking.specialRequests) +
						"</span>"
					: "") +
				"</li>"
			)
		})
		.join("")
	setDashboardList(
		"dashboardBookingsList",
		bookingsHtml,
		"No appointments yet.",
	)

	const reviewsHtml = snapshot.reviews
		.map(
			(review) =>
				'<li class="dashboard-review-row">' +
				"<strong>" +
				escapeClientHtml(review.serviceName || "Salon review") +
				"</strong>" +
				"<span>" +
				"★".repeat(Math.max(0, Math.min(5, review.rating))) +
				"</span>" +
				"<p>" +
				escapeClientHtml(review.text) +
				"</p>" +
				"<small>Status: " +
				escapeClientHtml(review.status) +
				"</small>" +
				"</li>",
		)
		.join("")
	setDashboardList("dashboardReviewsList", reviewsHtml, "No reviews yet.")

	const favoritesHtml = snapshot.favorites
		.map(
			(favorite) =>
				'<li class="dashboard-favorite-card"><div class="dashboard-favorite-item">' +
				'<div class="dashboard-favorite-media">' +
				'<img src="' +
				escapeClientHtml(favorite.imageUrl) +
				'" alt="' +
				escapeClientHtml(favorite.styleName) +
				'" loading="lazy" decoding="async" /></div>' +
				'<div class="dashboard-favorite-content"><strong>' +
				escapeClientHtml(favorite.styleName) +
				"</strong><p>" +
				escapeClientHtml(favorite.category || "Salon style") +
				"</p></div></div></li>",
		)
		.join("")
	setDashboardList(
		"dashboardFavoritesList",
		favoritesHtml,
		"No favorite styles yet.",
	)

	const historyHtml = snapshot.loginHistory
		.map(
			(item) =>
				'<li class="dashboard-login-history-row"><strong>' +
				escapeClientHtml(item.provider) +
				"</strong><span>" +
				escapeClientHtml(item.status) +
				" · " +
				escapeClientHtml(item.riskLevel || "standard") +
				"</span><small>" +
				escapeClientHtml(item.country || "Unknown location") +
				"</small></li>",
		)
		.join("")
	setDashboardList(
		"dashboardLoginHistoryList",
		historyHtml,
		"No login history yet.",
	)

	const favoriteCount = document.getElementById("dashboardFavoritesCount")
	const historyCount = document.getElementById("dashboardLoginHistoryCount")
	if (favoriteCount)
		favoriteCount.textContent = String(snapshot.favorites.length)
	if (historyCount)
		historyCount.textContent = String(snapshot.loginHistory.length)
	const savedGalleryIds = new Set(
		snapshot.favorites.map((favorite) => favorite.galleryStyleId),
	)
	for (const button of document.querySelectorAll<HTMLElement>(
		".gallery-save-favorite-btn, #lightboxFavoriteBtn",
	)) {
		const galleryStyleId = button.dataset.favStyleId
		if (galleryStyleId)
			setFavoriteButtonsState(
				galleryStyleId,
				savedGalleryIds.has(galleryStyleId),
			)
	}
	setDashboardMessage("", "success")
}

async function loadReferenceDashboardData(tenantSlug: string): Promise<void> {
	try {
		const response = await fetch(
			"/api/account?tenantSlug=" + encodeURIComponent(tenantSlug),
			{ cache: "no-store", credentials: "same-origin" },
		)
		if (!response.ok) {
			if (response.status !== 401) {
				setDashboardMessage("Your dashboard data could not be loaded.", "error")
			}
			return
		}
		const snapshot = (await response.json()) as ClientAccountSnapshotPayload
		const queueLookups = await Promise.all(
			snapshot.bookings
				.filter((booking) => booking.status === "waitlisted")
				.map(async (booking) => {
					try {
						const queueResponse = await fetch(
							"/api/account?tenantSlug=" +
								encodeURIComponent(tenantSlug) +
								"&bookingId=" +
								encodeURIComponent(booking.id),
							{ cache: "no-store", credentials: "same-origin" },
						)
						if (!queueResponse.ok) return [booking.id, null] as const
						const queue =
							(await queueResponse.json()) as ClientWaitlistQueuePayload
						return [booking.id, queue] as const
					} catch {
						return [booking.id, null] as const
					}
				}),
		)
		const queueByBookingId = new Map(queueLookups)
		const enrichedSnapshot: ClientAccountSnapshotPayload = {
			...snapshot,
			bookings: snapshot.bookings.map((booking) => {
				const queue = queueByBookingId.get(booking.id)
				return queue
					? {
							...booking,
							waitlistId: queue.waitlistId,
							waitlistPosition: queue.position,
							waitlistLabel: queue.label,
							waitlistQueueSize: queue.size,
							waitlistStatus: queue.status,
						}
					: booking
			}),
		}
		renderReferenceDashboard(enrichedSnapshot)
	} catch {
		setDashboardMessage("Your dashboard data could not be loaded.", "error")
	}
}

function bindAccountMutationAdapter(tenantSlug = ""): () => void {
	const profileButton = document.getElementById("manageAccountSaveProfileBtn")
	const passwordButton = document.getElementById(
		"manageAccountChangePasswordBtn",
	)
	const deleteButton = document.getElementById("manageAccountDeleteBtn")
	const preferencesButton = document.getElementById(
		"manageAccountSavePreferencesBtn",
	)
	const confirmDeleteButton = document.getElementById(
		"deleteAccountConfirmProceedBtn",
	)
	const closeDeleteButton = document.getElementById(
		"deleteAccountConfirmCloseBtn",
	)
	const cancelDeleteButton = document.getElementById(
		"deleteAccountConfirmCancelBtn",
	)
	const backdrop = document.getElementById("deleteAccountConfirmBackdrop")
	const message = document.getElementById("manageAccountMessage")
	const newPasswordInput = document.getElementById("manageAccountNewPassword")
	const profileInputs = [
		document.getElementById("manageAccountName"),
		document.getElementById("manageAccountEmail"),
		document.getElementById("manageAccountPhone"),
	].filter((input): input is HTMLInputElement => input instanceof HTMLInputElement)
	const markProfileInputDirty = (event: Event): void => {
		const input = event.currentTarget
		if (input instanceof HTMLInputElement) input.dataset.dirty = "true"
	}
	profileInputs.forEach((input) => input.addEventListener("input", markProfileInputDirty))
	const passwordStrengthFill = document.getElementById("managePasswordStrengthFill")
	const passwordStrengthText = document.getElementById("managePasswordStrengthText")
	const passwordChecks = document.getElementById("managePasswordChecks")
	const updatePasswordStrength = (): void => {
		if (!(newPasswordInput instanceof HTMLInputElement)) return
		const password = newPasswordInput.value
		const rules: Record<string, boolean> = {
			length: password.length >= 8,
			upper: /[A-Z]/.test(password),
			lower: /[a-z]/.test(password),
			number: /\d/.test(password),
		}
		const score = Object.values(rules).filter(Boolean).length
		passwordChecks?.querySelectorAll<HTMLElement>("li[data-rule]").forEach((item) => {
			item.classList.toggle("met", Boolean(rules[item.dataset.rule ?? ""]))
		})
		if (passwordStrengthFill instanceof HTMLElement) {
			passwordStrengthFill.style.width = `${score * 25}%`
			passwordStrengthFill.classList.remove(
				"strength-weak",
				"strength-medium",
				"strength-strong",
			)
			passwordStrengthFill.classList.add(
				score <= 1 ? "strength-weak" : score <= 3 ? "strength-medium" : "strength-strong",
			)
		}
		if (passwordStrengthText) {
			passwordStrengthText.textContent =
				score <= 1 ? "Strength: Too weak" : score <= 3 ? "Strength: Medium" : "Strength: Strong"
		}
	}
	newPasswordInput?.addEventListener("input", updatePasswordStrength)
	updatePasswordStrength()
	const setMessage = (text: string, error = false): void => {
		if (!message) return
		message.textContent = text
		message.classList.toggle("error", error)
		message.classList.toggle("success", !error)
	}
	const patchAccount = async (
		payload: Record<string, unknown>,
	): Promise<boolean> => {
		const response = await fetch("/api/account", {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(payload),
		})
		const result = await readReferenceJson(response)
		if (!response.ok)
			setMessage(result.error ?? "Account changes could not be saved.", true)
		return response.ok
	}
	const saveProfile = async (): Promise<void> => {
		const name = document.getElementById("manageAccountName")
		const email = document.getElementById("manageAccountEmail")
		const phone = document.getElementById("manageAccountPhone")
		if (
			!(name instanceof HTMLInputElement) ||
			!(email instanceof HTMLInputElement) ||
			!(phone instanceof HTMLInputElement)
		)
			return
		if (!(await patchAccount({ name: name.value, phone: phone.value }))) return
		profileInputs.forEach((input) => (input.dataset.dirty = ""))
		const requestedEmail = email.value.trim().toLowerCase()
		const currentEmail = (email.dataset.currentValue ?? "").trim().toLowerCase()
		if (requestedEmail && requestedEmail !== currentEmail) {
			const response = await fetch(
				"/api/account?tenant=" + encodeURIComponent(tenantSlug),
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ email: requestedEmail }),
				},
			)
			const result = await readReferenceJson(response)
			if (!response.ok) {
				setMessage(result.error ?? "Email change could not be requested.", true)
				return
			}
			email.dataset.currentValue = requestedEmail
			setMessage("Profile saved. Check your new email to confirm the address change.")
			return
		}
		setMessage("Profile saved.")
	}
	const changePassword = async (): Promise<void> => {
		const current = document.getElementById("manageAccountCurrentPassword")
		const next = document.getElementById("manageAccountNewPassword")
		if (
			!(current instanceof HTMLInputElement) ||
			!(next instanceof HTMLInputElement)
		)
			return
		if (
			await patchAccount({
				currentPassword: current.value,
				newPassword: next.value,
			})
		) {
			setMessage("Password changed.")
			current.value = ""
			next.value = ""
		}
	}
	const savePreferences = async (): Promise<void> => {
		const theme = document.getElementById("manageAccountThemeSelect")
		const fontSize = document.getElementById("manageAccountFontSizeSelect")
		const highContrast = document.getElementById("manageAccountHighContrast")
		const reducedMotion = document.getElementById("manageAccountReducedMotion")
		const notifyEmail = document.getElementById("manageAccountNotifEmail")
		const notifySms = document.getElementById("manageAccountNotifSms")
		const notifyPush = document.getElementById("manageAccountNotifPush")
		if (
			!(theme instanceof HTMLSelectElement) ||
			!(fontSize instanceof HTMLSelectElement) ||
			!(highContrast instanceof HTMLInputElement) ||
			!(reducedMotion instanceof HTMLInputElement) ||
			!(notifyEmail instanceof HTMLInputElement) ||
			!(notifySms instanceof HTMLInputElement) ||
			!(notifyPush instanceof HTMLInputElement)
		)
			return
		if (
			await patchAccount({
				theme: theme.value,
				fontSize: fontSize.value,
				highContrast: highContrast.checked,
				reducedMotion: reducedMotion.checked,
				notifyEmail: notifyEmail.checked,
				notifySms: notifySms.checked,
				notifyPush: notifyPush.checked,
			})
		) {
			theme.dataset.dirty = ""
			setMessage("Preferences saved.")
		}
	}
	const updateThemeImmediately = async (): Promise<void> => {
		const theme = document.getElementById("manageAccountThemeSelect")
		if (!(theme instanceof HTMLSelectElement) || (theme.value !== "dark" && theme.value !== "light")) return
		theme.dataset.dirty = "true"
		applyStorefrontColorMode(theme.value)
		if (await patchAccount({ theme: theme.value })) {
			theme.dataset.dirty = ""
			setMessage("Theme preference saved.")
		}
	}
	const openDelete = (): void => {
		const modal = document.getElementById("deleteAccountConfirmModal")
		modal?.classList.add("active")
		modal?.setAttribute("aria-hidden", "false")
		document.body.style.overflow = "hidden"
	}
	const closeDelete = (): void => {
		const modal = document.getElementById("deleteAccountConfirmModal")
		modal?.classList.remove("active")
		modal?.setAttribute("aria-hidden", "true")
		document.body.style.overflow = ""
	}
	const confirmDelete = async (): Promise<void> => {
		const response = await fetch("/api/account", { method: "DELETE" })
		const result = await readReferenceJson(response)
		if (!response.ok) {
			setMessage(result.error ?? "Account could not be deleted.", true)
			closeDelete()
			return
		}
		await signOut({ redirect: false })
		window.location.reload()
	}
	profileButton?.addEventListener("click", saveProfile)
	passwordButton?.addEventListener("click", changePassword)
	preferencesButton?.addEventListener("click", savePreferences)
	const themeSelect = document.getElementById("manageAccountThemeSelect")
	themeSelect?.addEventListener("change", updateThemeImmediately)
	deleteButton?.addEventListener("click", openDelete)
	confirmDeleteButton?.addEventListener("click", confirmDelete)
	closeDeleteButton?.addEventListener("click", closeDelete)
	cancelDeleteButton?.addEventListener("click", closeDelete)
	backdrop?.addEventListener("click", closeDelete)
	return () => {
		profileInputs.forEach((input) => input.removeEventListener("input", markProfileInputDirty))
		newPasswordInput?.removeEventListener("input", updatePasswordStrength)
		profileButton?.removeEventListener("click", saveProfile)
		passwordButton?.removeEventListener("click", changePassword)
		preferencesButton?.removeEventListener("click", savePreferences)
		themeSelect?.removeEventListener("change", updateThemeImmediately)
		deleteButton?.removeEventListener("click", openDelete)
		confirmDeleteButton?.removeEventListener("click", confirmDelete)
		closeDeleteButton?.removeEventListener("click", closeDelete)
		cancelDeleteButton?.removeEventListener("click", closeDelete)
		backdrop?.removeEventListener("click", closeDelete)
	}
}
function bindAuthAdapter(tenantSlug = "", turnstileSiteKey = ""): () => void {
	const form = document.getElementById("emailAuthForm")
	const openButton = document.getElementById("openAuthModalBtn")
	const closeButton = document.getElementById("closeAuthModalBtn")
	const backdrop = document.getElementById("authModalBackdrop")
	const signupButton = document.getElementById("switchToSignupBtn")
	const signinButton = document.getElementById("switchToSigninBtn")
	const forgotButton = document.getElementById("forgotPasswordBtn")
	const passwordToggle = document.getElementById("authPasswordToggle")
	const logoutButton = document.getElementById("logoutBtn")
	const guestButton = document.getElementById("continueAsGuestBtn")
	const googleButton = document.getElementById("continueWithGoogleBtn")
	const verifyEmailLink = document.getElementById("authVerifyEmailLink")
	const profileMenu = document.getElementById("authProfileMenu")
	const profileTrigger = document.getElementById("authProfileTrigger")
	const accountSettingsButton = document.getElementById("manageAccountOpenBtn")
	const accountSettingsCloseButton = document.getElementById("manageAccountCloseBtn")
	const accountSettingsBackdrop = document.getElementById("manageAccountBackdrop")
	const profileDropdown = document.getElementById("authProfileDropdown")
	if (!(form instanceof HTMLFormElement)) return () => undefined

	ensureTurnstile(form, turnstileSiteKey)

	const submit = async (event: Event): Promise<void> => {
		event.preventDefault()
		event.stopImmediatePropagation()

		const emailInput = document.getElementById("authEmail")
		const passwordInput = document.getElementById("authPassword")
		const nameInput = document.getElementById("authName")
		const submitButton = document.getElementById("emailAuthSubmit")
		const nameGroup = document.getElementById("authNameGroup")
		if (
			!(emailInput instanceof HTMLInputElement) ||
			!(passwordInput instanceof HTMLInputElement) ||
			!(submitButton instanceof HTMLButtonElement)
		) {
			return
		}

		const isSignup =
			nameGroup instanceof HTMLElement &&
			nameGroup.style.display !== "none" &&
			!nameGroup.classList.contains("hidden")
		submitButton.disabled = true
		submitButton.setAttribute("aria-busy", "true")
		setAuthMessage("", "success")

		try {
			if (isSignup) {
				const formData = new FormData()
				formData.set(
					"name",
					nameInput instanceof HTMLInputElement ? nameInput.value : "",
				)
				formData.set("email", emailInput.value)
				formData.set("password", passwordInput.value)
				if (tenantSlug) formData.set("tenantSlug", tenantSlug)
				formData.set("turnstileToken", getTurnstileToken(form))
				const registration = await registerAccount(formData)
				if (!registration.ok) {
					setAuthMessage(registration.message, "error")
					return
				}
				setAuthMessage(
					"Account created. Verify your email before signing in.",
					"success",
				)
				verifyEmailLink?.classList.remove("hidden")
				if (nameGroup) nameGroup.style.display = "none"
				submitButton.textContent = "Log In"
				return
			}

			const result = await signIn("credentials", {
				email: emailInput.value,
				password: passwordInput.value,
				redirect: false,
			})
			if (result?.error) {
				setAuthMessage(
					"Sign-in failed. Check your details and verify your email.",
					"error",
				)
				return
			}

			await refreshReferenceAuthUi(tenantSlug)
			document.getElementById("authModal")?.setAttribute("aria-hidden", "true")
			setAuthMessage("", "success")
		} catch {
			setAuthMessage(
				"Authentication is temporarily unavailable. Please try again.",
				"error",
			)
		} finally {
			if (isSignup) resetTurnstile(form)
			submitButton.disabled = false
			submitButton.removeAttribute("aria-busy")
		}
	}

	const logout = async (event: Event): Promise<void> => {
		event.preventDefault()
		event.stopImmediatePropagation()
		await signOut({ redirect: false })
		updateReferenceAuthUi(null)
	}

	const continueWithGoogle = async (event: Event): Promise<void> => {
		event.preventDefault()
		event.stopImmediatePropagation()
		if (!(googleButton instanceof HTMLButtonElement)) return
		googleButton.disabled = true
		googleButton.setAttribute("aria-busy", "true")
		setAuthMessage("Redirecting to Google…", "success")
		try {
			if (await openNativeGoogleSignIn(`${window.location.pathname}${window.location.search}${window.location.hash}`)) {
				googleButton.disabled = false
				googleButton.removeAttribute("aria-busy")
				return
			}
			await signIn("google", {
				callbackUrl: window.location.href,
			})
		} catch {
			googleButton.disabled = false
			googleButton.removeAttribute("aria-busy")
			setAuthMessage(
				"Google sign-in is temporarily unavailable. Please try again.",
				"error",
			)
		}
	}

	const continueAsGuest = (event: Event): void => {
		event.preventDefault()
		event.stopImmediatePropagation()
		const modal = document.getElementById("authModal")
		modal?.setAttribute("aria-hidden", "true")
		modal?.classList.remove("active")
		document.body.style.overflow = ""
		updateReferenceAuthUi(null)
		const toast = document.getElementById("favoritesToast")
		if (toast) {
			toast.textContent = "You're now continuing as guest"
			toast.classList.add("show")
			window.setTimeout(() => toast.classList.remove("show"), 1800)
		}
	}

	const openAuth = (event: Event): void => {
		event.preventDefault()
		setReferenceAuthMode("signin")
		document.getElementById("authModal")?.setAttribute("aria-hidden", "false")
		document.getElementById("authModal")?.classList.add("active")
		document.body.style.overflow = "hidden"
	}
	const closeAuth = (): void => {
		const modal = document.getElementById("authModal")
		modal?.setAttribute("aria-hidden", "true")
		modal?.classList.remove("active")
		document.body.style.overflow = ""
	}
	const switchToSignup = (): void => {
		setReferenceAuthMode("signup")
		setAuthMessage("", "success")
	}
	const switchToSignin = (): void => {
		setReferenceAuthMode("signin")
		setAuthMessage("", "success")
		verifyEmailLink?.classList.add("hidden")
	}
	const togglePassword = (event: Event): void => {
		event.preventDefault()
		event.stopImmediatePropagation()
		const passwordInput = document.getElementById("authPassword")
		const button = passwordToggle
		if (!(passwordInput instanceof HTMLInputElement)) return
		const isVisible = passwordInput.type === "text"
		passwordInput.type = isVisible ? "password" : "text"
		button?.setAttribute("aria-pressed", String(!isVisible))
		button?.setAttribute(
			"aria-label",
			isVisible ? "Show password" : "Hide password",
		)
	}
	const forgotPassword = async (event: Event): Promise<void> => {
		event.preventDefault()
		const emailInput = document.getElementById("authEmail")
		if (!(emailInput instanceof HTMLInputElement) || !emailInput.value.trim()) {
			setAuthMessage(
				"Enter your email first, then click Forgot Password.",
				"error",
			)
			return
		}
		if (forgotButton instanceof HTMLButtonElement) {
			forgotButton.disabled = true
			forgotButton.textContent = "Sending..."
		}
		try {
			const response = await fetch("/api/auth/password-reset", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					action: "request",
					email: emailInput.value.trim(),
				}),
			})
			const result = await readReferenceJson(response)
			setAuthMessage(
				response.ok
					? (result.message ??
							"Password reset email sent. Please check your inbox.")
					: (result.error ?? "Password reset failed. Please try again."),
				response.ok ? "success" : "error",
			)
		} catch {
			setAuthMessage("Password reset failed. Please try again.", "error")
		} finally {
			if (forgotButton instanceof HTMLButtonElement) {
				forgotButton.disabled = false
				forgotButton.textContent = "Forgot Password?"
			}
		}
	}
	const toggleProfileMenu = (): void => {
		const open = profileMenu?.classList.toggle("open") ?? false
		profileTrigger?.setAttribute("aria-expanded", String(open))
	}
	const closeProfileMenu = (): void => {
		profileMenu?.classList.remove("open")
		profileTrigger?.setAttribute("aria-expanded", "false")
	}
	const openAccountSettings = (): void => {
		closeProfileMenu()
		setModalState("manageAccountModal", true)
	}
	const closeAccountSettings = (): void => setModalState("manageAccountModal", false)
	const closeProfileOnOutsideClick = (event: PointerEvent): void => {
		if (event.target instanceof Node && !profileMenu?.contains(event.target)) closeProfileMenu()
	}
	const closeProfileOnEscape = (event: KeyboardEvent): void => {
		if (event.key === "Escape") {
			closeProfileMenu()
			closeAccountSettings()
		}
	}

	form.addEventListener("submit", submit, true)
	openButton?.addEventListener("click", openAuth, true)
	closeButton?.addEventListener("click", closeAuth, true)
	backdrop?.addEventListener("click", closeAuth, true)
	signupButton?.addEventListener("click", switchToSignup, true)
	signinButton?.addEventListener("click", switchToSignin, true)
	forgotButton?.addEventListener("click", forgotPassword, true)
	passwordToggle?.addEventListener("click", togglePassword, true)
	logoutButton?.addEventListener("click", logout, true)
	guestButton?.addEventListener("click", continueAsGuest, true)
	googleButton?.addEventListener("click", continueWithGoogle, true)
	profileTrigger?.addEventListener("click", toggleProfileMenu)
	accountSettingsButton?.addEventListener("click", openAccountSettings)
	accountSettingsCloseButton?.addEventListener("click", closeAccountSettings)
	accountSettingsBackdrop?.addEventListener("click", closeAccountSettings)
	profileDropdown?.querySelector('a[href="#clientDashboard"]')?.addEventListener("click", closeProfileMenu)
	document.addEventListener("pointerdown", closeProfileOnOutsideClick)
	document.addEventListener("keydown", closeProfileOnEscape)
	// The legacy storefront starts in the guest state and then reconciles the
	// authenticated session asynchronously. Keep guest-only review guidance
	// visible during that request instead of leaving the server-rendered hidden
	// state on screen when Auth.js is slow or unavailable.
	updateReferenceAuthUi(null)
	void refreshReferenceAuthUi(tenantSlug)
	let dashboardRefreshInFlight = false
	const refreshDashboardWhenVisible = (): void => {
		if (document.visibilityState !== "visible" || dashboardRefreshInFlight)
			return
		dashboardRefreshInFlight = true
		void refreshReferenceAuthUi(tenantSlug).finally(() => {
			dashboardRefreshInFlight = false
		})
	}
	const dashboardRefreshTimer = window.setInterval(
		refreshDashboardWhenVisible,
		30_000,
	)
	document.addEventListener("visibilitychange", refreshDashboardWhenVisible)

	return () => {
		window.clearInterval(dashboardRefreshTimer)
		document.removeEventListener(
			"visibilitychange",
			refreshDashboardWhenVisible,
		)
		form.removeEventListener("submit", submit, true)
		openButton?.removeEventListener("click", openAuth, true)
		closeButton?.removeEventListener("click", closeAuth, true)
		backdrop?.removeEventListener("click", closeAuth, true)
		signupButton?.removeEventListener("click", switchToSignup, true)
		signinButton?.removeEventListener("click", switchToSignin, true)
		forgotButton?.removeEventListener("click", forgotPassword, true)
		passwordToggle?.removeEventListener("click", togglePassword, true)
		logoutButton?.removeEventListener("click", logout, true)
		guestButton?.removeEventListener("click", continueAsGuest, true)
		googleButton?.removeEventListener("click", continueWithGoogle, true)
		profileTrigger?.removeEventListener("click", toggleProfileMenu)
		accountSettingsButton?.removeEventListener("click", openAccountSettings)
		accountSettingsCloseButton?.removeEventListener("click", closeAccountSettings)
		accountSettingsBackdrop?.removeEventListener("click", closeAccountSettings)
		profileDropdown?.querySelector('a[href="#clientDashboard"]')?.removeEventListener("click", closeProfileMenu)
		document.removeEventListener("pointerdown", closeProfileOnOutsideClick)
		document.removeEventListener("keydown", closeProfileOnEscape)
	}
}
function bindBookingAdapter(
	tenantSlug: string,
	turnstileSiteKey: string,
): () => void {
	const form = document.getElementById("bookingForm")
	if (!(form instanceof HTMLFormElement)) return () => undefined

	ensureTurnstile(form, turnstileSiteKey)
	const timeInput = document.getElementById("timeSelect")
	const timeDropdown = document.getElementById("bookingTimeDropdown")
	const timeOptions = document.getElementById("bookingTimeOptions")
	const timeTrigger = document.getElementById("timePickerTrigger")
	const datePicker = document.getElementById("datePicker")
	const stylistSelect = document.getElementById("stylistSelect")
	const waitlistPanel = document.getElementById("waitlistPanel")
	const waitlistSelect = document.getElementById("waitlistTimeSelect")
	let availabilityRequest = 0
	let availabilityTimer: ReturnType<typeof setTimeout> | undefined
	let availabilityReady = false
	let bookedSlots: {
		slotId: string
		timeLabel: string
		stylistId: string | null
		stylistLabel: string
	}[] = []
	let pendingWaitlist: {
		waitlistId: string
		date: string
		timeLabel: string
		serviceName: string
		stylistId: string | null
		inspirationImageUploaded: boolean
	} | null = null

	const setPickerOpen = (open: boolean): void => {
		if (timeDropdown instanceof HTMLElement) timeDropdown.hidden = !open
		if (timeInput instanceof HTMLInputElement)
			timeInput.setAttribute("aria-expanded", String(open))
		if (timeTrigger instanceof HTMLButtonElement)
			timeTrigger.setAttribute("aria-expanded", String(open))
	}
	const togglePicker = (): void =>
		setPickerOpen(timeDropdown instanceof HTMLElement && timeDropdown.hidden)
	const openPicker = (): void => setPickerOpen(true)
	const closePickerOnOutside = (event: Event): void => {
		if (
			event.target instanceof Node &&
			!document
				.querySelector('[data-time-picker="booking"]')
				?.contains(event.target)
		)
			setPickerOpen(false)
	}
	const getSelectedInspirationFile = async (): Promise<File | undefined> => {
		const imageInput = document.getElementById("inspirationImage")
		const file =
			imageInput instanceof HTMLInputElement ? imageInput.files?.[0] : undefined
		if (!file) return undefined
		const validationError = getImageUploadError(file.size, file.type)
		if (validationError) throw new Error(validationError)
		return file
	}
	const makePublicRequestBody = (
		values: Readonly<Record<string, string | undefined>>,
		inspirationFile?: File,
	): BodyInit => {
		if (!inspirationFile) return JSON.stringify(values)
		const formData = new FormData()
		Object.entries(values).forEach(([key, value]) => {
			if (value !== undefined) formData.set(key, value)
		})
		formData.set("inspirationImage", inspirationFile)
		return formData
	}
	const renderAvailability = (
		times: readonly string[],
		occupied: typeof bookedSlots,
	): void => {
		bookedSlots = occupied
		if (timeOptions instanceof HTMLDataListElement) {
			timeOptions.replaceChildren(
				...times
					.filter((time) => !occupied.some((slot) => slot.timeLabel === time))
					.map((time) => {
						const option = document.createElement("option")
						option.value = time
						return option
					}),
			)
		}
		if (timeDropdown instanceof HTMLElement) {
			timeDropdown.replaceChildren(
				...times.map((time) => {
					const isWaitlisted =
						pendingWaitlist?.timeLabel === time &&
						pendingWaitlist.date ===
							(datePicker instanceof HTMLInputElement ? datePicker.value : "")
					const isBooked =
						!isWaitlisted && occupied.some((slot) => slot.timeLabel === time)
					const option = document.createElement("button")
					option.type = "button"
					option.className = `time-picker-option${isBooked ? " is-booked" : isWaitlisted ? " is-waitlisted" : ""}`
					option.setAttribute("role", "option")
					option.disabled = isBooked
					option.textContent = isWaitlisted
						? `${time} — Waitlisted (booked)`
						: isBooked
							? `${time} — Booked`
							: time
					if (!isBooked)
						option.addEventListener("click", () => {
							if (timeInput instanceof HTMLInputElement) {
								timeInput.value = time
								timeInput.dispatchEvent(new Event("change", { bubbles: true }))
							}
							setPickerOpen(false)
						})
					return option
				}),
			)
		}
		if (waitlistSelect instanceof HTMLSelectElement) {
			const placeholder = document.createElement("option")
			placeholder.value = ""
			placeholder.textContent = "Select booked time"
			waitlistSelect.replaceChildren(
				placeholder,
				...occupied.map((slot) => {
					const option = document.createElement("option")
					option.value = slot.slotId
					option.dataset.time = slot.timeLabel
					option.dataset.stylistId = slot.stylistId ?? ""
					option.dataset.stylistLabel = slot.stylistLabel
					option.textContent = `${slot.timeLabel} — ${slot.stylistLabel}`
					return option
				}),
			)
		}
		waitlistPanel?.classList.toggle("hidden", occupied.length === 0)
	}
	const refreshAvailability = (): void => {
		if (availabilityTimer) clearTimeout(availabilityTimer)
		const date = datePicker instanceof HTMLInputElement ? datePicker.value : ""
		const time = timeInput instanceof HTMLInputElement ? timeInput.value : ""
		if (timeInput instanceof HTMLInputElement) timeInput.value = ""
		if (!date) {
			availabilityRequest += 1
			availabilityReady = false
			renderAvailability(BOOKING_TIME_SLOTS, [])
			return
		}
		availabilityReady = false
		renderAvailability(BOOKING_TIME_SLOTS, [])
		const requestId = ++availabilityRequest
		const selectedStylist =
			stylistSelect instanceof HTMLSelectElement ? stylistSelect.value : ""
		const query = new URLSearchParams({ tenantSlug, date })
		if (selectedStylist) query.set("stylistId", selectedStylist)
		availabilityTimer = setTimeout(() => {
			void fetch(`/api/bookings/availability?${query.toString()}`, {
				cache: "no-store",
			})
				.then(async (response) => {
					const payload: unknown = await response.json()
					if (!response.ok || typeof payload !== "object" || payload === null)
						throw new Error("Availability unavailable")
					const record = payload as {
						timeSlots?: unknown
						bookedSlots?: unknown
					}
					if (requestId !== availabilityRequest) return
					const times = Array.isArray(record.timeSlots)
						? record.timeSlots.filter(
								(value): value is string => typeof value === "string",
							)
						: BOOKING_TIME_SLOTS
					const occupied = Array.isArray(record.bookedSlots)
						? record.bookedSlots.filter(
								(value): value is (typeof bookedSlots)[number] =>
									typeof value === "object" &&
									value !== null &&
									"slotId" in value &&
									"timeLabel" in value &&
									"stylistLabel" in value &&
									typeof value.slotId === "string" &&
									typeof value.timeLabel === "string" &&
									typeof value.stylistLabel === "string" &&
									(value.stylistId === null ||
										typeof value.stylistId === "string"),
							)
						: []
					renderAvailability(times, occupied)
					availabilityReady = true
					if (timeInput instanceof HTMLInputElement) {
						timeInput.value = occupied.some((slot) => slot.timeLabel === time)
							? ""
							: time
					}
				})
				.catch(() => {
					if (requestId !== availabilityRequest) return
					renderAvailability(BOOKING_TIME_SLOTS, [])
					if (timeInput instanceof HTMLInputElement) timeInput.value = ""
					availabilityReady = false
					setBookingMessage(
						"Available times could not be refreshed. Your booking will still be checked before it is saved.",
						"error",
					)
				})
		}, 250)
	}
	const getPendingWaitlist = () => {
		const date = datePicker instanceof HTMLInputElement ? datePicker.value : ""
		const time =
			timeInput instanceof HTMLInputElement ? timeInput.value.trim() : ""
		const serviceName =
			getFormValue(form, "customService") || getFormValue(form, "service")
		const selectedStylistId =
			stylistSelect instanceof HTMLSelectElement ? stylistSelect.value : ""
		const stylistMatches =
			!pendingWaitlist?.stylistId ||
			!selectedStylistId ||
			pendingWaitlist.stylistId === selectedStylistId
		return pendingWaitlist?.date === date &&
			pendingWaitlist.timeLabel === time &&
			pendingWaitlist.serviceName === serviceName &&
			stylistMatches
			? pendingWaitlist
			: null
	}
	const clearPendingWaitlistIfChanged = (): void => {
		if (pendingWaitlist && !getPendingWaitlist()) {
			pendingWaitlist = null
			renderAvailability(BOOKING_TIME_SLOTS, bookedSlots)
		}
	}
	const refreshAvailabilityWhenIdle = (): void => {
		if (
			document.visibilityState !== "visible" ||
			!availabilityReady ||
			!(datePicker instanceof HTMLInputElement) ||
			!datePicker.value ||
			(form.contains(document.activeElement) && document.activeElement !== form)
		)
			return
		refreshAvailability()
	}
	const availabilityRefreshTimer = window.setInterval(
		refreshAvailabilityWhenIdle,
		30_000,
	)
	document.addEventListener("visibilitychange", refreshAvailabilityWhenIdle)
	datePicker?.addEventListener("change", refreshAvailability)
	stylistSelect?.addEventListener("change", refreshAvailability)
	datePicker?.addEventListener("change", clearPendingWaitlistIfChanged)
	stylistSelect?.addEventListener("change", clearPendingWaitlistIfChanged)
	timeInput?.addEventListener("input", clearPendingWaitlistIfChanged)
	form
		.querySelector('[name="service"]')
		?.addEventListener("change", clearPendingWaitlistIfChanged)
	form
		.querySelector('[name="customService"]')
		?.addEventListener("input", clearPendingWaitlistIfChanged)
	timeTrigger?.addEventListener("click", togglePicker)
	timeInput?.addEventListener("focus", openPicker)
	document.addEventListener("click", closePickerOnOutside)
	renderAvailability(BOOKING_TIME_SLOTS, [])

	const submit = async (event: Event): Promise<void> => {
		event.preventDefault()
		event.stopImmediatePropagation()

		const firstName = getFormValue(form, "firstName")
		const lastName = getFormValue(form, "lastName")
		const email = getFormValue(form, "email")
		const phone = getFormValue(form, "phone")
		const serviceName = getFormValue(form, "service")
		const customService = getFormValue(form, "customService")
		const paymentMode = getFormValue(form, "paymentMode")
		const serviceSelect = document.getElementById("serviceSelect")
		const selectedOption =
			serviceSelect instanceof HTMLSelectElement
				? serviceSelect.options[serviceSelect.selectedIndex]
				: undefined
		const serviceId = selectedOption?.dataset.serviceId || undefined
		const stylistElement = document.getElementById("stylistSelect")
		const stylistId =
			stylistElement instanceof HTMLSelectElement
				? stylistElement.value || undefined
				: undefined
		if (selectedOption?.dataset.orderOnly === "true") {
			openReferenceWhatsAppOrder(
				serviceName,
				selectedOption.textContent?.match(/\(([^)]+)\)/)?.[1] ?? "",
			)
			return
		}
		const appointmentDate = getFormValue(form, "date")
		const timeLabel = getFormValue(form, "time")
		const specialRequests = getFormValue(form, "notes")
		const turnstileToken = getTurnstileToken(form)
		const button = document.getElementById("submitBtn")

		if (!(button instanceof HTMLButtonElement)) return
		if (appointmentDate && !availabilityReady) {
			setBookingMessage(
				"Please wait for this date’s availability to load before confirming.",
				"error",
			)
			return
		}
		if (!turnstileToken) {
			setBookingMessage(
				"Security verification is required before submitting your booking.",
				"error",
			)
			return
		}

		setBookingLoading(button, true)
		setBookingMessage("", "success")

		try {
			const inspirationFile = pendingWaitlist?.inspirationImageUploaded
				? undefined
				: await getSelectedInspirationFile()
			const bookingPayload = {
				tenantSlug,
				firstName,
				lastName,
				email,
				phone,
				serviceId,
				stylistId,
				waitlistId: getPendingWaitlist()?.waitlistId,
				serviceName: customService || serviceName,
				customService: customService || undefined,
				paymentMode: paymentMode || undefined,
				appointmentDate,
				timeLabel,
				specialRequests: specialRequests || undefined,
				turnstileToken,
			}
			const response = await fetch("/api/bookings", {
				method: "POST",
				headers: inspirationFile
					? undefined
					: { "content-type": "application/json" },
				body: makePublicRequestBody(bookingPayload, inspirationFile),
			})

			const payload: unknown = await response.json().catch(() => ({}))
			const error =
				typeof payload === "object" &&
				payload !== null &&
				"error" in payload &&
				typeof payload.error === "string"
					? payload.error
					: "The booking could not be created. Please try again."

			if (!response.ok) {
				setBookingMessage(error, "error")
				return
			}

			const paymentRecord =
				typeof payload === "object" &&
				payload !== null &&
				"payment" in payload &&
				typeof payload.payment === "object" &&
				payload.payment !== null
					? (payload.payment as { status?: string })
					: undefined
			const paymentPending = paymentRecord?.status === "pending"
			const bookingStatus =
				typeof payload === "object" && payload !== null && "status" in payload
					? payload.status
					: undefined
			const isWaitlisted = bookingStatus === "WAITLISTED"
			setBookingMessage(
				isWaitlisted
					? "Your waitlisted booking is saved. The salon will contact you when they can confirm a slot."
					: paymentPending
						? "Booking received. Approve the M-Pesa prompt to confirm your appointment."
						: "Booking request received. We will confirm your appointment shortly.",
				"success",
			)
			const successHeading =
				document.querySelector<HTMLHeadingElement>("#bookingSuccess h3")
			if (successHeading)
				successHeading.textContent = isWaitlisted
					? "You’re on the Waitlist"
					: paymentPending
						? "Payment Pending"
						: "Booking Confirmed!"
			showBookingSuccess()
			pendingWaitlist = null
		} catch {
			setBookingMessage(
				"The booking service could not be reached. Please try again.",
				"error",
			)
		} finally {
			resetTurnstile(form)
			setBookingLoading(button, false)
		}
	}

	const waitlistButton = document.getElementById("joinWaitlistBtn")
	const joinWaitlist = async (event: Event): Promise<void> => {
		event.preventDefault()
		event.stopImmediatePropagation()
		if (!(waitlistButton instanceof HTMLButtonElement)) return
		if (pendingWaitlist) {
			setBookingMessage(
				"You have already joined this waitlist. Confirm the booking request below.",
				"error",
			)
			return
		}

		const turnstileToken = getTurnstileToken(form)
		if (!turnstileToken) {
			setBookingMessage(
				"Security verification is required before joining the waitlist.",
				"error",
			)
			return
		}

		const name = [
			getFormValue(form, "firstName"),
			getFormValue(form, "lastName"),
		]
			.filter(Boolean)
			.join(" ")
		const preferredTimeElement = document.getElementById("waitlistTimeSelect")
		const selectedWaitlistOption =
			preferredTimeElement instanceof HTMLSelectElement
				? preferredTimeElement.options[preferredTimeElement.selectedIndex]
				: undefined
		const preferredTime = selectedWaitlistOption?.dataset.time?.trim() ?? ""
		if (!preferredTime || !selectedWaitlistOption?.value) {
			setBookingMessage(
				"Choose a booked time before joining the waitlist.",
				"error",
			)
			return
		}

		waitlistButton.disabled = true
		waitlistButton.setAttribute("aria-busy", "true")
		try {
			const inspirationFile = await getSelectedInspirationFile()
			const waitlistPayload = {
				tenantSlug,
				name,
				email: getFormValue(form, "email"),
				phone: getFormValue(form, "phone"),
				serviceName:
					getFormValue(form, "customService") || getFormValue(form, "service"),
				preferredDate: getFormValue(form, "date") || undefined,
				preferredTime,
				preferredStylist:
					preferredTimeElement instanceof HTMLSelectElement
						? preferredTimeElement.options[preferredTimeElement.selectedIndex]
								?.dataset.stylistLabel || undefined
						: undefined,
				turnstileToken,
			}
			const response = await fetch("/api/waitlist", {
				method: "POST",
				headers: inspirationFile
					? undefined
					: { "content-type": "application/json" },
				body: makePublicRequestBody(waitlistPayload, inspirationFile),
			})
			const payload: unknown = await response.json().catch(() => ({}))
			const error =
				typeof payload === "object" &&
				payload !== null &&
				"error" in payload &&
				typeof payload.error === "string"
					? payload.error
					: "The waitlist request could not be saved."

			if (!response.ok) {
				setBookingMessage(error, "error")
				return
			}

			const waitlistId =
				typeof payload === "object" &&
				payload !== null &&
				"waitlistId" in payload &&
				typeof payload.waitlistId === "string"
					? payload.waitlistId
					: ""
			if (!waitlistId)
				throw new Error("The waitlist response did not include its request ID.")
			pendingWaitlist = {
				waitlistId,
				date: getFormValue(form, "date"),
				timeLabel: preferredTime,
				serviceName:
					getFormValue(form, "customService") || getFormValue(form, "service"),
				stylistId: selectedWaitlistOption.dataset.stylistId || null,
				inspirationImageUploaded: Boolean(inspirationFile),
			}
			if (timeInput instanceof HTMLInputElement) timeInput.value = preferredTime
			renderAvailability(BOOKING_TIME_SLOTS, bookedSlots)
			setBookingMessage(
				"You’ve joined the waitlist. Complete the refreshed security check, then confirm below to save this as a waitlisted booking.",
				"success",
			)
		} catch {
			setBookingMessage(
				"The waitlist service could not be reached. Please try again.",
				"error",
			)
		} finally {
			resetTurnstile(form)
			waitlistButton.disabled = false
			waitlistButton.removeAttribute("aria-busy")
		}
	}

	form.addEventListener("submit", submit, true)
	waitlistButton?.addEventListener("click", joinWaitlist, true)
	return () => {
		if (availabilityTimer) clearTimeout(availabilityTimer)
		window.clearInterval(availabilityRefreshTimer)
		document.removeEventListener(
			"visibilitychange",
			refreshAvailabilityWhenIdle,
		)
		datePicker?.removeEventListener("change", refreshAvailability)
		stylistSelect?.removeEventListener("change", refreshAvailability)
		datePicker?.removeEventListener("change", clearPendingWaitlistIfChanged)
		stylistSelect?.removeEventListener("change", clearPendingWaitlistIfChanged)
		timeInput?.removeEventListener("input", clearPendingWaitlistIfChanged)
		form
			.querySelector('[name="service"]')
			?.removeEventListener("change", clearPendingWaitlistIfChanged)
		form
			.querySelector('[name="customService"]')
			?.removeEventListener("input", clearPendingWaitlistIfChanged)
		timeTrigger?.removeEventListener("click", togglePicker)
		timeInput?.removeEventListener("focus", openPicker)
		document.removeEventListener("click", closePickerOnOutside)
		form.removeEventListener("submit", submit, true)
		waitlistButton?.removeEventListener("click", joinWaitlist, true)
	}
}

function readConfigValue(config: SalonClientConfig, path: string): unknown {
	return path.split(".").reduce<unknown>((value, key) => {
		if (typeof value !== "object" || value === null || !(key in value)) {
			return undefined
		}
		return (value as Record<string, unknown>)[key]
	}, config)
}

function sanitizeInlineMarkup(value: unknown): string {
	if (typeof value !== "string") return ""
	const normalized = value.replace(
		/<span>\s*<span>([\s\S]*?)<\/span>\s*<\/span>/gi,
		"<span>$1</span>",
	)
	const escaped = normalized
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;")
	return escaped
		.replace(
			/&lt;(\/?)span&gt;/gi,
			(_, closing: string) => "<" + closing + "span>",
		)
		.replace(
			/&lt;(\/?)(br\s*\/?)&gt;/gi,
			(_, closing: string) => `<${closing}br />`,
		)
}

function applyStorefrontColorMode(mode: "dark" | "light", persist = true): void {
	const root = document.documentElement
	const body = document.body
	const isLight = mode === "light"
	root.classList.add("theme-switching")
	body.classList.add("theme-switching")
	root.classList.toggle("light-mode", isLight)
	body.classList.toggle("light-mode", isLight)
	root.dataset.colorMode = mode
	body.dataset.colorMode = mode
	root.style.colorScheme = mode
	body.style.colorScheme = mode
	const darkModeToggle = document.getElementById("darkModeToggle")
	darkModeToggle?.classList.toggle("active", !isLight)
	darkModeToggle?.setAttribute("aria-pressed", String(!isLight))
	const themeSelect = document.getElementById("manageAccountThemeSelect")
	if (themeSelect instanceof HTMLSelectElement) themeSelect.value = mode
	if (persist) {
		try {
			const appearance = window.CLIENT_CONFIG as SalonClientConfig | undefined
			const key = appearance?.appearance?.storageKey?.trim() || "theme"
			localStorage.setItem(key, mode)
		} catch {
			// The selected color mode still applies for this page when storage is unavailable.
		}
	}
	window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
		root.classList.remove("theme-switching")
		body.classList.remove("theme-switching")
	}))
}

function applyNativeClientConfig(config: SalonClientConfig): void {
	document
		.querySelectorAll<HTMLElement>("[data-client-text]")
		.forEach((element) => {
			const path = element.dataset.clientText
			const value = path ? readConfigValue(config, path) : undefined
			if (value !== undefined && value !== null)
				element.textContent = String(value)
		})
	document
		.querySelectorAll<HTMLElement>("[data-client-html]")
		.forEach((element) => {
			const path = element.dataset.clientHtml
			const value = path ? readConfigValue(config, path) : undefined
			if (value !== undefined && value !== null) {
				element.innerHTML = sanitizeInlineMarkup(value)
			}
		})
	document
		.querySelectorAll<HTMLElement>("[data-client-attr]")
		.forEach((element) => {
			const bindings = (element.dataset.clientAttr ?? "")
				.split(";")
				.map((binding) => binding.trim())
				.filter(Boolean)
			for (const binding of bindings) {
				const [attribute, path] = binding.split(":").map((part) => part.trim())
				if (!attribute || !path) continue
				const value = readConfigValue(config, path)
				if (value !== undefined && value !== null && value !== "") {
					element.setAttribute(attribute, String(value))
				}
			}
		})

	const appearance = config.appearance ?? {}
	let mode: "dark" | "light" = appearance.mode === "light" ? "light" : "dark"
	const themeStorageKey = appearance.storageKey?.trim() || "theme"
	try {
		const savedTheme = localStorage.getItem(themeStorageKey)
		if (savedTheme === "light" || savedTheme === "dark") mode = savedTheme
	} catch {
		// Use the tenant setting when browser storage is unavailable.
	}
	applyStorefrontColorMode(mode, false)
	const themePreset = appearance.preset ?? DEFAULT_THEME_PRESET
	document.documentElement.dataset.themePreset = themePreset
	document.body.dataset.themePreset = themePreset
	const visibility = config.storefront?.sectionVisibility
	for (const section of STOREFRONT_SECTION_KEYS) {
		const isVisible = visibility?.[section] ?? true
		document
			.querySelectorAll<HTMLElement>(`[data-config-section="${section}"]`)
			.forEach((element) => {
				element.hidden = !isVisible
			})
	}

	const seo = config.seo ?? {}
	if (seo.title) document.title = seo.title
	for (const [name, value] of [
		["description", seo.description],
		["keywords", seo.keywords],
	] as const) {
		if (!value) continue
		let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
		if (!meta) {
			meta = document.createElement("meta")
			meta.name = name
			document.head.append(meta)
		}
		meta.content = value
	}
	for (const [property, value] of [
		["og:title", seo.ogTitle],
		["og:image", seo.ogImage],
	] as const) {
		if (!value) continue
		let meta = document.querySelector<HTMLMetaElement>(
			`meta[property="${property}"]`,
		)
		if (!meta) {
			meta = document.createElement("meta")
			meta.setAttribute("property", property)
			document.head.append(meta)
		}
		meta.content = value
	}
	const favicon = config.brand?.favicon
	if (favicon)
		document
			.querySelector<HTMLLinkElement>('link[rel="icon"]')
			?.setAttribute("href", favicon)
	const year = document.getElementById("footerYearFallback")
	if (year) year.textContent = String(new Date().getFullYear())
}

function initializeNativeSplash(skipSplash = false): () => void {
	const splash = document.getElementById("siteSplash")
	const siteMain = document.getElementById("siteMain")
	if (!(splash instanceof HTMLElement)) return () => undefined

	const originalBodyClassName = document.body.className
	if (skipSplash) {
		splash.classList.add("splash-hide")
		splash.hidden = true
		splash.setAttribute("aria-hidden", "true")
		document.body.classList.remove("splash-active", "splash-revealing")
		document.body.classList.add("splash-complete")
		siteMain?.removeAttribute("aria-hidden")
		return () => {
			document.body.className = originalBodyClassName
		}
	}
	const duration = Math.max(0, Number(splash.dataset.splashDuration) || 3200)
	const reducedMotion = window.matchMedia?.(
		"(prefers-reduced-motion: reduce)",
	).matches
	const effectiveDuration = reducedMotion ? 700 : duration
	let frame = 0
	let completed = false
	let revealTimer = 0
	const progress = splash.querySelector<HTMLElement>(".splash-progress")
	const fill = document.getElementById("splashProgressFill")
	const percent = document.getElementById("splashProgressPercent")
	const start = performance.now()
	document.body.classList.add("splash-active")
	document.body.classList.remove("splash-complete")
	siteMain?.setAttribute("aria-hidden", "true")

	const tick = (now: number): void => {
		const ratio = Math.min(1, (now - start) / Math.max(1, effectiveDuration))
		const value = Math.max(1, Math.round(1 + ratio * 99))
		if (fill) fill.style.width = value + "%"
		if (percent) percent.textContent = value + "%"
		progress?.setAttribute("aria-valuenow", String(value))
		if (ratio < 1) frame = window.requestAnimationFrame(tick)
	}
	frame = window.requestAnimationFrame(tick)

	const complete = (): void => {
		if (completed) return
		completed = true
		if (frame) window.cancelAnimationFrame(frame)
		if (fill) fill.style.width = "100%"
		if (percent) percent.textContent = "100%"
		splash.classList.add("splash-hide")
		splash.hidden = true
		splash.setAttribute("aria-hidden", "true")
		document.body.classList.remove("splash-active", "splash-revealing")
		document.body.classList.add("splash-complete")
		siteMain?.removeAttribute("aria-hidden")
		document.dispatchEvent(new Event("salon-splash-complete"))
	}
	revealTimer = window.setTimeout(complete, effectiveDuration)

	return () => {
		if (frame) window.cancelAnimationFrame(frame)
		if (revealTimer) window.clearTimeout(revealTimer)
		document.body.className = originalBodyClassName
	}
}

function setModalState(id: string, open: boolean): void {
	const modal = document.getElementById(id)
	if (!modal) return
	modal.classList.toggle("active", open)
	modal.setAttribute("aria-hidden", String(!open))
	if (
		[
			"authModal",
			"manageAccountModal",
			"lightbox",
			"termsModal",
			"dashboardRescheduleModal",
			"deleteAccountConfirmModal",
		].includes(id)
	) {
		document.body.style.overflow = open ? "hidden" : ""
	}
}

type NativeGalleryFilter =
	| "service"
	| "subService"
	| "length"
	| "size"
	| "styleType"
	| "technique"

function nativeGalleryDate(value: string | undefined): number {
	if (!value) return 0
	const parsed = Date.parse(value)
	return Number.isNaN(parsed) ? 0 : parsed
}

function bindNativeGalleryControls(
	galleryItems: readonly SalonGalleryItem[],
): () => void {
	const grid = document.getElementById("galleryGrid")
	if (!grid) return () => undefined

	const cards = Array.from(grid.querySelectorAll<HTMLElement>(".gallery-item"))
	const filters: Record<NativeGalleryFilter, string> = {
		service: "all",
		subService: "all",
		length: "all",
		size: "all",
		styleType: "all",
		technique: "all",
	}
	let sortBy = "recommended"
	let showAll = false
	const listeners: Array<() => void> = []
	const add = <T extends EventTarget>(
		target: T | null,
		type: string,
		listener: EventListener,
	): void => {
		if (!target) return
		target.addEventListener(type, listener)
		listeners.push(() => target.removeEventListener(type, listener))
	}

	const valueFor = (card: HTMLElement, group: NativeGalleryFilter): string => {
		const values: Record<NativeGalleryFilter, string> = {
			service: card.dataset.galleryService ?? "",
			subService: card.dataset.gallerySubService ?? "",
			length: card.dataset.galleryLength ?? "",
			size: card.dataset.gallerySize ?? "",
			styleType: card.dataset.galleryStyleType ?? "",
			technique: card.dataset.galleryTechnique ?? "",
		}
		return values[group]
	}
	const labelFor = (group: NativeGalleryFilter): string =>
		({
			service: "Services",
			subService: "Services",
			length: "Lengths",
			size: "Sizes",
			styleType: "Style Types",
			technique: "Techniques / Finishes",
		})[group]

	const setChipState = (group: NativeGalleryFilter, value: string): void => {
		document
			.querySelectorAll<HTMLElement>(`[data-filter-group="${group}"]`)
			.forEach((chip) => {
				chip.classList.toggle("active", chip.dataset.filterValue === value)
			})
	}
	const renderGroup = (
		mountId: string,
		group: NativeGalleryFilter,
		values: readonly string[],
	): void => {
		const mount = document.getElementById(mountId)
		if (!mount) return
		mount.replaceChildren()
		if (!values.length) {
			mount.style.display = "none"
			filters[group] = "all"
			return
		}
		mount.style.display = "flex"
		const title = document.createElement("span")
		mount.appendChild(title)
		const allValues = ["all", ...values]
		for (const value of allValues) {
			const chip = document.createElement("button")
			chip.type = "button"
			chip.className = "gallery-filter-chip"
			chip.dataset.filterGroup = group
			chip.dataset.filterValue = value
			chip.textContent = value === "all" ? `All ${labelFor(group)}` : value
			mount.appendChild(chip)
			add(chip, "click", () => {
				filters[group] = value
				setChipState(group, value)
				apply()
			})
		}
		setChipState(group, filters[group])
	}

	const renderSubfilters = (): void => {
		const service = filters.service
		const configs: readonly [string, NativeGalleryFilter][] =
			service === "braids-services"
				? [
						["galleryLengthFilters", "length"],
						["gallerySizeFilters", "size"],
						["galleryStyleTypeFilters", "styleType"],
					]
				: service === "hair-services"
					? [
							["galleryLengthFilters", "subService"],
							["gallerySizeFilters", "technique"],
							["galleryStyleTypeFilters", "styleType"],
						]
					: service === "all"
						? []
						: [
								["galleryLengthFilters", "subService"],
								["galleryStyleTypeFilters", "styleType"],
							]
		const configured = new Set(configs.map(([, group]) => group))
		for (const [mountId, group] of [
			["galleryLengthFilters", "length"],
			["gallerySizeFilters", "size"],
			["galleryStyleTypeFilters", "styleType"],
		] as const) {
			if (!configured.has(group)) renderGroup(mountId, group, [])
		}
		for (const [mountId, group] of configs) {
			const values = [
				...new Set(
					cards
						.filter(
							(card) =>
								service === "all" || valueFor(card, "service") === service,
						)
						.map((card) => valueFor(card, group).trim())
						.filter(Boolean),
				),
			].sort((a, b) => a.localeCompare(b))
			renderGroup(mountId, group, values)
		}
		const note = document.getElementById("galleryBraidsOnlyNote")
		if (note) note.style.display = configs.length ? "block" : "none"
	}

	const score = (card: HTMLElement): number =>
		(card.dataset.featuredTrending === "true" ? 2 : 0) +
		(card.dataset.featuredMostBooked === "true" ? 2 : 0) +
		(card.querySelector(".gallery-slideshow") ? 1 : 0)
	const galleryDate = (
		card: HTMLElement,
		primary: "galleryUpdatedAt" | "galleryCreatedAt",
		fallback: "galleryUpdatedAt" | "galleryCreatedAt",
	): number =>
		nativeGalleryDate(card.dataset[primary]) ||
		nativeGalleryDate(card.dataset[fallback])
	const byName = (a: HTMLElement, b: HTMLElement): number =>
		(a.querySelector("h4")?.textContent ?? "").localeCompare(
			b.querySelector("h4")?.textContent ?? "",
			undefined,
			{ sensitivity: "base" },
		)
	const compare = (a: HTMLElement, b: HTMLElement): number => {
		if (sortBy === "name-asc" || sortBy === "name-desc") {
			const result = byName(a, b)
			return sortBy === "name-desc" ? -result : result
		}
		if (sortBy === "date-modified-desc" || sortBy === "new")
			return (
				galleryDate(b, "galleryUpdatedAt", "galleryCreatedAt") -
				galleryDate(a, "galleryUpdatedAt", "galleryCreatedAt")
			)
		if (sortBy === "date-modified-asc" || sortBy === "old")
			return (
				galleryDate(a, "galleryUpdatedAt", "galleryCreatedAt") -
				galleryDate(b, "galleryUpdatedAt", "galleryCreatedAt")
			)
		if (sortBy === "date-created-desc")
			return (
				galleryDate(b, "galleryCreatedAt", "galleryUpdatedAt") -
				galleryDate(a, "galleryCreatedAt", "galleryUpdatedAt")
			)
		if (sortBy === "date-created-asc")
			return (
				galleryDate(a, "galleryCreatedAt", "galleryUpdatedAt") -
				galleryDate(b, "galleryCreatedAt", "galleryUpdatedAt")
			)
		const scoreDiff = score(b) - score(a)
		const updatedDiff =
			galleryDate(b, "galleryUpdatedAt", "galleryCreatedAt") -
			galleryDate(a, "galleryUpdatedAt", "galleryCreatedAt")
		return scoreDiff || updatedDiff || byName(a, b)
	}

	const updateFeatured = (): void => {
		for (const [id, property, label] of [
			["trendingBraidsList", "featuredTrending", "Trending Styles"],
			["mostBookedStylesList", "featuredMostBooked", "Most Booked Styles"],
		] as const) {
			const list = document.getElementById(id)
			if (!list) continue
			list.replaceChildren()
			const selected = galleryItems.filter(
				(item) =>
					Boolean(item[property]) &&
					(filters.service === "all" ||
						item.serviceCategory === filters.service),
			)
			if (!selected.length) {
				const empty = document.createElement("span")
				empty.className = "gallery-feature-empty"
				empty.textContent = `No ${label.toLowerCase()} yet.`
				list.appendChild(empty)
				continue
			}
			for (const item of selected.slice(0, 6)) {
				const button = document.createElement("button")
				button.type = "button"
				button.className = "gallery-feature-pill"
				button.textContent = item.styleName
				add(button, "click", () => {
					const card = cards.find(
						(candidate) =>
							candidate.dataset.galleryId === (item.id ?? item.styleName),
					)
					card?.click()
				})
				list.appendChild(button)
			}
		}
	}

	const apply = (): void => {
		const matches = cards.filter((card) =>
			(Object.entries(filters) as [NativeGalleryFilter, string][]).every(
				([group, value]) => value === "all" || valueFor(card, group) === value,
			),
		)
		matches.sort(compare).forEach((card) => grid.appendChild(card))
		cards.forEach((card) => {
			const visible =
				matches.includes(card) && (showAll || matches.indexOf(card) < 8)
			card.style.display = visible ? "" : "none"
			if (visible)
				card.style.animationDelay = `${Math.max(0, matches.indexOf(card)) * 0.1}s`
		})
		const empty = document.getElementById("galleryEmptyState")
		if (empty) empty.style.display = matches.length ? "none" : "block"
		const actions = document.getElementById("galleryActions")
		if (actions) actions.style.display = matches.length > 8 ? "block" : "none"
		const button = document.getElementById("viewAllGallery")
		if (button)
			button.textContent = showAll ? "View Less Gallery" : "View All Gallery"
		updateFeatured()
	}

	document
		.querySelectorAll<HTMLElement>('[data-filter-group="service"]')
		.forEach((chip) =>
			add(chip, "click", () => {
				filters.service = chip.dataset.filterValue ?? "all"
				for (const group of [
					"subService",
					"length",
					"size",
					"styleType",
					"technique",
				] as const)
					filters[group] = "all"
				setChipState("service", filters.service)
				renderSubfilters()
				apply()
			}),
		)
	const sortSelect = document.getElementById("gallerySortSelect")
	add(sortSelect, "change", () => {
		if (sortSelect instanceof HTMLSelectElement)
			sortBy = sortSelect.value || "recommended"
		showAll = false
		apply()
	})
	add(document.getElementById("viewAllGallery"), "click", () => {
		showAll = !showAll
		apply()
	})
	renderSubfilters()
	apply()
	return () => listeners.forEach((remove) => remove())
}

function bindNativeContentControls(): () => void {
	const cleanup: Array<() => void> = []
	const add = <T extends EventTarget>(
		target: T | null,
		type: string,
		listener: EventListener,
	): void => {
		if (!target) return
		target.addEventListener(type, listener)
		cleanup.push(() => target.removeEventListener(type, listener))
	}

	const reviewGrid = document.getElementById("testimonialsGrid")
	if (reviewGrid) {
		const reviewCards = Array.from(
			reviewGrid.querySelectorAll<HTMLElement>(".testimonial-card"),
		)
		let showAllReviews = false
		let reviewSort = "featured"
		const reviewTime = (card: HTMLElement): number => {
			const parsed = Date.parse(card.dataset.reviewCreatedAt ?? "")
			return Number.isNaN(parsed) ? 0 : parsed
		}
		const featuredFirst = (a: HTMLElement, b: HTMLElement): number =>
			Number(b.dataset.reviewFeatured === "true") -
			Number(a.dataset.reviewFeatured === "true")
		const applyReviews = (): void => {
			const sorted = [...reviewCards].sort((a, b) => {
				const recencyDiff = reviewTime(b) - reviewTime(a)
				if (reviewSort === "newest") return recencyDiff
				if (reviewSort === "highest-rated") {
					const ratingDiff =
						Number(b.dataset.reviewRating ?? 0) -
						Number(a.dataset.reviewRating ?? 0)
					return ratingDiff || featuredFirst(a, b) || recencyDiff
				}
				return featuredFirst(a, b) || recencyDiff
			})
			sorted.forEach((card) => reviewGrid.appendChild(card))
			reviewCards.forEach((card, index) => {
				card.style.display = showAllReviews || index < 6 ? "" : "none"
			})
			const viewAll = document.getElementById("viewAllReviewsBtn")
			const viewLess = document.getElementById("viewLessReviewsBtn")
			const controls = document.getElementById("reviewsToggleControls")
			if (controls)
				controls.style.display = reviewCards.length > 6 ? "flex" : "none"
			viewAll?.classList.toggle(
				"hidden",
				showAllReviews || reviewCards.length <= 6,
			)
			viewLess?.classList.toggle(
				"hidden",
				!showAllReviews || reviewCards.length <= 6,
			)
		}
		const reviewSortSelect = document.getElementById("reviewsSortSelect")
		add(reviewSortSelect, "change", () => {
			if (reviewSortSelect instanceof HTMLSelectElement)
				reviewSort = reviewSortSelect.value || "featured"
			showAllReviews = false
			applyReviews()
		})
		add(document.getElementById("viewAllReviewsBtn"), "click", () => {
			showAllReviews = true
			applyReviews()
		})
		add(document.getElementById("viewLessReviewsBtn"), "click", () => {
			showAllReviews = false
			applyReviews()
		})
		applyReviews()
	}

	const blogGrid = document.getElementById("blogGrid")
	if (blogGrid) {
		const blogCards = Array.from(
			blogGrid.querySelectorAll<HTMLElement>(".blog-card"),
		)
		let showAllBlogs = false
		const applyBlogs = (): void => {
			blogCards.forEach((card, index) => {
				card.style.display = showAllBlogs || index < 3 ? "" : "none"
			})
			const viewAll = document.getElementById("viewAllBlogsBtn")
			const viewLess = document.getElementById("viewLessBlogsBtn")
			const controls = document.getElementById("blogToggleControls")
			const scrollControls = document.getElementById("blogScrollControls")
			if (controls)
				controls.style.display = blogCards.length > 3 ? "flex" : "none"
			if (scrollControls)
				scrollControls.style.display = blogCards.length > 0 ? "flex" : "none"
			viewAll?.classList.toggle("hidden", showAllBlogs || blogCards.length <= 3)
			viewLess?.classList.toggle(
				"hidden",
				!showAllBlogs || blogCards.length <= 3,
			)
		}
		add(document.getElementById("viewAllBlogsBtn"), "click", () => {
			showAllBlogs = true
			applyBlogs()
		})
		add(document.getElementById("viewLessBlogsBtn"), "click", () => {
			showAllBlogs = false
			applyBlogs()
		})
		add(document.getElementById("blogPrevBtn"), "click", () =>
			scrollBlogCards(-1),
		)
		add(document.getElementById("blogNextBtn"), "click", () => {
			if (!showAllBlogs && blogCards.length > 3) {
				showAllBlogs = true
				applyBlogs()
				window.requestAnimationFrame(() =>
					scrollBlogCards(1),
				)
				return
			}
			scrollBlogCards(1)
		})
		applyBlogs()
	}
	const scrollBlogCards = (direction: -1 | 1): void => {
		const firstCard = blogGrid?.querySelector<HTMLElement>(".blog-card")
		if (!blogGrid || !firstCard) return
		const styles = window.getComputedStyle(blogGrid)
		const gap = Number.parseFloat(styles.columnGap || styles.gap) || 24
		const step = firstCard.getBoundingClientRect().width + gap
		blogGrid.scrollBy({ left: direction * step, behavior: "smooth" })
	}

	const animationTimers: number[] = []
	let countersAnimated = false
	const animateCounters = (): void => {
		if (countersAnimated) return
		countersAnimated = true
		document
			.querySelectorAll<HTMLElement>("[data-count]")
			.forEach((element) => {
				const target = Number(element.dataset.count ?? 0)
				if (!Number.isFinite(target)) return
				const start = performance.now()
				const tick = (now: number): void => {
					const ratio = Math.min(1, (now - start) / 1200)
					element.textContent = String(Math.round(target * ratio))
					if (ratio < 1)
						animationTimers.push(window.requestAnimationFrame(tick))
				}
				animationTimers.push(window.requestAnimationFrame(tick))
			})
	}
	const counterObserver =
		"IntersectionObserver" in window
			? new IntersectionObserver(
					(entries, observer) => {
						if (!entries.some((entry) => entry.isIntersecting)) return
						animateCounters()
						observer.disconnect()
					},
					{ threshold: 0.2 },
				)
			: null
	const counters = document.querySelectorAll<HTMLElement>("[data-count]")
	if (counterObserver && counters.length) {
		counters.forEach((counter) => counterObserver.observe(counter))
		if (document.body.classList.contains("splash-active")) {
			add(document, "salon-splash-complete", animateCounters)
		} else {
			animateCounters()
		}
	} else if (counters.length) {
		animateCounters()
	}
	if (counterObserver) cleanup.push(() => counterObserver.disconnect())

	const slideshowTimers: number[] = []
	document
		.querySelectorAll<HTMLElement>(".gallery-slideshow")
		.forEach((slideshow) => {
			const timer = window.setInterval(
				() => slideshow.classList.toggle("is-showing-after"),
				4000,
			)
			slideshowTimers.push(timer)
		})
	cleanup.push(() => {
		animationTimers.forEach((frame) => window.cancelAnimationFrame(frame))
		slideshowTimers.forEach((timer) => window.clearInterval(timer))
	})
	return () => cleanup.forEach((remove) => remove())
}

function bindNativeSalonInteractions(
	galleryItems: readonly SalonGalleryItem[],
): () => void {
	const cleanup: Array<() => void> = []
	const add = <T extends EventTarget>(
		target: T | null,
		type: string,
		listener: EventListener,
	): void => {
		if (!target) return
		target.addEventListener(type, listener)
		cleanup.push(() => target.removeEventListener(type, listener))
	}

	const floatingWhatsApp = document.getElementById("floatingWhatsAppButton")
	const darkModeToggle = document.getElementById("darkModeToggle")
	add(darkModeToggle, "click", () => {
		const nextMode = document.documentElement.classList.contains("light-mode")
			? "dark"
			: "light"
		applyStorefrontColorMode(nextMode)
	})
	const serviceSelectForWhatsApp = document.getElementById("serviceSelect")
	const updateFloatingWhatsAppLink = (): void => {
		if (
			!(floatingWhatsApp instanceof HTMLAnchorElement) ||
			!(serviceSelectForWhatsApp instanceof HTMLSelectElement)
		)
			return
		const selectedOption =
			serviceSelectForWhatsApp.options[serviceSelectForWhatsApp.selectedIndex]
		const serviceName = serviceSelectForWhatsApp.value || "[Service name]"
		const price =
			selectedOption?.textContent?.match(/\(([^)]+)\)/)?.[1]?.trim() ||
			"[Price]"
		const orderOnly = selectedOption?.dataset.orderOnly === "true"
		const config = window.CLIENT_CONFIG as SalonClientConfig | undefined
		const businessName =
			config?.client?.name ??
			config?.brand?.businessName ??
			"the salon"
		const action = orderOnly ? "order" : "book"
		const text =
			"Hello " +
			businessName +
			", I would like to " +
			action +
			" " +
			serviceName +
			" (" +
			price +
			"). Please confirm the next steps."
		const baseUrl = getConfiguredWhatsAppUrl()
		const separator = baseUrl.includes("?") ? "&" : "?"
		floatingWhatsApp.href =
			baseUrl + separator + "text=" + encodeURIComponent(text)
	}
	add(serviceSelectForWhatsApp, "change", updateFloatingWhatsAppLink)
	updateFloatingWhatsAppLink()

	const navToggle = document.getElementById("navToggle")
	const nav = document.getElementById("nav")
	const toggleNav = (): void => {
		navToggle?.classList.toggle("active")
		nav?.classList.toggle("active")
		navToggle?.setAttribute("aria-expanded", String(nav?.classList.contains("active") ?? false))
		navToggle?.setAttribute(
			"aria-label",
			nav?.classList.contains("active") ? "Close salon menu" : "Open salon menu",
		)
		document.body.style.overflow = nav?.classList.contains("active")
			? "hidden"
			: ""
	}
	add(navToggle, "click", toggleNav)
	nav?.querySelectorAll("a").forEach((link) =>
		add(link, "click", () => {
			navToggle?.classList.remove("active")
			navToggle?.setAttribute("aria-expanded", "false")
			navToggle?.setAttribute("aria-label", "Open salon menu")
			nav.classList.remove("active")
			document.body.style.overflow = ""
		}),
	)

	const openAuth = (): void => setModalState("authModal", true)
	add(document.getElementById("openAuthModalBtn"), "click", openAuth)
	add(document.getElementById("closeAuthModalBtn"), "click", () =>
		setModalState("authModal", false),
	)
	add(document.getElementById("authModalBackdrop"), "click", () =>
		setModalState("authModal", false),
	)
	add(document.getElementById("dashboardAuthBtn"), "click", openAuth)
	add(document.getElementById("reviewAuthHintBtn"), "click", openAuth)
	add(document.getElementById("reviewSubmitAuthGateBtn"), "click", openAuth)

	const selectService = (serviceName: string): void => {
		const serviceSelect = document.getElementById("serviceSelect")
		if (serviceSelect instanceof HTMLSelectElement) {
			const normalizedService = serviceName.trim()
			const hasMatchingOption = Array.from(serviceSelect.options).some(
				(option) => option.value === normalizedService,
			)
			const customServiceGroup = document.getElementById("customServiceGroup")
			const customServiceInput = document.getElementById("customServiceInput")
			const isCustomService = !hasMatchingOption && normalizedService.length > 0
			serviceSelect.value = hasMatchingOption
				? normalizedService
				: isCustomService
					? "__custom_service__"
					: ""
			if (customServiceGroup) {
				customServiceGroup.classList.toggle("hidden", !isCustomService)
			}
			if (customServiceInput instanceof HTMLInputElement) {
				customServiceInput.value = isCustomService ? normalizedService : ""
				customServiceInput.required = isCustomService
			}
			serviceSelect.dispatchEvent(new Event("change", { bubbles: true }))
		}
		document
			.getElementById("booking")
			?.scrollIntoView({ behavior: "smooth", block: "start" })
	}
	const bookingServiceSelect = document.getElementById("serviceSelect")
	const updateCustomServiceInput = (): void => {
		if (!(bookingServiceSelect instanceof HTMLSelectElement)) return
		const isCustomService = bookingServiceSelect.value === "__custom_service__"
		const customServiceGroup = document.getElementById("customServiceGroup")
		const customServiceInput = document.getElementById("customServiceInput")
		customServiceGroup?.classList.toggle("hidden", !isCustomService)
		if (customServiceInput instanceof HTMLInputElement) {
			customServiceInput.required = isCustomService
			if (!isCustomService) customServiceInput.value = ""
		}
	}
	add(bookingServiceSelect, "change", updateCustomServiceInput)
	updateCustomServiceInput()
	const openWhatsApp = (serviceName: string, price: string): void => {
		const value = window.CLIENT_CONFIG?.social
		const base =
			typeof value === "object" &&
			value !== null &&
			"whatsapp" in value &&
			typeof value.whatsapp === "string"
				? value.whatsapp
				: "https://wa.me/254740470381"
		const separator = base.includes("?") ? "&" : "?"
		window.open(
			base +
				separator +
				"text=" +
				encodeURIComponent(`Hello, I would like to ${serviceName}. ${price}`),
			"_blank",
			"noopener,noreferrer",
		)
	}

	const root = document.querySelector<HTMLElement>(".salon-storefront-root")
	const backToTop = document.getElementById("backToTop")
	const updateBackToTopVisibility = (): void => {
		backToTop?.classList.toggle("visible", window.scrollY > 500)
	}
	add(window, "scroll", updateBackToTopVisibility)
	updateBackToTopVisibility()
	add(backToTop, "click", (event) => {
		event.preventDefault()
		window.scrollTo({
			top: 0,
			behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
				? "auto"
				: "smooth",
		})
	})
	let activeGalleryIndex = -1
	const openGalleryItem = (index: number): void => {
		const gallery = galleryItems[index]
		if (!gallery) return
		activeGalleryIndex = index
		const image = document.getElementById(
			"lightboxImg",
		) as HTMLImageElement | null
		const beforeAfter = document.getElementById("lightboxBeforeAfter")
		const before = document.getElementById(
			"lightboxBeforeImg",
		) as HTMLImageElement | null
		const after = document.getElementById(
			"lightboxAfterImg",
		) as HTMLImageElement | null
		if (image) {
			image.src = gallery.imageUrl
			image.alt = gallery.styleName
		}
		const details: Record<string, string | undefined> = {
			lightboxStyleName: gallery.styleName,
			lightboxStyleType: gallery.styleType ?? "Salon style",
			lightboxTimeTaken: gallery.timeTaken,
			lightboxPriceRange: gallery.priceRange,
			lightboxLength: gallery.length,
			lightboxSize: gallery.size,
			lightboxHairType: gallery.hairType,
			lightboxStylist: gallery.stylistName,
		}
		for (const [id, value] of Object.entries(details)) {
			const element = document.getElementById(id)
			if (element) element.textContent = value || "-"
		}
		const favorite = document.getElementById("lightboxFavoriteBtn")
		favorite?.setAttribute("data-fav-style-id", gallery.id ?? "")
		const whatsapp = document.getElementById("lightboxWhatsAppBtn")
		if (whatsapp instanceof HTMLElement) {
			whatsapp.dataset.whatsappService =
				gallery.serviceName ?? gallery.styleName
			whatsapp.dataset.whatsappPrice = gallery.priceRange ?? ""
		}
		if (gallery.beforeImageUrl && beforeAfter && before && after) {
			beforeAfter.style.display = "grid"
			before.src = gallery.beforeImageUrl
			after.src = gallery.imageUrl
			if (image) image.style.display = "none"
		} else {
			if (beforeAfter) beforeAfter.style.display = "none"
			if (image) image.style.display = "block"
		}
		setModalState("lightbox", true)
	}
	add(root, "click", (event) => {
		const target = event.target
		if (!(target instanceof Element)) return
		const bookButton = target.closest<HTMLElement>(".service-book-btn")
		if (bookButton?.dataset.serviceName) {
			if (bookButton.dataset.orderOnly === "true") {
				openWhatsApp(bookButton.dataset.serviceName, "")
			} else {
				selectService(bookButton.dataset.serviceName)
			}
			return
		}
		const whatsappButton = target.closest<HTMLElement>(".service-whatsapp-btn")
		if (whatsappButton?.dataset.whatsappService) {
			openWhatsApp(
				whatsappButton.dataset.whatsappService,
				whatsappButton.dataset.whatsappPrice ?? "",
			)
			return
		}
		const item = target.closest<HTMLElement>(".gallery-item")
		if (item?.dataset.galleryIndex) {
			if (target.closest(".gallery-save-favorite-btn")) return
			openGalleryItem(Number(item.dataset.galleryIndex))
		}
	})
	const openAdjacentGalleryItem = (direction: number): void => {
		const visibleIndexes = Array.from(
			document.querySelectorAll<HTMLElement>("#galleryGrid .gallery-item"),
		)
			.filter((card) => card.style.display !== "none")
			.map((card) => Number(card.dataset.galleryIndex))
		const currentPosition = Math.max(
			0,
			visibleIndexes.indexOf(activeGalleryIndex),
		)
		const nextIndex =
			visibleIndexes[
				(currentPosition + direction + visibleIndexes.length) %
					visibleIndexes.length
			]
		if (Number.isInteger(nextIndex)) openGalleryItem(nextIndex)
	}
	add(document.getElementById("lightboxPrev"), "click", () =>
		openAdjacentGalleryItem(-1),
	)
	add(document.getElementById("lightboxNext"), "click", () =>
		openAdjacentGalleryItem(1),
	)
	add(document.getElementById("lightboxBookNow"), "click", () => {
		const gallery = galleryItems[activeGalleryIndex]
		const serviceName =
			gallery?.serviceName?.trim() ||
			gallery?.styleName.trim() ||
			gallery?.styleType?.trim() ||
			""
		if (!serviceName) return
		selectService(serviceName)
		setModalState("lightbox", false)
	})
	add(document.getElementById("lightboxWhatsAppBtn"), "click", () => {
		const gallery = galleryItems[activeGalleryIndex]
		if (gallery)
			openWhatsApp(
				gallery.serviceName ?? gallery.styleName,
				gallery.priceRange ?? "",
			)
	})

	const servicesGrid = document.getElementById("servicesGrid")
	const groupedServicesMarkup = servicesGrid?.innerHTML ?? ""
	// The legacy renderer starts with category groups expanded. Without this
	// class the outer grid treats each category section as a service card and
	// collapses the cards inside each section into a single column.
	servicesGrid?.classList.add("is-grouped")
	const filterServices = (filter: string): void => {
		document.querySelectorAll<HTMLElement>(".services-tab").forEach((tab) => {
			tab.classList.toggle("active", tab.dataset.filter === filter)
		})
		if (!servicesGrid) return
		if (filter === "all") {
			servicesGrid.classList.add("is-grouped")
			servicesGrid.innerHTML = groupedServicesMarkup
			return
		}
		const groupedSnapshot = document.createElement("div")
		groupedSnapshot.innerHTML = groupedServicesMarkup
		const selectedGroup = Array.from(
			groupedSnapshot.querySelectorAll<HTMLElement>(".services-category-group"),
		).find((group) => group.dataset.category === filter)
		servicesGrid.classList.remove("is-grouped")
		servicesGrid.replaceChildren(
			...(selectedGroup
				? Array.from(
						selectedGroup.querySelectorAll<HTMLElement>(".service-card"),
					).map((card) => card.cloneNode(true))
				: []),
		)
	}
	document
		.querySelectorAll<HTMLElement>(".services-tab")
		.forEach((tab) =>
			add(tab, "click", () => filterServices(tab.dataset.filter ?? "all")),
		)

	const closeLightbox = (): void => setModalState("lightbox", false)
	add(document.getElementById("lightboxClose"), "click", closeLightbox)
	add(document.getElementById("lightbox"), "click", (event) => {
		if (event.target === document.getElementById("lightbox")) closeLightbox()
	})
	add(document, "keydown", (event) => {
		if (event instanceof KeyboardEvent && event.key === "Escape") {
			setModalState("lightbox", false)
			setModalState("authModal", false)
		}
	})

	const handleResetBooking = (): void => {
		const form = document.getElementById("bookingForm")
		const success = document.getElementById("bookingSuccess")
		if (form instanceof HTMLElement) form.style.display = ""
		if (success instanceof HTMLElement) success.style.display = "none"
		if (form instanceof HTMLFormElement) form.reset()
	}
	add(root, "click", (event) => {
		const target = event.target
		if (
			target instanceof Element &&
			target.closest('[data-action="reset-booking"]')
		)
			handleResetBooking()
	})

	const observer =
		"IntersectionObserver" in window
			? new IntersectionObserver(
					(entries) =>
						entries.forEach(
							(entry) =>
								entry.isIntersecting && entry.target.classList.add("visible"),
						),
					{ threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
				)
			: null
	root?.querySelectorAll<HTMLElement>(".animate-on-scroll").forEach((element) => {
		if (observer) {
			observer.observe(element)
		} else {
			// Keep content visible in browsers without IntersectionObserver rather
			// than leaving the scroll-reveal elements at opacity: 0.
			element.classList.add("visible")
		}
	})
	if (observer) cleanup.push(() => observer.disconnect())

	return () => {
		cleanup.forEach((remove) => remove())
		document.body.style.overflow = ""
	}
}

export function SalonStorefrontRuntime({
	tenantSlug,
	showAdminSearch = false,
	turnstileSiteKey,
	clientConfig,
}: SalonStorefrontRuntimeProps) {
	useEffect(() => {
		window.CLIENT_CONFIG = { ...clientConfig } as Record<string, unknown>
		applyNativeClientConfig(clientConfig)
		// Storefronts open directly into their homepage. The platform owns the
		// Beauty Sphia splash, so tenant stores never flash a second splash.
		const removeSplash = initializeNativeSplash(true)
		const removeImageSizeGuard = bindImageSizeGuard()
		const gallery = clientConfig.catalog?.gallery ?? []
		const removeInteractions = bindNativeSalonInteractions(gallery)
		const removeGalleryControls = bindNativeGalleryControls(gallery)
		const removeContentControls = bindNativeContentControls()
		const removeBooking = bindBookingAdapter(
			tenantSlug ?? "",
			turnstileSiteKey ?? "",
		)
		const removeAuth = bindAuthAdapter(tenantSlug ?? "", turnstileSiteKey ?? "")
		const removePublic = bindPublicParityAdapters(
			tenantSlug ?? "",
			turnstileSiteKey ?? "",
			gallery,
		)
		const removeAccount = bindAccountMutationAdapter(tenantSlug ?? "")
		const removeNavigation = addTenantNavigationLinks(tenantSlug ?? "")
		const removeAppSwitchLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-mobile-app-switch-link]"))
			.map((anchor) => initializeMobileAppSwitchLink(anchor))
		return () => {
			removeSplash()
			removeImageSizeGuard()
			removeInteractions()
			removeGalleryControls()
			removeContentControls()
			removeBooking()
			removeAuth()
			removePublic()
			removeAccount()
			removeNavigation()
			removeAppSwitchLinks.forEach((remove) => remove())
		}
	}, [clientConfig, tenantSlug, turnstileSiteKey])

	const services = clientConfig.catalog?.services ?? []
	const stylists = clientConfig.catalog?.stylists ?? []
	const gallery = clientConfig.catalog?.gallery ?? []
	const testimonials = clientConfig.catalog?.testimonials ?? []
	const blogs = clientConfig.catalog?.blogs ?? []
	const bookingPayment = clientConfig.bookingPayment
	const mpesaPaymentAvailable = Boolean(
		bookingPayment?.enabled &&
		bookingPayment.modes.some((mode) => mode === "partial" || mode === "full"),
	)
	const paymentModeLabels: Readonly<Record<BookingPaymentMode, string>> = {
		partial: "Partial payment deposit",
		full: "Full payment",
		after_service: "Pay after service",
	}
	const bookingPaymentContent = bookingPayment?.enabled ? (
		<div
			className="form-group full booking-payment-options"
			id="bookingPaymentGroup"
		>
			<label htmlFor="bookingPaymentMode">Payment option</label>
			<select
				name="paymentMode"
				id="bookingPaymentMode"
				defaultValue={bookingPayment.modes[0] ?? "after_service"}
			>
				{bookingPayment.modes.map((mode) => (
					<option value={mode} key={mode}>
						{paymentModeLabels[mode]}
						{mode === "partial"
							? ` (${bookingPayment.depositPercent}% deposit)`
							: ""}
					</option>
				))}
			</select>
			<small id="bookingPaymentHint">
				{bookingPayment.currency} payment instructions will be sent to the phone
				number entered above. WhatsApp orders and bookings do not use online
				payments.
			</small>
		</div>
	) : null

	const searchEntries: readonly SiteSearchEntry[] = [
		{ label: "Home", description: "Storefront homepage", href: "#home", keywords: "salon home" },
		{ label: "Services", description: "Browse salon services", href: "#services", keywords: "services prices" },
		{ label: "Booking", description: "Book an appointment", href: "#booking", keywords: "appointment schedule" },
		{ label: "Gallery", description: "Browse salon styles and photos", href: "#gallery", keywords: "styles photos braids" },
		{ label: "Reviews", description: "Client testimonials", href: "#testimonials", keywords: "reviews testimonials" },
		{ label: "Blog", description: "Salon tips and stories", href: "#blog", keywords: "articles tips content" },
		{ label: "Visit Us", description: "Location and opening hours", href: "#visit", keywords: "location hours address" },
		{ label: "Contact", description: "Get in touch with the salon", href: "#contact", keywords: "phone email whatsapp" },
		...services.map((service) => ({ label: service.name, description: service.desc, href: "#services", keywords: service.category })),
		...gallery.map((item) => ({ label: item.styleName, description: item.serviceName ?? item.styleType, href: "#gallery", keywords: item.hairType })),
		...testimonials.map((item) => ({ label: item.name, description: item.text, href: "#testimonials", keywords: item.role })),
		...blogs.map((item) => ({ label: item.title, description: item.excerpt, href: item.readMoreUrl ?? "#blog", keywords: item.category })),
		...(showAdminSearch && tenantSlug
			? [{ label: "Salon Admin", description: "Manage this salon's bookings, team, storefront, and settings", href: `/manage/${encodeURIComponent(tenantSlug)}`, keywords: "admin dashboard management" }]
			: []),
	]
	return (
		<div className="salon-storefront-root">
			<link rel="preconnect" href="https://fonts.googleapis.com" />
			<link
				href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700;800&display=swap"
				rel="stylesheet"
			/>
			<SalonStorefrontMarkup
				showSplash={false}
				verifyEmailHref={`/verify-email?tenant=${encodeURIComponent(tenantSlug ?? "royal-braids")}`}
				galleryContent={<SalonGallery items={gallery} />}
				servicesContent={<SalonServices items={services} />}
				testimonialsContent={<SalonTestimonials items={testimonials} />}
				blogContent={<SalonBlogs items={blogs} />}
				serviceOptions={<SalonServiceOptions items={services} />}
				stylistOptions={stylists.map((stylist) => (
					<option value={stylist.id} key={stylist.id}>
						{stylist.name}
						{stylist.title ? ` - ${stylist.title}` : ""}
					</option>
				))}
				bookingPaymentContent={bookingPaymentContent}
				mpesaPaymentAvailable={mpesaPaymentAvailable}
				searchEntries={searchEntries}
				reviewServiceOptions={services.map((service) => (
					<option value={service.name} key={service.name}>
						{service.name}
					</option>
				))}
			/>
		</div>
	)
}
