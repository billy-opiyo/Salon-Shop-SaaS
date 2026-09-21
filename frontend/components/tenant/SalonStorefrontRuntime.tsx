"use client"

import { useEffect } from "react"
import { signIn, signOut } from "next-auth/react"

import { registerAccount } from "@/app/signup/actions"
import { SalonStorefrontMarkup } from "@/components/tenant/SalonStorefrontMarkup"
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
	readonly catalog?: {
		readonly services?: readonly SalonServiceItem[]
		readonly gallery?: readonly SalonGalleryItem[]
		readonly testimonials?: readonly SalonReviewItem[]
		readonly blogs?: readonly SalonBlogItem[]
	}
}

export interface SalonStorefrontRuntimeProps {
	readonly tenantSlug?: string
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

	items.forEach((item) => {
		const record =
			typeof item === "object" && item !== null
				? (item as AdminSnapshotRecord)
				: { value: item }
		const row = document.createElement("article")
		row.className = "admin-snapshot-row"
		const title = document.createElement("strong")
		title.textContent = String(
			record.serviceName ??
				record.styleName ??
				record.title ??
				record.subject ??
				record.name ??
				record.email ??
				record.changeType ??
				record.value ??
				"Record",
		)
		row.append(title)
		const details = document.createElement("p")
		details.textContent = Object.entries(record)
			.filter(
				([key]) =>
					![
						"serviceName",
						"styleName",
						"title",
						"subject",
						"name",
						"email",
						"value",
					].includes(key),
			)
			.map(([key, value]) => `${key}: ${formatAdminSnapshotValue(value)}`)
			.join(" · ")
		row.append(details)
		const recordId =
			elementId === "adminAdminsList" && typeof record.userId === "string"
				? record.userId
				: typeof record.id === "string"
					? record.id
					: ""
		const status = typeof record.status === "string" ? record.status : ""
		const actionGroup = document.createElement("div")
		actionGroup.className = "admin-platform-actions"
		if (recordId) {
			const detailButton = document.createElement("button")
			detailButton.type = "button"
			detailButton.className = "btn btn-outline admin-platform-detail"
			detailButton.dataset.adminDetail = JSON.stringify(record)
			detailButton.textContent = "Details"
			actionGroup.append(detailButton)
		}
		const addAction = (
			action: string,
			label: string,
			extra: Record<string, string> = {},
		) => {
			if (!recordId) return
			const button = document.createElement("button")
			button.type = "button"
			button.className = "btn btn-outline admin-platform-action"
			button.dataset.adminAction = action
			button.dataset.adminId = recordId
			Object.entries(extra).forEach(([key, value]) => {
				button.dataset[key] = value
			})
			button.textContent = label
			actionGroup.append(button)
		}
		if (elementId === "adminBookingsList") {
			if (status === "PENDING" || status === "WAITLISTED")
				addAction("booking-status", "Confirm", { status: "CONFIRMED" })
			if (
				status === "PENDING" ||
				status === "CONFIRMED" ||
				status === "WAITLISTED"
			)
				addAction("booking-status", "Cancel", { status: "CANCELLED" })
			if (status === "CONFIRMED")
				addAction("booking-status", "Complete", { status: "COMPLETED" })
		}
		if (elementId === "adminWaitlistList") {
			if (status === "WAITING")
				addAction("waitlist-status", "Contact", { status: "CONTACTED" })
			if (status === "WAITING" || status === "CONTACTED")
				addAction("waitlist-convert", "Book")
			if (status !== "CANCELLED")
				addAction("waitlist-status", "Cancel", { status: "CANCELLED" })
		}
		if (elementId === "adminContactList") {
			if (status === "NEW")
				addAction("message-status", "Mark read", { status: "READ" })
			if (status !== "RESOLVED")
				addAction("message-status", "Resolve", { status: "RESOLVED" })
			addAction("message-delete", "Delete")
		}
		if (elementId === "adminReviewsList") {
			if (status === "PENDING")
				addAction("review-update", "Approve", { status: "APPROVED" })
			if (status === "PENDING")
				addAction("review-update", "Reject", { status: "REJECTED" })
			addAction("review-delete", "Delete")
		}
		if (elementId === "adminGalleryList") {
			addAction(
				"gallery-publication",
				record.published === true ? "Unpublish" : "Publish",
				{ published: String(record.published !== true) },
			)
			addAction("gallery-delete", "Delete")
		}
		if (elementId === "adminBlogsList") {
			addAction(
				"blog-publication",
				record.published === true ? "Unpublish" : "Publish",
				{ published: String(record.published !== true) },
			)
			addAction("blog-delete", "Delete")
		}
		if (elementId === "adminAdminsList")
			addAction("team-member-remove", "Remove")
		if (elementId === "adminSecurityAlertsList" && !record.resolvedAt)
			addAction("security-resolve-alert", "Resolve")
		row.append(actionGroup)
		element.append(row)
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

export function bindAdminSnapshotAdapter(tenantSlug: string): () => void {
	const loginForm = document.getElementById("adminLoginForm")
	const panel = document.getElementById("adminPanel")
	const confirmationModal = document.getElementById("adminConfirmModal")
	const closeConfirmation = () => {
		confirmationModal?.classList.remove("active")
		confirmationModal?.setAttribute("aria-hidden", "true")
	}
	const userState = document.getElementById("adminUserState")
	const authMessage = document.getElementById("adminAuthMessage")
	if (loginForm instanceof HTMLElement) loginForm.style.display = "none"
	if (panel instanceof HTMLElement) panel.style.display = "block"
	if (userState) userState.textContent = "Signed in with platform account"
	if (authMessage) authMessage.textContent = ""

	const removeTabHandlers: Array<() => void> = []
	const actionHandler = (event: Event) => {
		const target = event.target
		if (!(target instanceof HTMLElement)) return
		const button = target.closest<HTMLButtonElement>(".admin-platform-action")
		if (!button) return
		const action = button.dataset.adminAction
		const id = button.dataset.adminId
		if (!action || !id) return
		button.disabled = true
		const payload: Record<string, unknown> = { action, id }
		if (button.dataset.status) payload.status = button.dataset.status
		if (button.dataset.published)
			payload.published = button.dataset.published === "true"
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
	confirmationModal?.addEventListener("click", confirmationBackdropHandler)
	removeTabHandlers.push(() => {
		document
			.getElementById("adminConfirmClose")
			?.removeEventListener("click", closeConfirmation)
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
				if (!section) return
				document
					.querySelectorAll<HTMLElement>("[data-admin-section-tab]")
					.forEach((item) => item.classList.toggle("active", item === tab))
				document
					.querySelectorAll<HTMLElement>("[data-admin-section]")
					.forEach((item) =>
						item.classList.toggle(
							"active",
							item.dataset.adminSection === section,
						),
					)
			}
			tab.addEventListener("click", handler)
			removeTabHandlers.push(() => tab.removeEventListener("click", handler))
		})

	let cancelled = false
	let scheduleDate = new Date()
	let scheduleMode: "day" | "week" = "week"
	let scheduleBookings: unknown[] = []
	const renderSchedule = () => {
		const grid = document.getElementById("adminScheduleGrid")
		if (!grid) return
		const start = new Date(scheduleDate)
		if (scheduleMode === "week") {
			const day = start.getDay()
			start.setDate(start.getDate() - day)
		}
		const days = scheduleMode === "day" ? 1 : 7
		grid.replaceChildren()
		for (let offset = 0; offset < days; offset += 1) {
			const date = new Date(start)
			date.setDate(start.getDate() + offset)
			const key = date.toISOString().slice(0, 10)
			const column = document.createElement("div")
			column.className = "admin-schedule-day"
			const heading = document.createElement("h3")
			heading.textContent = date.toLocaleDateString(undefined, {
				weekday: "short",
				month: "short",
				day: "numeric",
			})
			column.append(heading)
			const dayItems = scheduleBookings.filter((item) => {
				const record = item as AdminSnapshotRecord
				return String(record.appointmentDate ?? "").slice(0, 10) === key
			})
			if (!dayItems.length) {
				const empty = document.createElement("p")
				empty.className = "admin-empty-state"
				empty.textContent = "No appointments"
				column.append(empty)
			}
			dayItems.forEach((item) => {
				const record = item as AdminSnapshotRecord
				const event = document.createElement("button")
				event.type = "button"
				event.className = "admin-schedule-event"
				event.textContent = `${String(record.timeLabel ?? "Time")} - ${String(record.serviceName ?? "Appointment")}`
				event.title = `${String(record.firstName ?? "")} ${String(record.lastName ?? "")} (${String(record.status ?? "")})`
				column.append(event)
			})
			grid.append(column)
		}
		const label = document.getElementById("adminScheduleRangeLabel")
		if (label)
			label.textContent =
				scheduleMode === "day"
					? start.toLocaleDateString()
					: `${start.toLocaleDateString()} - ${new Date(start.getTime() + 6 * 86400000).toLocaleDateString()}`
	}
	const scheduleHandler = (event: Event) => {
		const target = event.target
		if (!(target instanceof HTMLElement)) return
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
		if (view === "day" || view === "week") scheduleMode = view
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
			const categoryMount = document.getElementById(
				"adminServiceCategoryToggles",
			)
			if (categoryMount) {
				categoryMount.replaceChildren()
				services.forEach((item) => {
					const category = item as AdminSnapshotRecord
					if (typeof category.id !== "string") return
					const label = document.createElement("label")
					label.className = "admin-service-toggle"
					const input = document.createElement("input")
					input.type = "checkbox"
					input.checked = category.enabled === true
					input.addEventListener("change", () => {
						void fetch(
							`/api/manage/${encodeURIComponent(tenantSlug)}/actions`,
							{
								method: "POST",
								credentials: "same-origin",
								headers: { "content-type": "application/json" },
								body: JSON.stringify({
									action: "category-visibility",
									id: category.id,
									enabled: input.checked,
								}),
							},
						).catch(() => {
							input.checked = !input.checked
						})
					})
					label.append(
						input,
						document.createTextNode(
							String(category.label ?? "Service category"),
						),
					)
					categoryMount.append(label)
				})
			}
			scheduleBookings = bookings
			renderSchedule()
			const stylists = Array.isArray(snapshot.stylists) ? snapshot.stylists : []
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
			renderAdminSnapshotList("adminReviewsList", reviews, "No reviews found.")
			renderAdminSnapshotList(
				"adminContactList",
				messages,
				"No messages found.",
			)
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
			const exportButton = document.getElementById("adminSecurityExportCsvBtn")
			if (exportButton instanceof HTMLButtonElement) {
				exportButton.onclick = () => {
					window.location.href = `/api/manage/${encodeURIComponent(tenantSlug)}/security/export`
				}
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
				adminMessagesTotalCount: messages.length,
				adminMessagesNewCount: messages.filter(
					(item) => (item as AdminSnapshotRecord).status === "NEW",
				).length,
				adminWaitlistTotalCount: waitlist.length,
				adminWaitlistWaitingCount: waitlist.filter(
					(item) => (item as AdminSnapshotRecord).status === "WAITING",
				).length,
				adminAdminsTotalCount: team.length,
				adminSecurityTotalCount: securityLogins.length,
			}
			Object.entries(counts).forEach(([id, count]) => {
				const element = document.getElementById(id)
				if (element) element.textContent = String(count)
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
	button.textContent = loading ? "Processing..." : "Confirm Booking"
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

function getMobileActionIconSvg(
	name: "home" | "gallery" | "book" | "favorite" | "account",
): string {
	const paths = {
		home: '<path d="m3 10 9-7 9 7"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>',
		gallery:
			'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.4"/><path d="m3 16 4.5-4.5 3.5 3.5 2.5-2.5L21 19"/>',
		book: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 9h16M8 13h.01M12 13h.01M16 13h.01M8 16h.01M12 16h.01"/>',
		favorite:
			'<path d="M20.8 8.6c0 5.5-8.8 10.4-8.8 10.4S3.2 14.1 3.2 8.6A4.6 4.6 0 0 1 12 6.2a4.6 4.6 0 0 1 8.8 2.4Z"/>',
		account:
			'<circle cx="12" cy="8" r="3.5"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
	} as const
	return `<svg class="mobile-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]}</svg>`
}

function addTenantNavigationLinks(tenantSlug: string): () => void {
	const root = document.querySelector<HTMLElement>(".salon-storefront-root")
	if (!root) return () => undefined
	const actionBar = document.createElement("nav")
	actionBar.className = "saas-tenant-mobile-actions"
	actionBar.setAttribute("aria-label", "Salon mobile navigation")
	const actions = [
		[null, "#home", "home", "Home"],
		[null, "#gallery", "gallery", "Gallery"],
		[null, "#booking", "book", "Book"],
		["dashboardFavoritesCard", "#clientDashboard", "favorite", "Favorites"],
		["dashboardProfileCard", "#clientDashboard", "account", "Account"],
	] as const

	// The dashboard section ships hidden (display:none) so anchors alone can't
	// reveal it. For the Favorites/Account mobile tabs we reveal the section,
	// then smooth-scroll to the targeted dashboard card. The other tabs remain
	// plain hash links.
	const revealAndFocusDashboardCard = (cardId: string): boolean => {
		const section = document.getElementById("clientDashboard")
		if (section?.classList.contains("hidden")) {
			section.classList.remove("hidden")
		}
		const target = document.getElementById(cardId)
		if (!target) return false
		target.scrollIntoView({ behavior: "smooth", block: "center" })
		target.setAttribute("tabindex", "-1")
		target.focus({ preventScroll: true })
		return true
	}

	actions.forEach(([cardId, href, icon, label]) => {
		const link = document.createElement("a")
		link.href = href
		link.setAttribute("aria-label", label)
		link.innerHTML = `${getMobileActionIconSvg(icon)}<small>${label}</small>`
		if (cardId) {
			link.addEventListener("click", (event) => {
				event.preventDefault()
				revealAndFocusDashboardCard(cardId)
			})
		}
		actionBar.append(link)
	})
	document.body.append(actionBar)

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
		actionBar.remove()
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
	const timer = window.setTimeout(() => popup.classList.remove("show"), durationMs)
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
): () => void {
	const contactForm = document.getElementById("contactForm")
	const reviewForm = document.getElementById("reviewForm")
	const termsModal = document.getElementById("termsModal")
	const termsCheckbox = document.getElementById("termsConsentCheckbox")
	const termsAcceptButton = document.getElementById("acceptTermsBtn")
	const contactSuccessClose = document.getElementById("contactSuccessPopupClose")
	const closeTermsModal = () => {
		termsModal?.classList.remove("active")
		termsModal?.setAttribute("aria-hidden", "true")
		document.body.style.overflow = ""
	}
	const updateTermsAcceptance = (): void => {
		if (termsAcceptButton instanceof HTMLButtonElement && termsCheckbox instanceof HTMLInputElement) {
			termsAcceptButton.disabled = !termsCheckbox.checked
		}
	}
	const acceptTerms = (): void => {
		if (!(termsCheckbox instanceof HTMLInputElement) || !termsCheckbox.checked) return
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
			if (termsCheckbox instanceof HTMLInputElement) termsCheckbox.checked = false
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
			if (submitButton instanceof HTMLButtonElement)
				submitButton.disabled = false
		}
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
		const response = await fetch("/api/favorites", {
			method: isSaved ? "DELETE" : "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ tenantSlug, galleryStyleId }),
		})
		const result = await readReferenceJson(response)
		if (!response.ok) {
			if (response.status === 401 || response.status === 403) {
				openSignInModal("Log in to save this gallery style.")
				return
			}
			const toast = document.getElementById("favoritesToast")
			if (toast) {
				toast.textContent = result.error ?? "Please sign in to save favorites."
				toast.classList.add("show")
			}
			return
		}
		button.setAttribute("aria-pressed", String(!isSaved))
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
		const save = document.getElementById("dashboardRescheduleSaveBtn")
		if (
			!(date instanceof HTMLInputElement) ||
			!(time instanceof HTMLSelectElement) ||
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

	const saveProfile = async (): Promise<void> => {
		const name = document.getElementById("manageAccountName")
		const phone = document.getElementById("manageAccountPhone")
		if (
			!(name instanceof HTMLInputElement) ||
			!(phone instanceof HTMLInputElement)
		)
			return
		const response = await fetch("/api/account", {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name: name.value, phone: phone.value }),
		})
		const result = await readReferenceJson(response)
		setReferenceFormMessage(
			"manageAccountMessage",
			response.ok
				? "Profile saved."
				: (result.error ?? "Profile could not be saved."),
			response.ok ? "success" : "error",
		)
		if (response.ok) await refreshReferenceAuthUi(tenantSlug)
	}

	const changePassword = async (): Promise<void> => {
		const current = document.getElementById("manageAccountCurrentPassword")
		const next = document.getElementById("manageAccountNewPassword")
		if (
			!(current instanceof HTMLInputElement) ||
			!(next instanceof HTMLInputElement)
		)
			return
		const response = await fetch("/api/account", {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				currentPassword: current.value,
				newPassword: next.value,
			}),
		})
		const result = await readReferenceJson(response)
		setReferenceFormMessage(
			"manageAccountMessage",
			response.ok
				? "Password changed."
				: (result.error ?? "Password could not be changed."),
			response.ok ? "success" : "error",
		)
		if (response.ok) {
			current.value = ""
			next.value = ""
		}
	}

	const deleteAccount = async (): Promise<void> => {
		const response = await fetch("/api/account", { method: "DELETE" })
		const result = await readReferenceJson(response)
		const message = document.getElementById("deleteAccountConfirmMessage")
		if (!response.ok) {
			if (message)
				message.textContent = result.error ?? "Account could not be deleted."
			return
		}
		await signOut({ redirect: false })
		window.location.assign("/")
	}

	const openDeleteAccount = (): void => {
		const modal = document.getElementById("deleteAccountConfirmModal")
		modal?.classList.add("active")
		modal?.setAttribute("aria-hidden", "false")
		document.body.style.overflow = "hidden"
	}
	const closeDeleteAccount = (): void => {
		const modal = document.getElementById("deleteAccountConfirmModal")
		modal?.classList.remove("active")
		modal?.setAttribute("aria-hidden", "true")
		document.body.style.overflow = ""
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
		.getElementById("manageAccountSaveProfileBtn")
		?.addEventListener("click", saveProfile)
	document
		.getElementById("manageAccountChangePasswordBtn")
		?.addEventListener("click", changePassword)
	document
		.getElementById("manageAccountDeleteBtn")
		?.addEventListener("click", openDeleteAccount)
	document
		.getElementById("deleteAccountConfirmProceedBtn")
		?.addEventListener("click", deleteAccount)
	document
		.getElementById("deleteAccountConfirmCloseBtn")
		?.addEventListener("click", closeDeleteAccount)
	document
		.getElementById("deleteAccountConfirmCancelBtn")
		?.addEventListener("click", closeDeleteAccount)
	document
		.getElementById("deleteAccountConfirmBackdrop")
		?.addEventListener("click", closeDeleteAccount)
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
			.getElementById("manageAccountSaveProfileBtn")
			?.removeEventListener("click", saveProfile)
		document
			.getElementById("manageAccountChangePasswordBtn")
			?.removeEventListener("click", changePassword)
		document
			.getElementById("manageAccountDeleteBtn")
			?.removeEventListener("click", openDeleteAccount)
		document
		.getElementById("deleteAccountConfirmProceedBtn")
			?.removeEventListener("click", deleteAccount)
		document
			.getElementById("deleteAccountConfirmCloseBtn")
			?.removeEventListener("click", closeDeleteAccount)
		document
			.getElementById("deleteAccountConfirmCancelBtn")
			?.removeEventListener("click", closeDeleteAccount)
		document
			.getElementById("deleteAccountConfirmBackdrop")
			?.removeEventListener("click", closeDeleteAccount)
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
		window.turnstile.render(container, {
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

	const signedIn = Boolean(user)
	loginButton?.classList.toggle("hidden", signedIn)
	profileMenu?.classList.toggle("hidden", !signedIn)
	dashboardLink?.classList.toggle("hidden", !signedIn)
	dashboard?.classList.toggle("hidden", !signedIn)
	dashboardAuthButton?.classList.toggle("hidden", signedIn)

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
	readonly bookings: readonly {
		readonly id: string
		readonly serviceName: string
		readonly appointmentDate: string
		readonly timeLabel: string
		readonly status: string
		readonly stylistName: string | null
		readonly specialRequests: string | null
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

function renderReferenceDashboard(
	snapshot: ClientAccountSnapshotPayload,
): void {
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
		renderReferenceDashboard(snapshot)
	} catch {
		setDashboardMessage("Your dashboard data could not be loaded.", "error")
	}
}

function bindAccountMutationAdapter(): () => void {
	const profileButton = document.getElementById("manageAccountSaveProfileBtn")
	const passwordButton = document.getElementById(
		"manageAccountChangePasswordBtn",
	)
	const deleteButton = document.getElementById("manageAccountDeleteBtn")
	const preferencesButton = document.getElementById(
		"manageAccountSavePreferencesBtn",
	)
	const confirmDeleteButton = document.getElementById("deleteAccountConfirmProceedBtn")
	const closeDeleteButton = document.getElementById(
		"deleteAccountConfirmCloseBtn",
	)
	const cancelDeleteButton = document.getElementById(
		"deleteAccountConfirmCancelBtn",
	)
	const backdrop = document.getElementById("deleteAccountConfirmBackdrop")
	const message = document.getElementById("manageAccountMessage")
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
		const phone = document.getElementById("manageAccountPhone")
		if (
			!(name instanceof HTMLInputElement) ||
			!(phone instanceof HTMLInputElement)
		)
			return
		if (await patchAccount({ name: name.value, phone: phone.value }))
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
		)
			setMessage("Preferences saved.")
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
	deleteButton?.addEventListener("click", openDelete)
	confirmDeleteButton?.addEventListener("click", confirmDelete)
	closeDeleteButton?.addEventListener("click", closeDelete)
	cancelDeleteButton?.addEventListener("click", closeDelete)
	backdrop?.addEventListener("click", closeDelete)
	return () => {
		profileButton?.removeEventListener("click", saveProfile)
		passwordButton?.removeEventListener("click", changePassword)
		preferencesButton?.removeEventListener("click", savePreferences)
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
	void refreshReferenceAuthUi(tenantSlug)

	return () => {
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
	}
}
function bindBookingAdapter(
	tenantSlug: string,
	turnstileSiteKey: string,
): () => void {
	const form = document.getElementById("bookingForm")
	if (!(form instanceof HTMLFormElement)) return () => undefined

	ensureTurnstile(form, turnstileSiteKey)

	const submit = async (event: Event): Promise<void> => {
		event.preventDefault()
		event.stopImmediatePropagation()

		const firstName = getFormValue(form, "firstName")
		const lastName = getFormValue(form, "lastName")
		const email = getFormValue(form, "email")
		const phone = getFormValue(form, "phone")
		const serviceName = getFormValue(form, "service")
		const customService = getFormValue(form, "customService")
		const serviceSelect = document.getElementById("serviceSelect")
		const selectedOption =
			serviceSelect instanceof HTMLSelectElement
				? serviceSelect.options[serviceSelect.selectedIndex]
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
			const response = await fetch("/api/bookings", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					tenantSlug,
					firstName,
					lastName,
					email,
					phone,
					serviceName: customService || serviceName,
					customService: customService || undefined,
					appointmentDate,
					timeLabel,
					specialRequests: specialRequests || undefined,
					turnstileToken,
				}),
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

			setBookingMessage(
				"Booking request received. We will confirm your appointment shortly.",
				"success",
			)
			showBookingSuccess()
		} catch {
			setBookingMessage(
				"The booking service could not be reached. Please try again.",
				"error",
			)
		} finally {
			setBookingLoading(button, false)
		}
	}

	const waitlistButton = document.getElementById("joinWaitlistBtn")
	const joinWaitlist = async (event: Event): Promise<void> => {
		event.preventDefault()
		event.stopImmediatePropagation()
		if (!(waitlistButton instanceof HTMLButtonElement)) return

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
		const preferredTime =
			preferredTimeElement instanceof HTMLSelectElement
				? preferredTimeElement.value.trim()
				: ""

		waitlistButton.disabled = true
		waitlistButton.setAttribute("aria-busy", "true")
		try {
			const response = await fetch("/api/waitlist", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					tenantSlug,
					name,
					email: getFormValue(form, "email"),
					phone: getFormValue(form, "phone"),
					serviceName:
						getFormValue(form, "customService") ||
						getFormValue(form, "service"),
					preferredDate: getFormValue(form, "date") || undefined,
					preferredTime:
						preferredTime || getFormValue(form, "time") || undefined,
					preferredStylist: getFormValue(form, "stylist") || undefined,
					turnstileToken,
				}),
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

			setBookingMessage(
				"You have been added to the waitlist. We will notify you if the time opens.",
				"success",
			)
		} catch {
			setBookingMessage(
				"The waitlist service could not be reached. Please try again.",
				"error",
			)
		} finally {
			waitlistButton.disabled = false
			waitlistButton.removeAttribute("aria-busy")
		}
	}

	form.addEventListener("submit", submit, true)
	waitlistButton?.addEventListener("click", joinWaitlist, true)
	return () => {
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
		.replace(/&lt;(\/?)span&gt;/gi, (_, closing: string) => "<" + closing + "span>")
		.replace(
		/&lt;(\/?)(br\s*\/?)&gt;/gi,
		(_, closing: string) => `<${closing}br />`,
	)
}

function applyNativeClientConfig(config: SalonClientConfig): void {
	document.querySelectorAll<HTMLElement>("[data-client-text]").forEach((element) => {
		const path = element.dataset.clientText
		const value = path ? readConfigValue(config, path) : undefined
		if (value !== undefined && value !== null) element.textContent = String(value)
	})
	document.querySelectorAll<HTMLElement>("[data-client-html]").forEach((element) => {
		const path = element.dataset.clientHtml
		const value = path ? readConfigValue(config, path) : undefined
		if (value !== undefined && value !== null) {
			element.innerHTML = sanitizeInlineMarkup(value)
		}
	})
	document.querySelectorAll<HTMLElement>("[data-client-attr]").forEach((element) => {
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
	let mode = appearance.mode === "light" ? "light" : "dark"
	try {
		const savedTheme = localStorage.getItem("theme")
		if (savedTheme === "light" || savedTheme === "dark") mode = savedTheme
	} catch {
		// Use the tenant setting when browser storage is unavailable.
	}
	document.documentElement.classList.toggle("light-mode", mode === "light")
	document.documentElement.dataset.colorMode = mode
	document.documentElement.style.colorScheme = mode
	document.body.classList.toggle("light-mode", mode === "light")
	document.body.dataset.colorMode = mode
	if (appearance.preset) {
		document.documentElement.dataset.themePreset = appearance.preset
		document.body.dataset.themePreset = appearance.preset
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
		let meta = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
		if (!meta) {
			meta = document.createElement("meta")
			meta.setAttribute("property", property)
			document.head.append(meta)
		}
		meta.content = value
	}
	const favicon = config.brand?.favicon
	if (favicon) document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.setAttribute("href", favicon)
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
	const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
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
	if ([
		"authModal",
		"manageAccountModal",
		"lightbox",
		"termsModal",
		"dashboardRescheduleModal",
		"deleteAccountConfirmModal",
	].includes(id)) {
		document.body.style.overflow = open ? "hidden" : ""
	}
}

type NativeGalleryFilter = "service" | "subService" | "length" | "size" | "styleType" | "technique"

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
	const labelFor = (group: NativeGalleryFilter): string => ({
		service: "Services",
		subService: "Services",
		length: "Lengths",
		size: "Sizes",
		styleType: "Style Types",
		technique: "Techniques / Finishes",
	})[group]

	const setChipState = (group: NativeGalleryFilter, value: string): void => {
		document.querySelectorAll<HTMLElement>(`[data-filter-group="${group}"]`).forEach((chip) => {
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
		title.className = "sr-only"
		title.textContent = labelFor(group)
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
				? [["galleryLengthFilters", "length"], ["gallerySizeFilters", "size"], ["galleryStyleTypeFilters", "styleType"]]
			: service === "hair-services"
				? [["galleryLengthFilters", "subService"], ["gallerySizeFilters", "technique"], ["galleryStyleTypeFilters", "styleType"]]
				: service === "all"
					? []
					: [["galleryLengthFilters", "subService"], ["galleryStyleTypeFilters", "styleType"]]
		const configured = new Set(configs.map(([, group]) => group))
		for (const [mountId, group] of [["galleryLengthFilters", "length"], ["gallerySizeFilters", "size"], ["galleryStyleTypeFilters", "styleType"]] as const) {
			if (!configured.has(group)) renderGroup(mountId, group, [])
		}
		for (const [mountId, group] of configs) {
			const values = [...new Set(cards
				.filter((card) => service === "all" || valueFor(card, "service") === service)
				.map((card) => valueFor(card, group).trim())
				.filter(Boolean))].sort((a, b) => a.localeCompare(b))
			renderGroup(mountId, group, values)
		}
		const note = document.getElementById("galleryBraidsOnlyNote")
		if (note) note.style.display = configs.length ? "block" : "none"
	}

	const score = (card: HTMLElement): number =>
		(card.dataset.featuredTrending === "true" ? 2 : 0) +
		(card.dataset.featuredMostBooked === "true" ? 2 : 0)
	const compare = (a: HTMLElement, b: HTMLElement): number => {
		if (sortBy === "name-asc" || sortBy === "name-desc") {
			const result = (a.querySelector("h4")?.textContent ?? "").localeCompare(b.querySelector("h4")?.textContent ?? "")
			return sortBy === "name-desc" ? -result : result
		}
		if (sortBy === "date-modified-desc" || sortBy === "new") return nativeGalleryDate(b.dataset.galleryUpdatedAt) - nativeGalleryDate(a.dataset.galleryUpdatedAt)
		if (sortBy === "date-modified-asc" || sortBy === "old") return nativeGalleryDate(a.dataset.galleryUpdatedAt) - nativeGalleryDate(b.dataset.galleryUpdatedAt)
		if (sortBy === "date-created-desc") return nativeGalleryDate(b.dataset.galleryCreatedAt) - nativeGalleryDate(a.dataset.galleryCreatedAt)
		if (sortBy === "date-created-asc") return nativeGalleryDate(a.dataset.galleryCreatedAt) - nativeGalleryDate(b.dataset.galleryCreatedAt)
		const scoreDiff = score(b) - score(a)
		return scoreDiff || nativeGalleryDate(b.dataset.galleryUpdatedAt) - nativeGalleryDate(a.dataset.galleryUpdatedAt)
	}

	const updateFeatured = (): void => {
		for (const [id, property, label] of [
			["trendingBraidsList", "featuredTrending", "Trending Styles"],
			["mostBookedStylesList", "featuredMostBooked", "Most Booked Styles"],
		] as const) {
			const list = document.getElementById(id)
			if (!list) continue
			list.replaceChildren()
			const selected = galleryItems.filter((item) =>
				Boolean(item[property]) && (filters.service === "all" || item.serviceCategory === filters.service),
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
					const card = cards.find((candidate) => candidate.dataset.galleryId === (item.id ?? item.styleName))
					card?.click()
				})
				list.appendChild(button)
			}
		}
	}

	const apply = (): void => {
		const matches = cards.filter((card) =>
			(Object.entries(filters) as [NativeGalleryFilter, string][]).every(([group, value]) => value === "all" || valueFor(card, group) === value),
		)
		matches.sort(compare).forEach((card) => grid.appendChild(card))
		cards.forEach((card) => {
			const visible = matches.includes(card) && (showAll || matches.indexOf(card) < 8)
			card.style.display = visible ? "" : "none"
			if (visible) card.style.animationDelay = `${Math.max(0, matches.indexOf(card)) * 0.1}s`
		})
		const empty = document.getElementById("galleryEmptyState")
		if (empty) empty.style.display = matches.length ? "none" : "block"
		const actions = document.getElementById("galleryActions")
		if (actions) actions.style.display = matches.length > 8 ? "block" : "none"
		const button = document.getElementById("viewAllGallery")
		if (button) button.textContent = showAll ? "View Less Gallery" : "View All Gallery"
		updateFeatured()
	}

	document.querySelectorAll<HTMLElement>('[data-filter-group="service"]').forEach((chip) => add(chip, "click", () => {
		filters.service = chip.dataset.filterValue ?? "all"
		for (const group of ["subService", "length", "size", "styleType", "technique"] as const) filters[group] = "all"
		setChipState("service", filters.service)
		renderSubfilters()
		apply()
	}))
	const sortSelect = document.getElementById("gallerySortSelect")
	add(sortSelect, "change", () => {
		if (sortSelect instanceof HTMLSelectElement) sortBy = sortSelect.value || "recommended"
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
	const add = <T extends EventTarget>(target: T | null, type: string, listener: EventListener): void => {
		if (!target) return
		target.addEventListener(type, listener)
		cleanup.push(() => target.removeEventListener(type, listener))
	}

	const reviewGrid = document.getElementById("testimonialsGrid")
	if (reviewGrid) {
		const reviewCards = Array.from(reviewGrid.querySelectorAll<HTMLElement>(".testimonial-card"))
		let showAllReviews = false
		let reviewSort = "featured"
		const applyReviews = (): void => {
			const sorted = [...reviewCards].sort((a, b) => {
				if (reviewSort === "highest-rated") return Number(b.dataset.reviewRating ?? 0) - Number(a.dataset.reviewRating ?? 0)
				if (reviewSort === "newest") return Date.parse(b.dataset.reviewCreatedAt ?? "") - Date.parse(a.dataset.reviewCreatedAt ?? "")
				return Number(b.dataset.reviewRating ?? 0) - Number(a.dataset.reviewRating ?? 0)
			})
			sorted.forEach((card) => reviewGrid.appendChild(card))
			reviewCards.forEach((card, index) => {
				card.style.display = showAllReviews || index < 6 ? "" : "none"
			})
			const viewAll = document.getElementById("viewAllReviewsBtn")
			const viewLess = document.getElementById("viewLessReviewsBtn")
			const controls = document.getElementById("reviewsToggleControls")
			if (controls) controls.style.display = reviewCards.length > 6 ? "flex" : "none"
			viewAll?.classList.toggle("hidden", showAllReviews || reviewCards.length <= 6)
			viewLess?.classList.toggle("hidden", !showAllReviews || reviewCards.length <= 6)
		}
		const reviewSortSelect = document.getElementById("reviewsSortSelect")
		add(reviewSortSelect, "change", () => {
			if (reviewSortSelect instanceof HTMLSelectElement) reviewSort = reviewSortSelect.value || "featured"
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
		const blogCards = Array.from(blogGrid.querySelectorAll<HTMLElement>(".blog-card"))
		let showAllBlogs = false
		const applyBlogs = (): void => {
			blogCards.forEach((card, index) => {
				card.style.display = showAllBlogs || index < 3 ? "" : "none"
			})
			const viewAll = document.getElementById("viewAllBlogsBtn")
			const viewLess = document.getElementById("viewLessBlogsBtn")
			const controls = document.getElementById("blogToggleControls")
			if (controls) controls.style.display = blogCards.length > 3 ? "flex" : "none"
			viewAll?.classList.toggle("hidden", showAllBlogs || blogCards.length <= 3)
			viewLess?.classList.toggle("hidden", !showAllBlogs || blogCards.length <= 3)
		}
		add(document.getElementById("viewAllBlogsBtn"), "click", () => {
			showAllBlogs = true
			applyBlogs()
		})
		add(document.getElementById("viewLessBlogsBtn"), "click", () => {
			showAllBlogs = false
			applyBlogs()
		})
		add(document.getElementById("blogPrevBtn"), "click", () => blogGrid.scrollBy({ left: -blogGrid.clientWidth, behavior: "smooth" }))
		add(document.getElementById("blogNextBtn"), "click", () => blogGrid.scrollBy({ left: blogGrid.clientWidth, behavior: "smooth" }))
		applyBlogs()
	}

	const animationTimers: number[] = []
	let countersAnimated = false
	const animateCounters = (): void => {
		if (countersAnimated) return
		countersAnimated = true
		document.querySelectorAll<HTMLElement>("[data-count]").forEach((element) => {
			const target = Number(element.dataset.count ?? 0)
			if (!Number.isFinite(target)) return
			const start = performance.now()
			const tick = (now: number): void => {
				const ratio = Math.min(1, (now - start) / 1200)
				element.textContent = String(Math.round(target * ratio))
				if (ratio < 1) animationTimers.push(window.requestAnimationFrame(tick))
			}
			animationTimers.push(window.requestAnimationFrame(tick))
		})
	}
	const counterObserver = "IntersectionObserver" in window
		? new IntersectionObserver((entries, observer) => {
			if (!entries.some((entry) => entry.isIntersecting)) return
			animateCounters()
			observer.disconnect()
		}, { threshold: 0.2 })
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
	document.querySelectorAll<HTMLElement>(".gallery-slideshow").forEach((slideshow) => {
		const timer = window.setInterval(() => slideshow.classList.toggle("is-showing-after"), 4000)
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
	const add = <T extends EventTarget>(target: T | null, type: string, listener: EventListener): void => {
		if (!target) return
		target.addEventListener(type, listener)
		cleanup.push(() => target.removeEventListener(type, listener))
	}

	const navToggle = document.getElementById("navToggle")
	const nav = document.getElementById("nav")
	const toggleNav = (): void => {
		navToggle?.classList.toggle("active")
		nav?.classList.toggle("active")
		document.body.style.overflow = nav?.classList.contains("active") ? "hidden" : ""
	}
	add(navToggle, "click", toggleNav)
	nav?.querySelectorAll("a").forEach((link) =>
		add(link, "click", () => {
			navToggle?.classList.remove("active")
			nav.classList.remove("active")
			document.body.style.overflow = ""
		}),
	)

	const darkModeToggle = document.getElementById("darkModeToggle")
	const syncThemeToggle = (): void => {
		const isDark = !document.documentElement.classList.contains("light-mode")
		darkModeToggle?.classList.toggle("active", isDark)
		darkModeToggle?.setAttribute("aria-pressed", String(isDark))
	}
	const applyThemeToggle = (event: Event): void => {
		event.preventDefault()
		const nextMode = document.documentElement.classList.contains("light-mode")
			? "dark"
			: "light"
		const isDark = nextMode === "dark"
		document.documentElement.classList.toggle("light-mode", !isDark)
		document.body.classList.toggle("light-mode", !isDark)
		document.documentElement.dataset.colorMode = nextMode
		document.body.dataset.colorMode = nextMode
		document.documentElement.style.colorScheme = nextMode
		document.body.style.colorScheme = nextMode
		syncThemeToggle()
		try {
			localStorage.setItem("theme", nextMode)
		} catch {
			// Theme remains active for the current page when storage is unavailable.
		}
	}
	syncThemeToggle()
	add(darkModeToggle, "click", applyThemeToggle)
	add(darkModeToggle, "keydown", (event) => {
		if (!(event instanceof KeyboardEvent) || (event.key !== "Enter" && event.key !== " ")) return
		applyThemeToggle(event)
	})

	const openAuth = (): void => setModalState("authModal", true)
	add(document.getElementById("openAuthModalBtn"), "click", openAuth)
	add(document.getElementById("closeAuthModalBtn"), "click", () => setModalState("authModal", false))
	add(document.getElementById("authModalBackdrop"), "click", () => setModalState("authModal", false))
	add(document.getElementById("dashboardAuthBtn"), "click", openAuth)
	add(document.getElementById("reviewAuthHintBtn"), "click", openAuth)
	add(document.getElementById("reviewSubmitAuthGateBtn"), "click", openAuth)

	const selectService = (serviceName: string): void => {
		const serviceSelect = document.getElementById("serviceSelect")
		if (serviceSelect instanceof HTMLSelectElement) {
			serviceSelect.value = serviceName
			serviceSelect.dispatchEvent(new Event("change", { bubbles: true }))
		}
		document.getElementById("booking")?.scrollIntoView({ behavior: "smooth", block: "start" })
	}
	const openWhatsApp = (serviceName: string, price: string): void => {
		const value = window.CLIENT_CONFIG?.social
		const base = typeof value === "object" && value !== null && "whatsapp" in value && typeof value.whatsapp === "string"
			? value.whatsapp
			: "https://wa.me/254740470381"
		const separator = base.includes("?") ? "&" : "?"
		window.open(base + separator + "text=" + encodeURIComponent(`Hello, I would like to ${serviceName}. ${price}`), "_blank", "noopener,noreferrer")
	}

	const root = document.querySelector<HTMLElement>(".salon-storefront-root")
	let activeGalleryIndex = -1
	const openGalleryItem = (index: number): void => {
		const gallery = galleryItems[index]
		if (!gallery) return
		activeGalleryIndex = index
		const image = document.getElementById("lightboxImg") as HTMLImageElement | null
		const beforeAfter = document.getElementById("lightboxBeforeAfter")
		const before = document.getElementById("lightboxBeforeImg") as HTMLImageElement | null
		const after = document.getElementById("lightboxAfterImg") as HTMLImageElement | null
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
			whatsapp.dataset.whatsappService = gallery.serviceName ?? gallery.styleName
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
			openWhatsApp(whatsappButton.dataset.whatsappService, whatsappButton.dataset.whatsappPrice ?? "")
			return
		}
		const item = target.closest<HTMLElement>(".gallery-item")
		if (item?.dataset.galleryIndex) {
			if (target.closest(".gallery-save-favorite-btn")) return
			openGalleryItem(Number(item.dataset.galleryIndex))
		}
	})
	const openAdjacentGalleryItem = (direction: number): void => {
		const visibleIndexes = Array.from(document.querySelectorAll<HTMLElement>("#galleryGrid .gallery-item"))
			.filter((card) => card.style.display !== "none")
			.map((card) => Number(card.dataset.galleryIndex))
		const currentPosition = Math.max(0, visibleIndexes.indexOf(activeGalleryIndex))
		const nextIndex = visibleIndexes[(currentPosition + direction + visibleIndexes.length) % visibleIndexes.length]
		if (Number.isInteger(nextIndex)) openGalleryItem(nextIndex)
	}
	add(document.getElementById("lightboxPrev"), "click", () => openAdjacentGalleryItem(-1))
	add(document.getElementById("lightboxNext"), "click", () => openAdjacentGalleryItem(1))
	add(document.getElementById("lightboxBookNow"), "click", () => {
		const gallery = galleryItems[activeGalleryIndex]
		if (gallery?.serviceName) selectService(gallery.serviceName)
	})
	add(document.getElementById("lightboxWhatsAppBtn"), "click", () => {
		const gallery = galleryItems[activeGalleryIndex]
		if (gallery) openWhatsApp(gallery.serviceName ?? gallery.styleName, gallery.priceRange ?? "")
	})

	const filterServices = (filter: string): void => {
		document.querySelectorAll<HTMLElement>(".services-tab").forEach((tab) => {
			tab.classList.toggle("active", tab.dataset.filter === filter)
		})
		document.querySelectorAll<HTMLElement>(".services-category-group").forEach((group) => {
			group.style.display = filter === "all" || group.dataset.category === filter ? "" : "none"
		})
	}
	document.querySelectorAll<HTMLElement>(".services-tab").forEach((tab) =>
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
		if (target instanceof Element && target.closest('[data-action="reset-booking"]')) handleResetBooking()
	})

	const observer = "IntersectionObserver" in window
		? new IntersectionObserver((entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("visible")), { threshold: 0.1, rootMargin: "0px 0px -50px 0px" })
		: null
	root?.querySelectorAll(".animate-on-scroll").forEach((element) => observer?.observe(element))
	if (observer) cleanup.push(() => observer.disconnect())

	return () => {
		cleanup.forEach((remove) => remove())
		document.body.style.overflow = ""
	}
}

export function SalonStorefrontRuntime({
	tenantSlug,
	turnstileSiteKey,
	clientConfig,
}: SalonStorefrontRuntimeProps) {
	useEffect(() => {
		window.CLIENT_CONFIG = { ...clientConfig } as Record<string, unknown>
		applyNativeClientConfig(clientConfig)
		let skipStorefrontSplash = false
		try {
			skipStorefrontSplash = sessionStorage.getItem("salon-store-navigation") === "1"
			if (skipStorefrontSplash) {
				// Keep the marker through React development Strict Mode's immediate
				// effect cleanup/re-run, then expire it so direct reloads still show
				// the storefront splash normally.
				window.setTimeout(() => {
					try {
						sessionStorage.removeItem("salon-store-navigation")
					} catch {
						// Storage may be unavailable after navigation.
					}
				}, 10_000)
			}
		} catch {
			// Direct storefront loads keep the reference splash when storage is blocked.
		}
		const removeSplash = initializeNativeSplash(skipStorefrontSplash)
		const gallery = clientConfig.catalog?.gallery ?? []
		const removeInteractions = bindNativeSalonInteractions(gallery)
		const removeGalleryControls = bindNativeGalleryControls(gallery)
		const removeContentControls = bindNativeContentControls()
		const removeBooking = bindBookingAdapter(tenantSlug ?? "", turnstileSiteKey ?? "")
		const removeAuth = bindAuthAdapter(tenantSlug ?? "", turnstileSiteKey ?? "")
		const removePublic = bindPublicParityAdapters(tenantSlug ?? "", turnstileSiteKey ?? "")
		const removeAccount = bindAccountMutationAdapter()
		const removeNavigation = addTenantNavigationLinks(tenantSlug ?? "")
		return () => {
			removeSplash()
			removeInteractions()
			removeGalleryControls()
			removeContentControls()
			removeBooking()
			removeAuth()
			removePublic()
			removeAccount()
			removeNavigation()
		}
	}, [clientConfig, tenantSlug, turnstileSiteKey])

	const services = clientConfig.catalog?.services ?? []
	const gallery = clientConfig.catalog?.gallery ?? []
	const testimonials = clientConfig.catalog?.testimonials ?? []
	const blogs = clientConfig.catalog?.blogs ?? []

	return (
		<div className="salon-storefront-root">
			<link rel="preconnect" href="https://fonts.googleapis.com" />
			<link
				href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700;800&display=swap"
				rel="stylesheet"
			/>
			<SalonStorefrontMarkup
				galleryContent={<SalonGallery items={gallery} />}
				servicesContent={<SalonServices items={services} />}
				testimonialsContent={<SalonTestimonials items={testimonials} />}
				blogContent={<SalonBlogs items={blogs} />}
				serviceOptions={<SalonServiceOptions items={services} />}
				reviewServiceOptions={services.map((service) => (
					<option value={service.name} key={service.name}>
						{service.name}
					</option>
				))}
			/>
		</div>
	)
}
