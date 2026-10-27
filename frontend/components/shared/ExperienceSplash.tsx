"use client"

import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"
import Image from "next/image"

interface ExperienceSplashProps {
	readonly brandName: string
	readonly logoUrl: string
}

const SPLASH_DURATION_MS = 5000
const SPLASH_HOLD_MS = 2000
const SPLASH_EXIT_TRANSITION_MS = 850

export function ExperienceSplash({
	brandName,
	logoUrl,
}: ExperienceSplashProps) {
	const [isExiting, setIsExiting] = useState(false)
	const progressRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const prefersReducedMotion = window.matchMedia?.(
			"(prefers-reduced-motion: reduce)",
		).matches
		document.documentElement.classList.add("splash-active")
		document.body.classList.add("splash-active")
		const progressStart = performance.now()
		let animationFrameId = 0
		let hideTimeoutId = 0
		let completeTimeoutId = 0
		const updateProgress = (now: number) => {
			const elapsedMs = now - progressStart
			const nextProgress = Math.min(100, (elapsedMs / SPLASH_DURATION_MS) * 100)
			const progressElement = progressRef.current
			progressElement?.style.setProperty("--splash-progress", `${nextProgress}%`)
			progressElement?.setAttribute("aria-valuenow", String(Math.round(nextProgress)))

			if (elapsedMs < SPLASH_DURATION_MS) {
				animationFrameId = window.requestAnimationFrame(updateProgress)
				return
			}

			hideTimeoutId = window.setTimeout(() => {
				setIsExiting(true)
				document.documentElement.classList.remove("splash-active")
				document.body.classList.remove("splash-active")
				completeTimeoutId = window.setTimeout(() => {
					document.documentElement.classList.add("splash-complete")
					document.body.classList.add("splash-complete")
				}, prefersReducedMotion ? 0 : SPLASH_EXIT_TRANSITION_MS)
			}, SPLASH_HOLD_MS)
		}
		animationFrameId = window.requestAnimationFrame(updateProgress)

		return () => {
			window.cancelAnimationFrame(animationFrameId)
			window.clearTimeout(hideTimeoutId)
			window.clearTimeout(completeTimeoutId)
			document.documentElement.classList.remove(
				"splash-active",
				"splash-complete",
			)
			document.body.classList.remove("splash-active", "splash-complete")
		}
	}, [])

	const splashLetters = Array.from(brandName)
	const writeLetterDurationMs = Math.min(1080, Math.max(1, SPLASH_DURATION_MS * 0.108))
	const writeStartDelayMs = Math.min(550, Math.max(0, SPLASH_DURATION_MS * 0.055))
	const writeLastDelayMs = Math.max(0, SPLASH_DURATION_MS - writeLetterDurationMs)
	const writeLetterStaggerMs = splashLetters.length > 1
		? (writeLastDelayMs - writeStartDelayMs) / (splashLetters.length - 1)
		: 0
	const fillDurationMs = Math.min(1250, Math.max(1, SPLASH_DURATION_MS * 0.125))

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
			<div
				className="splash-content"
				style={{
					"--splash-write-letter-duration": `${writeLetterDurationMs}ms`,
					"--splash-handwriting-fill-duration": `${fillDurationMs}ms`,
					"--splash-handwriting-fill-delay": `${SPLASH_DURATION_MS - fillDurationMs}ms`,
				} as CSSProperties}
			>
				<h1 className="splash-title" aria-label={brandName}>
					<svg
						className="splash-handwriting"
						viewBox="0 0 940 230"
						preserveAspectRatio="xMidYMid meet"
						aria-hidden="true"
					>
						<defs>
							<linearGradient id="platformSplashTitleGradient" x1="0" x2="1" y1="0" y2="0">
								<stop offset="0%" stopColor="#f8e5b4" />
								<stop offset="42%" stopColor="#e8c27a" />
								<stop offset="72%" stopColor="#c8963e" />
								<stop offset="100%" stopColor="#fff3cf" />
							</linearGradient>
						</defs>
						<text className="splash-handwriting-shadow" x="470" y="128" textAnchor="middle">
							{brandName}
						</text>
						<text className="splash-handwriting-fill" x="470" y="128" textAnchor="middle">
							{brandName}
						</text>
						<text className="splash-handwriting-strokes" x="470" y="128" textAnchor="middle">
							{splashLetters.map((letter, index) => (
								<tspan
									className="splash-handwriting-letter"
									style={{ "--splash-write-delay": `${writeStartDelayMs + writeLetterStaggerMs * index}ms` } as CSSProperties}
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
