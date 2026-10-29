"use client"

import { useEffect, useState } from "react"
import { Capacitor } from "@capacitor/core"
import { Download, Smartphone, X } from "lucide-react"

import { getAndroidAppDownloadPath, type AndroidUpdateChannel } from "@/lib/android-update-channel"

const DISMISSED_KEY = "beauty-sphia.android-app-download.dismissed"

export function AndroidAppDownloadPrompt({ channel }: { readonly channel: AndroidUpdateChannel | null }) {
	const [visible, setVisible] = useState(false)
	const downloadPath = channel ? getAndroidAppDownloadPath(channel) : null

	useEffect(() => {
		if (!downloadPath || Capacitor.isNativePlatform() || window.sessionStorage.getItem(DISMISSED_KEY) === "1") return
		let active = true
		void fetch(downloadPath, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(8000) })
			.then((response) => { if (active && response.ok) setVisible(true) })
			.catch(() => undefined)
		return () => { active = false }
	}, [downloadPath])

	if (!visible || !downloadPath) return null
	const dismiss = () => {
		window.sessionStorage.setItem(DISMISSED_KEY, "1")
		setVisible(false)
	}
	return (
		<aside className="android-app-download-prompt" aria-label="Beauty Sphia Android app">
			<div className="android-app-download-prompt__icon" aria-hidden="true"><Smartphone size={22} /></div>
			<div className="android-app-download-prompt__copy">
				<strong>Your salon, in your pocket</strong>
				<span>Take Beauty Sphia with you on Android.</span>
			</div>
			<a className="android-app-download-prompt__action" href={downloadPath} download>
				<Download size={16} aria-hidden="true" />
				<span>Get the app</span>
			</a>
			<button className="android-app-download-prompt__close" type="button" onClick={dismiss} aria-label="Dismiss app download prompt">
				<X size={18} aria-hidden="true" />
			</button>
		</aside>
	)
}
