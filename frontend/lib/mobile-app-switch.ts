import { Browser } from "@capacitor/browser"
import { Capacitor } from "@capacitor/core"

import { ANDROID_UPDATE_CHANNELS, type AndroidUpdateChannel } from "@/lib/android-update-channel"

function readChannel(): AndroidUpdateChannel | null {
	const channel = document.body.dataset.androidChannel
	return channel === "staging" || channel === "production" ? channel : null
}

function isDesktop(): boolean {
	return !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
		&& window.matchMedia("(min-width: 768px)").matches
}

function configureLink(anchor: HTMLAnchorElement, channel: AndroidUpdateChannel): () => void {
	const native = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android"
	const android = /Android/i.test(navigator.userAgent)
	const desktop = isDesktop()
	const downloadUrl = new URL(ANDROID_UPDATE_CHANNELS[channel].apkPath, window.location.origin).toString()
	anchor.hidden = false
	anchor.removeAttribute("target")
	anchor.removeAttribute("download")

	if (native) {
		anchor.textContent = "Open Website"
		anchor.href = window.location.href
		const openWebsite = (event: MouseEvent) => {
			event.preventDefault()
			void Browser.open({ url: window.location.href })
		}
		anchor.addEventListener("click", openWebsite)
		return () => anchor.removeEventListener("click", openWebsite)
	}

	if (desktop || !android) {
		anchor.textContent = "Download Mobile App"
		anchor.href = downloadUrl
		anchor.setAttribute("download", "")
		return () => undefined
	}

	anchor.textContent = "Open App"
	anchor.href = `intent://open/app#Intent;scheme=${ANDROID_UPDATE_CHANNELS[channel].applicationId};package=${ANDROID_UPDATE_CHANNELS[channel].applicationId};S.browser_fallback_url=${encodeURIComponent(downloadUrl)};end`
	return () => undefined
}

export function initializeMobileAppSwitchLink(anchor: HTMLAnchorElement): () => void {
	const channel = readChannel()
	if (!channel) {
		anchor.hidden = true
		return () => undefined
	}

	let removeConfiguredLink = configureLink(anchor, channel)
	const updateLabelAndDestination = () => {
		removeConfiguredLink()
		removeConfiguredLink = configureLink(anchor, channel)
	}
	window.addEventListener("resize", updateLabelAndDestination)
	return () => {
		window.removeEventListener("resize", updateLabelAndDestination)
		removeConfiguredLink()
	}
}
