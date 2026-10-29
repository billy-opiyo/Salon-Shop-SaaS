"use client"

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react"
import { App } from "@capacitor/app"
import { Browser } from "@capacitor/browser"
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

import {
	getSafeLocalCallbackUrl,
	PENDING_MOBILE_GOOGLE_AUTH_KEY,
} from "@/lib/mobileGoogleAuth"

type SystemBarsOptions = {
	background: string
	surface: string
	text: string
	muted: string
	primary: string
	lightIcons: boolean
}

type SystemBarsPlugin = {
	setColors(options: SystemBarsOptions): Promise<void>
}

type PendingAuth = {
	state: string
	verifier: string
	callbackUrl: string
	applicationId: string
}

const SystemBars = registerPlugin<SystemBarsPlugin>("BeautySphiaSystemBars")
const subscribeToPlatform = () => () => {}
const getAndroidPlatform = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android"
const COLOR_FALLBACKS = {
	background: "#17120c",
	surface: "#251b10",
	text: "#fff8e8",
	muted: "#c8bda8",
	primary: "#d7a84f",
}

function readCssColor(style: CSSStyleDeclaration, names: string[], fallback: string): string {
	for (const name of names) {
		const value = style.getPropertyValue(name).trim()
		if (/^#[0-9a-f]{6}$/i.test(value)) return value
	}
	return fallback
}

function isLightColor(hex: string): boolean {
	const channels = hex.slice(1).match(/.{2}/g)?.map((part) => parseInt(part, 16) / 255) ?? [0, 0, 0]
	const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
	return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2] > 0.48
}

function getThemeColors(): SystemBarsOptions {
	const root = document.querySelector<HTMLElement>(".platform-site, .salon-storefront-root") ?? document.documentElement
	const style = getComputedStyle(root)
	const background = readCssColor(style, ["--background", "--bg-primary", "--bg"], COLOR_FALLBACKS.background)
	return {
		background,
		surface: readCssColor(style, ["--surface", "--bg-card", "--bg-secondary"], COLOR_FALLBACKS.surface),
		text: readCssColor(style, ["--foreground", "--text-primary"], COLOR_FALLBACKS.text),
		muted: readCssColor(style, ["--muted", "--text-secondary"], COLOR_FALLBACKS.muted),
		primary: readCssColor(style, ["--primary", "--gold"], COLOR_FALLBACKS.primary),
		lightIcons: !isLightColor(background),
	}
}

function parsePendingAuth(value: string | null): PendingAuth | null {
	if (!value) return null
	try {
		const parsed = JSON.parse(value) as Partial<PendingAuth>
		if (typeof parsed.state !== "string" || !/^[0-9a-f-]{36}$/i.test(parsed.state)
			|| typeof parsed.verifier !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(parsed.verifier)
			|| typeof parsed.callbackUrl !== "string" || typeof parsed.applicationId !== "string") return null
		return parsed as PendingAuth
	} catch {
		return null
	}
}

export function AndroidNativeBridge() {
	const router = useRouter()
	const isAndroid = useSyncExternalStore(subscribeToPlatform, getAndroidPlatform, () => false)
	const [exitPrompt, setExitPrompt] = useState(false)
	const exitPromptRef = useRef(exitPrompt)
	const [authError, setAuthError] = useState("")
	exitPromptRef.current = exitPrompt

	useEffect(() => {
		if (!isAndroid) return
		let active = true
		const handles: PluginListenerHandle[] = []
		let themeTimer = 0

		const applyTheme = () => {
			if (!active) return
			void SystemBars.setColors(getThemeColors()).catch(() => undefined)
		}
		const scheduleTheme = () => {
			window.clearTimeout(themeTimer)
			themeTimer = window.setTimeout(applyTheme, 60)
		}
		applyTheme()
		const observer = new MutationObserver(scheduleTheme)
		observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true, attributeFilter: ["class", "style"] })

		void App.addListener("backButton", () => {
			if (exitPromptRef.current) return
			setExitPrompt(true)
		}).then((handle) => {
			if (active) handles.push(handle)
			else void handle.remove()
		})

		void App.addListener("appStateChange", ({ isActive }) => {
			if (isActive) scheduleTheme()
		}).then((handle) => {
			if (active) handles.push(handle)
			else void handle.remove()
		})

		void App.addListener("appUrlOpen", async ({ url }) => {
			let callback: URL
			try { callback = new URL(url) } catch { return }
			const pending = parsePendingAuth(window.localStorage.getItem(PENDING_MOBILE_GOOGLE_AUTH_KEY))
			if (!pending || callback.host !== "auth" || callback.pathname !== "/callback"
				|| callback.protocol !== `${pending.applicationId}:` || callback.searchParams.get("state") !== pending.state) return
			const ticket = callback.searchParams.get("ticket")
			if (!ticket || !/^[A-Za-z0-9_-]{40,60}$/.test(ticket)) return
			try {
				await Browser.close()
				const result = await signIn("mobile-google-ticket", {
					ticket,
					state: pending.state,
					verifier: pending.verifier,
					redirect: false,
				})
				if (result?.error) throw new Error("Google sign-in could not be verified. Please try again.")
				window.localStorage.removeItem(PENDING_MOBILE_GOOGLE_AUTH_KEY)
				const safeCallback = getSafeLocalCallbackUrl(pending.callbackUrl)
				router.replace(safeCallback ?? "/")
				router.refresh()
			} catch {
				window.localStorage.removeItem(PENDING_MOBILE_GOOGLE_AUTH_KEY)
				setAuthError("Google sign-in could not be completed. Please try again.")
			}
		}).then((handle) => {
			if (active) handles.push(handle)
			else void handle.remove()
		})

		return () => {
			active = false
			observer.disconnect()
			window.clearTimeout(themeTimer)
			for (const handle of handles) void handle.remove()
		}
	}, [isAndroid, router])

	if (!isAndroid || (!exitPrompt && !authError)) return null
	const colors = typeof document === "undefined" ? COLOR_FALLBACKS : getThemeColors()
	const dialogStyle = {
		"--native-dialog-background": colors.background,
		"--native-dialog-surface": colors.surface,
		"--native-dialog-text": colors.text,
		"--native-dialog-muted": colors.muted,
		"--native-dialog-primary": colors.primary,
	} as CSSProperties

	return (
		<div className="android-native-dialog-backdrop" style={dialogStyle}>
			<section className="android-native-dialog" role="alertdialog" aria-modal="true" aria-labelledby="android-native-dialog-title">
				<h2 id="android-native-dialog-title">{authError ? "Sign-in needs another try" : "Do You want to Exit?"}</h2>
				<p>{authError || "Are you sure you want to close Beauty Sphia?"}</p>
				<div className="android-native-dialog__actions">
					<button type="button" onClick={() => { setExitPrompt(false); setAuthError("") }}>{authError ? "Close" : "Cancel"}</button>
					{exitPrompt && <button type="button" onClick={() => void App.exitApp()}>Exit</button>}
				</div>
			</section>
		</div>
	)
}
