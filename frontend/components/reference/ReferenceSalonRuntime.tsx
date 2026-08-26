"use client"

import { useEffect } from "react"
import { signIn, signOut } from "next-auth/react"

import { registerAccount } from "@/app/signup/actions"

export interface ReferenceSalonRuntimeProps {
	readonly markup: string
	readonly bodyClassName: string
	readonly headStyles?: readonly string[]
	readonly tenantSlug?: string
	readonly turnstileSiteKey?: string
	readonly clientConfig: Readonly<Record<string, unknown>>
	readonly loadSalonRuntime?: boolean
	readonly runtimeKind?: "salon" | "admin" | "none"
}

declare global {
	interface Window {
		APP_CONFIG?: Record<string, unknown>
		CLIENT_CONFIG?: Record<string, unknown>
		__referenceSalonRuntimeLoaded?: boolean
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

const REFERENCE_SCRIPTS = [
	"/reference/JS/splash.js?v=20260602-splash-controller",
	"/reference/JS/apply-client-config.js",
	"/reference/JS/theme-preset-preview.js",
	"/reference/JS/script.js?v=20260531-waitlist-joined-feedback-mobile-time-picker-fix",
] as const

function loadClassicScript(source: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const selector = 'script[data-reference-src="' + source + '"]'
		if (document.querySelector(selector)) {
			resolve()
			return
		}

		const script = document.createElement("script")
		script.src = source
		script.async = false
		script.dataset.referenceSrc = source
		script.onload = () => resolve()
		script.onerror = () =>
			reject(new Error("Reference script failed to load: " + source))
		document.head.appendChild(script)
	})
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
		const recordId = typeof record.id === "string" ? record.id : ""
		const status = typeof record.status === "string" ? record.status : ""
		const actionGroup = document.createElement("div")
		actionGroup.className = "admin-platform-actions"
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
				addAction("waitlist-status", "Book", { status: "BOOKED" })
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

function bindAdminSnapshotAdapter(tenantSlug: string): () => void {
	const loginForm = document.getElementById("adminLoginForm")
	const panel = document.getElementById("adminPanel")
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

async function readReferenceJson(
	response: Response,
): Promise<{ readonly error?: string }> {
	try {
		const payload: unknown = await response.json()
		if (
			typeof payload === "object" &&
			payload !== null &&
			"error" in payload &&
			typeof payload.error === "string"
		) {
			return { error: payload.error }
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
		} else {
			setReferenceFormMessage(
				"contactFormMessage",
				result.error ?? "The message could not be sent.",
				"error",
			)
		}
		if (submitButton) submitButton.disabled = false
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
		const response = await fetch("/api/reviews", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				tenantSlug,
				rating: Number(rating.value),
				serviceName: service instanceof HTMLSelectElement ? service.value : "",
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
		if (submitButton instanceof HTMLButtonElement) submitButton.disabled = false
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
		if (modal) modal.setAttribute("aria-hidden", "false")
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
		if (response.ok)
			document
				.getElementById("dashboardRescheduleModal")
				?.setAttribute("aria-hidden", "true")
		if (save instanceof HTMLButtonElement) save.disabled = false
	}

	const closeReschedule = (): void => {
		document
			.getElementById("dashboardRescheduleModal")
			?.setAttribute("aria-hidden", "true")
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

	const openDeleteAccount = (): void =>
		document
			.getElementById("deleteAccountConfirmModal")
			?.setAttribute("aria-hidden", "false")
	const closeDeleteAccount = (): void =>
		document
			.getElementById("deleteAccountConfirmModal")
			?.setAttribute("aria-hidden", "true")

	contactForm?.addEventListener("submit", submitContact, true)
	reviewForm?.addEventListener("submit", submitReview, true)
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
		.getElementById("deleteAccountConfirmBtn")
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
	return () => {
		contactForm?.removeEventListener("submit", submitContact, true)
		reviewForm?.removeEventListener("submit", submitReview, true)
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
			.getElementById("deleteAccountConfirmBtn")
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
	const confirmDeleteButton = document.getElementById("confirmDeleteAccountBtn")
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
	const openDelete = (): void =>
		document
			.getElementById("deleteAccountConfirmModal")
			?.setAttribute("aria-hidden", "false")
	const closeDelete = (): void =>
		document
			.getElementById("deleteAccountConfirmModal")
			?.setAttribute("aria-hidden", "true")
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
	const logoutButton = document.getElementById("logoutBtn")
	const guestButton = document.getElementById("continueAsGuestBtn")
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

	const continueAsGuest = (event: Event): void => {
		event.preventDefault()
		event.stopImmediatePropagation()
		document.getElementById("authModal")?.setAttribute("aria-hidden", "true")
		setAuthMessage("You can continue booking as a guest.", "success")
	}

	form.addEventListener("submit", submit, true)
	logoutButton?.addEventListener("click", logout, true)
	guestButton?.addEventListener("click", continueAsGuest, true)
	void refreshReferenceAuthUi(tenantSlug)

	return () => {
		form.removeEventListener("submit", submit, true)
		logoutButton?.removeEventListener("click", logout, true)
		guestButton?.removeEventListener("click", continueAsGuest, true)
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

export function ReferenceSalonRuntime({
	markup,
	bodyClassName,
	headStyles,
	tenantSlug,
	turnstileSiteKey,
	clientConfig,
	loadSalonRuntime,
	runtimeKind,
}: ReferenceSalonRuntimeProps) {
	useEffect(() => {
		window.CLIENT_CONFIG = { ...clientConfig }
		window.APP_CONFIG = { ...(window.APP_CONFIG ?? {}), firebase: {} }

		const originalBodyClassName = document.body.className
		bodyClassName
			.split(/\s+/)
			.filter(Boolean)
			.forEach((className) => document.body.classList.add(className))

		const activeRuntime =
			runtimeKind ?? (loadSalonRuntime === false ? "none" : "salon")
		if (activeRuntime === "none")
			return () => {
				document.body.className = originalBodyClassName
			}

		if (window.__referenceSalonRuntimeLoaded) {
			return () => {
				document.body.className = originalBodyClassName
			}
		}

		window.__referenceSalonRuntimeLoaded = true
		let removeBookingAdapter: () => void = () => undefined
		let removePublicParityAdapters: () => void = () => undefined
		let removeAccountMutationAdapter: () => void = () => undefined

		const runtimeScripts =
			activeRuntime === "admin"
				? [
						"/reference/JS/apply-client-config.js",
						"/reference/JS/theme-preset-preview.js",
					]
				: REFERENCE_SCRIPTS

		void runtimeScripts
			.reduce(
				(chain, source) => chain.then(() => loadClassicScript(source)),
				Promise.resolve(),
			)
			.then(() => {
				if (activeRuntime === "salon") {
					const removeBooking = bindBookingAdapter(
						tenantSlug ?? "",
						turnstileSiteKey ?? "",
					)
					const removeAuth = bindAuthAdapter(
						tenantSlug ?? "",
						turnstileSiteKey ?? "",
					)
					removeBookingAdapter = () => {
						removeBooking()
						removeAuth()
					}
					removePublicParityAdapters = bindPublicParityAdapters(
						tenantSlug ?? "",
						turnstileSiteKey ?? "",
					)
					removeAccountMutationAdapter = bindAccountMutationAdapter()
				} else if (activeRuntime === "admin") {
					removeAccountMutationAdapter = bindAdminSnapshotAdapter(
						tenantSlug ?? "",
					)
				}
			})
			.catch((error: unknown) => {
				console.error("Reference salon runtime failed to initialize.", error)
			})

		return () => {
			removeBookingAdapter()
			removePublicParityAdapters()
			removeAccountMutationAdapter()
			document.body.className = originalBodyClassName
		}
	}, [
		bodyClassName,
		clientConfig,
		tenantSlug,
		turnstileSiteKey,
		loadSalonRuntime,
		runtimeKind,
	])

	return (
		<>
			{headStyles?.map((style, index) => (
				<style
					key={"reference-head-style-" + index}
					dangerouslySetInnerHTML={{ __html: style }}
				/>
			))}
			<link rel="preconnect" href="https://fonts.googleapis.com" />
			<link
				rel="preconnect"
				href="https://cdnjs.cloudflare.com"
				crossOrigin="anonymous"
			/>
			<link
				rel="preconnect"
				href="https://www.gstatic.com"
				crossOrigin="anonymous"
			/>
			<link
				href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700;800&display=swap"
				rel="stylesheet"
			/>
			<link
				rel="stylesheet"
				href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
			/>
			<link rel="stylesheet" href="/reference/CSS/style.css" />
			<div
				className="reference-salon-root"
				dangerouslySetInnerHTML={{ __html: markup }}
			/>
		</>
	)
}
