"use client"

import { useEffect, useState, type CSSProperties } from "react"

type Notice = {
	readonly id: number
	readonly message: string
	readonly type: "success" | "error" | "info"
	readonly colors: Readonly<Record<string, string>>
}

const THEME_VARIABLES = [
	"--primary", "--primary-dark", "--primary-light", "--primary-contrast",
	"--bg-primary", "--background", "--bg-secondary", "--bg-card", "--surface",
	"--text-primary", "--foreground", "--text-secondary", "--muted", "--border", "--line",
]

function themeColors(source: Element): Record<string, string> {
	const scope = source.closest(".platform-site, .salon-storefront-root, [data-theme-preset]") ?? source
	const computed = window.getComputedStyle(scope)
	return Object.fromEntries(THEME_VARIABLES.flatMap((name) => {
		const value = computed.getPropertyValue(name).trim()
		return value ? [[name, value]] : []
	}))
}

export function ActionNotificationViewport() {
	const [notice, setNotice] = useState<Notice | null>(null)
	useEffect(() => {
		let nextId = 0
		let timer: number | undefined
		const recentlyShown = new Map<string, number>()
		const show = (source: Element) => {
			if (source.closest("[data-action-notification-viewport]")) return
			const message = source.textContent?.replace(/\s+/g, " ").trim()
			if (!message || source.getAttribute("aria-hidden") === "true") return
			if (source instanceof HTMLElement && (source.hidden || source.classList.contains("hidden"))) return
			const now = Date.now()
			const lastShown = recentlyShown.get(message) ?? 0
			if (now - lastShown < 900) return
			recentlyShown.set(message, now)
			for (const [key, timestamp] of recentlyShown) if (now - timestamp > 10_000) recentlyShown.delete(key)
			const type = source.classList.contains("error") || source.classList.contains("form-message--error") || source.classList.contains("is-error") || source.getAttribute("role") === "alert"
				? "error"
				: source.classList.contains("success") || source.classList.contains("form-message--success")
					? "success"
					: "info"
			setNotice({ id: ++nextId, message, type, colors: themeColors(source) })
			if (timer !== undefined) window.clearTimeout(timer)
			timer = window.setTimeout(() => setNotice(null), 4000)
		}
		const observer = new MutationObserver((records) => {
			for (const record of records) {
				const target = record.target instanceof Element ? record.target : record.target.parentElement
				const candidates: Element[] = []
				const selector = ".form-message, [class*='form-message--']"
				const status = target?.closest<HTMLElement>(selector)
				if (status) candidates.push(status)
				for (const added of record.addedNodes) {
					if (!(added instanceof Element)) continue
					if (added.matches(selector)) candidates.push(added)
					candidates.push(...added.querySelectorAll(selector))
				}
				for (const candidate of new Set(candidates)) show(candidate)
			}
		})
		observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "role", "style", "hidden"] })
		return () => {
			observer.disconnect()
			if (timer !== undefined) window.clearTimeout(timer)
		}
	}, [])

	if (!notice) return null
	return (
		<div
			data-action-notification-viewport
			className={`action-notification action-notification--${notice.type}`}
			role={notice.type === "error" ? "alert" : "status"}
			aria-live={notice.type === "error" ? "assertive" : "polite"}
			key={notice.id}
			style={notice.colors as CSSProperties}
		>
			<span aria-hidden="true" className="action-notification__icon">{notice.type === "error" ? "!" : notice.type === "success" ? "✓" : "i"}</span>
			<span>{notice.message}</span>
		</div>
	)
}
