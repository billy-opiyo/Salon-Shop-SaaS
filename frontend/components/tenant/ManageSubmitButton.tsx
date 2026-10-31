"use client"

import type { ReactNode } from "react"
import { useFormStatus } from "react-dom"

export function ManageSubmitButton({
	children,
	pendingLabel,
	className = "button button--primary",
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
