"use client"

import { useEffect, useState } from "react"
import type { MouseEvent } from "react"

// Platform contact stays independent from the tenant-specific storefront settings.
const PLATFORM_WHATSAPP_URL = "https://wa.me/254740470381"

export function PlatformFloatingActions() {
	const [showBackToTop, setShowBackToTop] = useState(false)

	useEffect(() => {
		const updateVisibility = () => setShowBackToTop(window.scrollY > 500)
		window.addEventListener("scroll", updateVisibility, { passive: true })
		updateVisibility()
		return () => window.removeEventListener("scroll", updateVisibility)
	}, [])

	const scrollToTop = (event: MouseEvent<HTMLAnchorElement>) => {
		event.preventDefault()
		window.scrollTo({
			top: 0,
			behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
				? "auto"
				: "smooth",
		})
	}

	return (
		<>
			<a
				href={`${PLATFORM_WHATSAPP_URL}?text=${encodeURIComponent("Hello Beauty Sphia, I would like to know more about the platform.")}`}
				className="platform-floating-whatsapp"
				aria-label="Contact Beauty Sphia on WhatsApp"
				target="_blank"
				rel="noopener noreferrer"
			>
				<i className="fab fa-whatsapp" aria-hidden="true" />
			</a>
			<a
				href="#home"
				className={`platform-back-to-top${showBackToTop ? " visible" : ""}`}
				aria-label="Back to top"
				tabIndex={showBackToTop ? 0 : -1}
				aria-hidden={!showBackToTop}
				onClick={scrollToTop}
			>
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<polyline points="18 15 12 9 6 15" />
				</svg>
			</a>
		</>
	)
}
