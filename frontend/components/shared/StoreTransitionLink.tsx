"use client"

import Link, { type LinkProps } from "next/link"
import type { ReactNode } from "react"

interface StoreTransitionLinkProps extends LinkProps {
	readonly children: ReactNode
	readonly className?: string
}

export function StoreTransitionLink({
	children,
	className,
	...props
}: StoreTransitionLinkProps) {
	return (
		<Link {...props} className={className}>
			{children}
		</Link>
	)
}
