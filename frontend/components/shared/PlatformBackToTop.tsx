"use client"

import { useEffect, useState } from "react"
import type { MouseEvent } from "react"

export function PlatformBackToTop() {
	const [isVisible, setIsVisible] = useState(false)

	useEffect(() => {
		const updateVisibility = () => setIsVisible(window.scrollY > 500)
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
		<a
			href="#home"
			className={`platform-back-to-top${isVisible ? " visible" : ""}`}
			aria-label="Back to top"
			tabIndex={isVisible ? 0 : -1}
			aria-hidden={!isVisible}
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
	)
}
