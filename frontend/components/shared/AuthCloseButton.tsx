"use client"

import { useRouter } from "next/navigation"

interface AuthCloseButtonProps {
	readonly label: string
}

export function AuthCloseButton({ label }: AuthCloseButtonProps) {
	const router = useRouter()

	return (
		<button
			className="auth-close-button"
			type="button"
			aria-label={label}
			onClick={() => {
				if (typeof window.history.state?.idx === "number" && window.history.state.idx > 0) {
					router.back()
				} else {
					router.replace("/")
				}
			}}
		>
			<span aria-hidden="true">×</span>
		</button>
	)
}
