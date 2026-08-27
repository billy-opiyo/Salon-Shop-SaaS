"use client"

import { useEffect, useState } from "react"

interface ExperienceSplashProps {
	readonly brandName: string
	readonly eyebrow: string
	readonly description: string
}

const SPLASH_DURATION_MS = 7000
const REDUCED_MOTION_DURATION_MS = 700
const POST_PROGRESS_DELAY_MS = 2000
const SPLASH_EXIT_TRANSITION_MS = 900
const PLATFORM_SPLASH_SEEN_KEY = "beauty-sphia-platform-splash-seen"

function isDocumentReload(): boolean {
	const navigation = performance.getEntriesByType("navigation")[0]
	return (
		navigation instanceof PerformanceNavigationTiming &&
		navigation.type === "reload"
	)
}

export function ExperienceSplash({
	brandName,
	eyebrow,
	description,
}: ExperienceSplashProps) {
	const [isExiting, setIsExiting] = useState(false)
	const [isVisible, setIsVisible] = useState(true)
	const [progress, setProgress] = useState(1)

	useEffect(() => {
		let hasSeenSplash = false
		try {
			hasSeenSplash = sessionStorage.getItem(PLATFORM_SPLASH_SEEN_KEY) === "1"
			if (!hasSeenSplash || isDocumentReload()) {
				sessionStorage.setItem(PLATFORM_SPLASH_SEEN_KEY, "1")
			} else {
				document.documentElement.classList.remove("splash-active")
				document.body.classList.remove("splash-active")
				document.documentElement.classList.add("splash-complete")
				document.body.classList.add("splash-complete")
				const hideSplashTimeoutId = window.setTimeout(
					() => setIsVisible(false),
					0,
				)
				return () => window.clearTimeout(hideSplashTimeoutId)
			}
		} catch {
			// Private browsing or blocked storage should not prevent the splash.
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
		let progressFrameId = 0
		const updateProgress = (now: number) => {
			const nextProgress = Math.min(
				100,
				Math.round(1 + ((now - progressStart) / splashDurationMs) * 99),
			)
			setProgress(nextProgress)
			if (nextProgress < 100)
				progressFrameId = window.requestAnimationFrame(updateProgress)
		}
		progressFrameId = window.requestAnimationFrame(updateProgress)
		const completeTimeoutId = window.setTimeout(() => {
			setProgress(100)
			setIsExiting(true)
			document.documentElement.classList.remove("splash-active")
			document.body.classList.remove("splash-active")
			document.documentElement.classList.add("splash-complete")
			document.body.classList.add("splash-complete")
		}, splashDurationMs + POST_PROGRESS_DELAY_MS)
		const removeSplashTimeoutId = window.setTimeout(() => {
			setIsVisible(false)
		}, splashDurationMs + POST_PROGRESS_DELAY_MS + SPLASH_EXIT_TRANSITION_MS)

		return () => {
			window.clearTimeout(completeTimeoutId)
			window.clearTimeout(removeSplashTimeoutId)
			window.cancelAnimationFrame(progressFrameId)
			document.documentElement.classList.remove(
				"splash-active",
				"splash-complete",
			)
			document.body.classList.remove("splash-active", "splash-complete")
		}
	}, [])

	if (!isVisible) return null

	return (
		<div
			className={`splash-screen splash-animations-ready${isExiting ? " splash-hide" : ""}`}
			style={{
				"--splash-letter-stagger": `${Math.max(75, (SPLASH_DURATION_MS * 0.7) / Math.max(1, Array.from(brandName).length))}ms`,
				"--splash-handwriting-fill-duration": `${Math.min(700, SPLASH_DURATION_MS * 0.24)}ms`,
				"--splash-handwriting-fill-delay": `${SPLASH_DURATION_MS * 0.68}ms`,
			} as React.CSSProperties}
			role="status"
			aria-live="polite"
		>
			<div className="splash-bg" aria-hidden="true">
				<img
					src="/reference/IMG/1000_F_595420115_RZi6MAsq90qVRMfFz37ZKBianocAltUu.jpg"
					alt=""
				/>
			</div>
			<div className="splash-content">
				<p className="splash-kicker">{eyebrow}</p>
				<h1 className="splash-title" aria-label={brandName}>
					<svg
						className="splash-handwriting"
						viewBox="0 0 940 230"
						preserveAspectRatio="xMidYMid meet"
						aria-hidden="true"
					>
						<defs>
							<linearGradient
								id="platformSplashTitleGradient"
								x1="0"
								x2="1"
								y1="0"
								y2="0"
							>
								<stop offset="0%" stopColor="#f8e5b4" />
								<stop offset="42%" stopColor="#e8c27a" />
								<stop offset="72%" stopColor="#c8963e" />
								<stop offset="100%" stopColor="#fff3cf" />
							</linearGradient>
						</defs>
						<text
							className="splash-handwriting-shadow"
							x="470"
							y="128"
							textAnchor="middle"
						>
							{brandName}
						</text>
						<text
							className="splash-handwriting-fill"
							x="470"
							y="128"
							textAnchor="middle"
						>
							{brandName}
						</text>
						<text
							className="splash-handwriting-strokes"
							x="470"
							y="128"
							textAnchor="middle"
						>
							{Array.from(brandName).map((letter, index) => (
								<tspan
									className="splash-handwriting-letter"
									style={{ "--letter-index": index } as React.CSSProperties}
									key={`${letter}-${index}`}
								>
									{letter === " " ? "\u00a0" : letter}
								</tspan>
							))}
						</text>
					</svg>
				</h1>
				<div
					className="splash-progress"
					role="progressbar"
					aria-label={`Loading ${brandName}`}
					aria-valuemin={1}
					aria-valuemax={100}
					aria-valuenow={progress}
				>
					<div className="splash-progress-header">
						<span className="splash-progress-label">Loading</span>
						<span className="splash-progress-percent">{progress}%</span>
					</div>
					<div className="splash-progress-track">
						<div
							className="splash-progress-fill"
							style={{ width: `${progress}%` }}
						/>
					</div>
				</div>
				<p className="splash-loading-text">
					{description}
					<span className="splash-loading-dots" aria-hidden="true">
						<span>.</span>
						<span>.</span>
						<span>.</span>
					</span>
				</p>
			</div>
		</div>
	)
}
