"use client"

import { useEffect, useState } from "react"

interface ExperienceSplashProps {
	readonly brandName: string
	readonly eyebrow: string
	readonly description: string
}

export function ExperienceSplash({
	brandName,
	eyebrow,
	description,
}: ExperienceSplashProps) {
	const [isVisible, setIsVisible] = useState(true)

	useEffect(() => {
		document.documentElement.classList.remove(
			"splash-active",
			"splash-complete",
		)
		document.body.classList.remove("splash-active", "splash-complete")
		const prefersReducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches
		const durationMs = prefersReducedMotion ? 450 : 1200
		const timeoutId = window.setTimeout(() => {
			setIsVisible(false)
			document.documentElement.classList.add("splash-complete")
			document.body.classList.add("splash-complete")
		}, durationMs)

		return () => {
			window.clearTimeout(timeoutId)
			document.documentElement.classList.remove(
				"splash-active",
				"splash-complete",
			)
			document.body.classList.remove("splash-active", "splash-complete")
		}
	}, [])

	if (!isVisible) return null

	return (
		<div className="experience-splash" role="status" aria-live="polite">
			<div className="experience-splash__orb" aria-hidden="true" />
			<div className="experience-splash__content">
				<p className="eyebrow">{eyebrow}</p>
				<p className="experience-splash__brand">{brandName}</p>
				<div
					className="experience-splash__progress"
					role="progressbar"
					aria-label={`Loading ${brandName}`}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={100}
				>
					<span />
				</div>
				<p className="experience-splash__description">{description}</p>
			</div>
		</div>
	)
}
