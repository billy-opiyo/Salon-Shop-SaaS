"use client"

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"

interface ExperienceSplashProps {
	readonly brandName: string
	readonly eyebrow: string
	readonly description: string
}

const SPLASH_DURATION_MS = 7000
const REDUCED_MOTION_DURATION_MS = 700
const POST_PROGRESS_DELAY_MS = 2000
const SPLASH_EXIT_TRANSITION_MS = 900

export function ExperienceSplash({
	brandName,
	eyebrow,
	description,
}: ExperienceSplashProps) {
	const [isExiting, setIsExiting] = useState(false)
	const [isVisible, setIsVisible] = useState(true)
	const [progress, setProgress] = useState(1)

	useEffect(() => {
		const prefersReducedMotion = window.matchMedia?.(
			"(prefers-reduced-motion: reduce)",
		).matches
		const splashDurationMs = prefersReducedMotion
			? REDUCED_MOTION_DURATION_MS
			: SPLASH_DURATION_MS
		document.documentElement.classList.add("splash-active")
		document.body.classList.add("splash-active")
		const progressStart = performance.now()
		const progressTickMs = Math.max(4, Math.floor(splashDurationMs / 100))
		const progressIntervalId = window.setInterval(() => {
			const elapsedMs = performance.now() - progressStart
			const nextProgress = Math.min(
				100,
				Math.floor((elapsedMs / splashDurationMs) * 100) + 1,
			)
			setProgress(nextProgress)
			if (nextProgress >= 100) window.clearInterval(progressIntervalId)
		}, progressTickMs)
		setProgress(1)
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
			window.clearInterval(progressIntervalId)
			document.documentElement.classList.remove(
				"splash-active",
				"splash-complete",
			)
			document.body.classList.remove("splash-active", "splash-complete")
		}
	}, [])

	if (!isVisible) return null

	const splashLetters = Array.from(brandName)
	const writeLetterDurationMs = Math.min(
		1080,
		Math.max(1, SPLASH_DURATION_MS * 0.108),
	)
	const writeStartDelayMs = Math.min(
		550,
		Math.max(0, SPLASH_DURATION_MS * 0.055),
	)
	const writeLastDelayMs = Math.max(
		0,
		SPLASH_DURATION_MS - writeLetterDurationMs,
	)
	const writeLetterStaggerMs =
		splashLetters.length > 1
			? (writeLastDelayMs - writeStartDelayMs) /
				(splashLetters.length - 1)
			: 0
	const fillDurationMs = Math.min(
		1250,
		Math.max(1, SPLASH_DURATION_MS * 0.125),
	)

	return (
		<div
			className={`splash-screen${isExiting ? " splash-hide" : ""}`}
			style={{
				"--splash-write-letter-duration": `${writeLetterDurationMs}ms`,
				"--splash-handwriting-fill-duration": `${fillDurationMs}ms`,
				"--splash-handwriting-fill-delay": `${Math.max(0, SPLASH_DURATION_MS - fillDurationMs)}ms`,
			} as CSSProperties}
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
							{splashLetters.map((letter, index) => (
								<tspan
									className="splash-handwriting-letter"
									style={{
										"--splash-write-delay": `${writeStartDelayMs + writeLetterStaggerMs * index}ms`,
									} as CSSProperties}
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
