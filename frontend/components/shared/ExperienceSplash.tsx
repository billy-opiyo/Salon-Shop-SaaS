"use client"

import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"
import Image from "next/image"

interface ExperienceSplashProps {
	readonly brandName: string
	readonly logoUrl: string
}

const SPLASH_DURATION_MS = 5000
const REDUCED_MOTION_DURATION_MS = 700
const SPLASH_EXIT_TRANSITION_MS = 850
const PLATFORM_SPLASH_SEEN_KEY = "beauty-sphia-platform-splash-seen"
const PLATFORM_SPLASH_DOCUMENT_KEY = "beauty-sphia-platform-splash-document"

function isDocumentReload(): boolean {
	const navigation = performance.getEntriesByType("navigation")[0]
	return (
		navigation instanceof PerformanceNavigationTiming &&
		navigation.type === "reload"
	)
}

function shouldShowSplashOnEntry(): boolean {
	try {
		const hasSeenSplash =
			sessionStorage.getItem(PLATFORM_SPLASH_SEEN_KEY) === "1"
		const documentIdentity = String(performance.timeOrigin)
		const isNewHardReload =
			isDocumentReload() &&
			sessionStorage.getItem(PLATFORM_SPLASH_DOCUMENT_KEY) !== documentIdentity
		sessionStorage.setItem(PLATFORM_SPLASH_DOCUMENT_KEY, documentIdentity)

		if (!hasSeenSplash || isNewHardReload) {
			sessionStorage.setItem(PLATFORM_SPLASH_SEEN_KEY, "1")
			return true
		}
		return false
	} catch {
		// Private browsing or blocked storage should still allow the splash once.
		return true
	}
}

export function ExperienceSplash({
	brandName,
	logoUrl,
}: ExperienceSplashProps) {
	const [shouldShow, setShouldShow] = useState(true)
	const hasResolvedEntryRef = useRef(false)
	const [isExiting, setIsExiting] = useState(false)
	const progressRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (hasResolvedEntryRef.current) return
		hasResolvedEntryRef.current = true
		setShouldShow(shouldShowSplashOnEntry())
	}, [])

	useEffect(() => {
		if (!shouldShow) {
			// Already seen this session (and it isn't a fresh hard refresh):
			// reveal the home shell immediately without ever painting the splash.
			document.documentElement.classList.remove("splash-active")
			document.body.classList.remove("splash-active")
			document.documentElement.classList.add("splash-complete")
			document.body.classList.add("splash-complete")
			return
		}

		const prefersReducedMotion = window.matchMedia?.(
			"(prefers-reduced-motion: reduce)",
		).matches
		const splashDurationMs = prefersReducedMotion
			? REDUCED_MOTION_DURATION_MS
			: SPLASH_DURATION_MS
		document.documentElement.classList.add("splash-active")
		document.body.classList.add("splash-active")
		const progressStart = performance.now()
		let animationFrameId = 0
		let hideTimeoutId = 0
		const updateProgress = (now: number) => {
			const elapsedMs = now - progressStart
			const nextProgress = Math.min(100, (elapsedMs / splashDurationMs) * 100)
			const progressElement = progressRef.current
			progressElement?.style.setProperty("--splash-progress", `${nextProgress}%`)
			progressElement?.setAttribute("aria-valuenow", String(Math.round(nextProgress)))

			if (elapsedMs < splashDurationMs) {
				animationFrameId = window.requestAnimationFrame(updateProgress)
				return
			}

			setIsExiting(true)
			document.documentElement.classList.remove("splash-active")
			document.body.classList.remove("splash-active")
			hideTimeoutId = window.setTimeout(() => {
				document.documentElement.classList.add("splash-complete")
				document.body.classList.add("splash-complete")
			}, prefersReducedMotion ? 0 : SPLASH_EXIT_TRANSITION_MS)
		}
		animationFrameId = window.requestAnimationFrame(updateProgress)

		return () => {
			window.cancelAnimationFrame(animationFrameId)
			window.clearTimeout(hideTimeoutId)
			document.documentElement.classList.remove(
				"splash-active",
				"splash-complete",
			)
			document.body.classList.remove("splash-active", "splash-complete")
		}
	}, [shouldShow])

	if (!shouldShow) return null

	return (
		<div
			className={`splash-screen${isExiting ? " splash-hide" : ""}`}
			role="status"
			aria-live="polite"
		>
			<div className="splash-bg" aria-hidden="true">
				<Image
					src="/assets/salon/1000_F_595420115_RZi6MAsq90qVRMfFz37ZKBianocAltUu.jpg"
					alt=""
					fill
					sizes="100vw"
					unoptimized
					priority
				/>
			</div>
			<div className="splash-content">
				<div
					className="splash-progress"
					role="progressbar"
					aria-label={`Loading ${brandName}`}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={0}
					ref={progressRef}
					style={{ "--splash-progress": "0%" } as CSSProperties}
				>
					<div className="splash-progress-track">
						<Image
							className="splash-progress-logo"
							src={logoUrl}
							alt=""
							width={96}
							height={96}
							unoptimized
							priority
						/>
					</div>
				</div>
				<p className="splash-loading-text">
					Preparing your salon...
				</p>
			</div>
		</div>
	)
}
