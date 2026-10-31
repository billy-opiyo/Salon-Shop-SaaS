"use client"

import { useFormStatus } from "react-dom"
import type { ReactNode } from "react"

export function ServiceSubmitButton({
	children,
	pendingLabel,
	className = "button button--outline button--small",
}: {
	readonly children: ReactNode
	readonly pendingLabel: string
	readonly className?: string
}) {
	const { pending } = useFormStatus()
	return (
		<button className={className} type="submit" disabled={pending} aria-busy={pending}>
			{pending ? pendingLabel : children}
		</button>
	)
}
