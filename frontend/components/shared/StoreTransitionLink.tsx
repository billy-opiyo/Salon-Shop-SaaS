"use client"

import Link, { type LinkProps } from "next/link"
import type { MouseEvent, ReactNode } from "react"

interface StoreTransitionLinkProps extends LinkProps {
	readonly children: ReactNode
	readonly className?: string
}

export function StoreTransitionLink({
	children,
	className,
	...props
}: StoreTransitionLinkProps) {
	const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
		if (
			event.defaultPrevented ||
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey
		)
			return

		document.body.classList.add("store-transitioning")
	}

	return (
		<Link {...props} className={className} onClick={handleClick}>
			{children}
		</Link>
	)
}
