"use client"

import { useEffect, useRef, useState } from "react"
import { WifiOff } from "lucide-react"

async function canReachPlatform(): Promise<boolean> {
	if (!navigator.onLine) return false
	const controller = new AbortController()
	const timeoutId = window.setTimeout(() => controller.abort(), 4000)
	try {
		const response = await fetch("/platform/Beauty%20Sphia%20logo.webp", {
			method: "HEAD",
			cache: "no-store",
			signal: controller.signal,
		})
		return response.ok
	} catch {
		return false
	} finally {
		window.clearTimeout(timeoutId)
	}
}

export function OfflineNotice({ brandName = "Beauty Sphia" }: { readonly brandName?: string }) {
	const [isOffline, setIsOffline] = useState(false)
	const [isChecking, setIsChecking] = useState(false)
	const retryButtonRef = useRef<HTMLButtonElement>(null)

	useEffect(() => {
		let active = true
		const probeConnection = () => {
			void canReachPlatform().then((canReach) => {
				if (active) setIsOffline(!canReach)
			})
		}
		const markOffline = () => setIsOffline(true)
		probeConnection()
		window.addEventListener("online", probeConnection)
		window.addEventListener("offline", markOffline)
		return () => {
			active = false
			window.removeEventListener("online", probeConnection)
			window.removeEventListener("offline", markOffline)
		}
	}, [])

	useEffect(() => {
		if (!isOffline) return
		const previouslyFocused = document.activeElement
		retryButtonRef.current?.focus()
		return () => {
			if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
		}
	}, [isOffline])

	if (!isOffline) return null

	const retryConnection = async () => {
		setIsChecking(true)
		const canReach = await canReachPlatform()
		setIsOffline(!canReach)
		setIsChecking(false)
	}

	return (
		<div className="offline-notice" role="presentation">
			<section
				className="offline-notice__dialog"
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="offline-notice-title"
				aria-describedby="offline-notice-description"
				onKeyDown={(event) => {
					if (event.key === "Tab") {
						event.preventDefault()
						retryButtonRef.current?.focus()
					}
				}}
			>
				<div className="offline-notice__icon" aria-hidden="true">
					<WifiOff size={30} strokeWidth={1.8} />
				</div>
				<p className="offline-notice__eyebrow">Connection interrupted</p>
				<h2 id="offline-notice-title">Internet unavailable</h2>
				<p id="offline-notice-description">
					{brandName} needs an internet connection to keep your salon experience
					up to date. Check your Wi-Fi or mobile data, then try again.
				</p>
				<button
					ref={retryButtonRef}
					className="offline-notice__retry"
					type="button"
					onClick={retryConnection}
					disabled={isChecking}
				>
					{isChecking ? "Checking connection..." : "Try again"}
				</button>
			</section>
		</div>
	)
}
