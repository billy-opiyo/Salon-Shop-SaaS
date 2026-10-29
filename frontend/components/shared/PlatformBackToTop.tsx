"use client"

import { useEffect, useRef, useState } from "react"
import type { MouseEvent } from "react"

export function PlatformBackToTop() {
	const [isVisible, setIsVisible] = useState(false)
	const buttonRef = useRef<HTMLAnchorElement>(null)

	useEffect(() => {
		let frame = 0
		const updateVisibility = () => {
			window.cancelAnimationFrame(frame)
			frame = window.requestAnimationFrame(() => {
				const buttonRect = buttonRef.current?.getBoundingClientRect()
				const contactControls = document.querySelectorAll<HTMLElement>(
					".platform-contact__form :is(a, button, input, textarea, select)",
				)
				const overlapsContactControl = Boolean(buttonRect && Array.from(contactControls).some((control) => {
					const rect = control.getBoundingClientRect()
					return rect.width > 0 && rect.height > 0 &&
						rect.left < buttonRect.right && rect.right > buttonRect.left &&
						rect.top < buttonRect.bottom && rect.bottom > buttonRect.top
				}))
				setIsVisible(window.scrollY > 500 && !overlapsContactControl)
			})
		}
		window.addEventListener("scroll", updateVisibility, { passive: true })
		window.addEventListener("resize", updateVisibility)
		updateVisibility()
		return () => {
			window.cancelAnimationFrame(frame)
			window.removeEventListener("scroll", updateVisibility)
			window.removeEventListener("resize", updateVisibility)
		}
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
			ref={buttonRef}
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
