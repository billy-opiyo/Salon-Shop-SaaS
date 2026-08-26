"use client"

import { useEffect, useState } from "react"

interface ExperienceSplashProps {
	readonly brandName: string
	readonly eyebrow: string
	readonly description: string
}

const SPLASH_DURATION_MS = 5000
const HOMEPAGE_REVEAL_DELAY_MS = 1000

export function ExperienceSplash({
	brandName,
	eyebrow,
	description,
}: ExperienceSplashProps) {
	const [isExiting, setIsExiting] = useState(false)
	const [isVisible, setIsVisible] = useState(true)

	useEffect(() => {
		document.documentElement.classList.add("splash-active")
		document.body.classList.add("splash-active")
		const exitTimeoutId = window.setTimeout(() => {
			setIsExiting(true)
		}, SPLASH_DURATION_MS)
		const revealTimeoutId = window.setTimeout(() => {
			document.documentElement.classList.remove("splash-active")
			document.body.classList.remove("splash-active")
			document.documentElement.classList.add("splash-complete")
			document.body.classList.add("splash-complete")
			setIsVisible(false)
		}, SPLASH_DURATION_MS + HOMEPAGE_REVEAL_DELAY_MS)

		return () => {
			window.clearTimeout(exitTimeoutId)
			window.clearTimeout(revealTimeoutId)
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
			className={`splash-screen${isExiting ? " splash-hide" : ""}`}
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
					aria-valuenow={100}
				>
					<span />
				</div>
				<p className="splash-description">{description}</p>
			</div>
		</div>
	)
}
