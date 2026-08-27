"use client"

import Link from "next/link"
import type { ReactNode } from "react"

interface PlatformBrandMarkProps {
	readonly children: ReactNode
}

export function PlatformBrandMark({ children }: PlatformBrandMarkProps) {
	return (
		<Link
			className="brand-mark"
			href="#home"
			aria-label="Beauty Sphia home"
			onClick={(event) => {
				event.preventDefault()
				window.scrollTo({ top: 0, behavior: "smooth" })
				// Clear any existing hash so a later click still scrolls to top.
				if (window.location.hash) {
					window.history.replaceState(
						null,
						"",
						window.location.pathname + window.location.search,
					)
				}
			}}
		>
			{children}
		</Link>
	)
}
