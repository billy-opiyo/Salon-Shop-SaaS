"use client"

import { useCallback, useEffect, useState } from "react"
import { App } from "@capacitor/app"
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core"
import { Download, LoaderCircle, X } from "lucide-react"

import {
	getAndroidUpdateManifestUrl,
	isNativeUpdateCompatible,
	normalizeCertificateSha256,
	resolveAndroidUpdateChannel,
	validateAndroidUpdateManifest,
	type AndroidUpdateChannel,
	type AndroidUpdateManifest,
} from "@/lib/android-update-channel"

type AppUpdaterPlugin = {
	getPendingUpdate(options: { versionCode: number; channel: AndroidUpdateChannel; signingCertificateSha256: string }): Promise<{ downloadId: number | null }>
	checkUpdateCompatibility(options: { channel: AndroidUpdateChannel; applicationId: string; versionCode: number; signingCertificateSha256: string }): Promise<{ compatible: boolean }>
	downloadUpdate(options: { url: string; channel: AndroidUpdateChannel; applicationId: string; versionCode: number; versionName: string; signingCertificateSha256: string }): Promise<{ downloadId: number }>
	getDownloadStatus(options: { downloadId: number }): Promise<{ status: "running" | "paused" | "downloaded" | "failed" }>
	openDownloadedUpdate(options: { downloadId: number }): Promise<void>
}

const AppUpdater = registerPlugin<AppUpdaterPlugin>("AppUpdater")

export function AndroidAppUpdatePrompt({
	channel: websiteChannel,
	siteOrigin,
}: { readonly channel: AndroidUpdateChannel | null; readonly siteOrigin: string | null }) {
	const [update, setUpdate] = useState<AndroidUpdateManifest | null>(null)
	const [downloadId, setDownloadId] = useState<number | null>(null)
	const [downloadStatus, setDownloadStatus] = useState<"running" | "paused" | "downloaded" | "failed" | null>(null)
	const [busy, setBusy] = useState(false)
	const [message, setMessage] = useState("")
	const [channel, setChannel] = useState<AndroidUpdateChannel | null>(null)
	const [applicationId, setApplicationId] = useState("")

	const checkForUpdate = useCallback(async () => {
		if (!websiteChannel || !siteOrigin || window.location.origin !== siteOrigin
			|| !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return
		try {
			const info = await App.getInfo()
			const appChannel = resolveAndroidUpdateChannel(
				window.location.origin,
				info.id,
				websiteChannel === "production" ? siteOrigin : undefined,
			)
			const versionCode = Number.parseInt(info.build, 10)
			if (!appChannel || appChannel !== websiteChannel || !Number.isSafeInteger(versionCode) || versionCode < 1) return
			setChannel(appChannel)
			setApplicationId(info.id)
			const response = await fetch(getAndroidUpdateManifestUrl(appChannel, window.location.origin), {
				cache: "no-store",
				signal: AbortSignal.timeout(8000),
			})
			if (!response.ok) return setUpdate(null)
			const manifest = validateAndroidUpdateManifest(await response.json(), appChannel, window.location.origin, versionCode)
			if (!manifest) return setUpdate(null)
			const certificate = normalizeCertificateSha256(manifest.signingCertificateSha256)
			if (!certificate) return setUpdate(null)
			const compatibility = await AppUpdater.checkUpdateCompatibility({
				channel: appChannel,
				applicationId: info.id,
				versionCode: manifest.versionCode,
				signingCertificateSha256: certificate,
			})
			if (!isNativeUpdateCompatible(true, compatibility)) return setUpdate(null)
			setUpdate(manifest)
			const pending = await AppUpdater.getPendingUpdate({
				versionCode: manifest.versionCode,
				channel: appChannel,
				signingCertificateSha256: certificate,
			})
			if (pending.downloadId !== null) {
				const status = await AppUpdater.getDownloadStatus({ downloadId: pending.downloadId })
				setDownloadId(pending.downloadId)
				setDownloadStatus(status.status)
			}
		} catch {
			// Offline checks and older native app versions should not interrupt site use.
		}
	}, [siteOrigin, websiteChannel])

	useEffect(() => {
		if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return
		let active = true
		let handle: PluginListenerHandle | undefined
		const check = () => { if (active) void checkForUpdate() }
		check()
		const retryTimers = [2_000, 6_000].map((delay) => window.setTimeout(check, delay))
		const interval = window.setInterval(check, 3 * 60 * 1000)
		document.addEventListener("visibilitychange", check)
		window.addEventListener("online", check)
		void App.addListener("appStateChange", ({ isActive }) => { if (isActive) check() }).then((created) => {
			if (active) handle = created
			else void created.remove()
		})
		return () => {
			active = false
			retryTimers.forEach(window.clearTimeout)
			window.clearInterval(interval)
			document.removeEventListener("visibilitychange", check)
			window.removeEventListener("online", check)
			if (handle) void handle.remove()
		}
	}, [checkForUpdate])

	const downloadUpdate = async () => {
		if (!update || !channel || !applicationId) return
		setBusy(true)
		setMessage("")
		try {
			const result = await AppUpdater.downloadUpdate({
				url: new URL(update.apkUrl, window.location.origin).toString(),
				channel,
				applicationId,
				versionCode: update.versionCode,
				versionName: update.versionName,
				signingCertificateSha256: update.signingCertificateSha256,
			})
			setDownloadId(result.downloadId)
			setDownloadStatus("running")
			setMessage("Android Download Manager is downloading the update.")
		} catch {
			setMessage("The update download could not be started. Try again when you are online.")
		} finally {
			setBusy(false)
		}
	}

	const openInstaller = async () => {
		if (downloadId === null) return
		setBusy(true)
		try {
			await AppUpdater.openDownloadedUpdate({ downloadId })
		} catch {
			setMessage("Android could not open the installer. Allow Beauty Sphia to install updates, then retry.")
		} finally {
			setBusy(false)
		}
	}

	if (!update) return null
	return (
		<div className="android-update-backdrop">
			<section className="android-update-dialog" role="dialog" aria-modal="true" aria-labelledby="android-update-title">
				<button className="android-update-dialog__close" type="button" aria-label="Close update notice" onClick={() => setUpdate(null)}><X size={18} /></button>
				<p className="android-update-dialog__eyebrow">{channel === "staging" ? "Staging app update" : "Beauty Sphia update"}</p>
				<h2 id="android-update-title">Version {update.versionName} is ready</h2>
				{update.releaseNotes && <p>{update.releaseNotes}</p>}
				{message && <p role="status">{message}</p>}
				<button className="android-update-dialog__action" type="button" onClick={downloadStatus === "downloaded" ? openInstaller : downloadUpdate} disabled={busy || (downloadStatus !== null && downloadStatus !== "downloaded")}>
					{busy ? <LoaderCircle size={17} className="animate-spin" /> : <Download size={17} />}
					{busy ? "Working…" : downloadStatus === "downloaded" ? "Open installer" : downloadStatus === "running" || downloadStatus === "paused" ? "Download in progress" : "Download update"}
				</button>
				<p className="android-update-dialog__note">Android will ask you to confirm installation.</p>
			</section>
		</div>
	)
}
