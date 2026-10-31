"use client"

import { useActionState, type FormEvent, type ReactNode } from "react"

import type { ServiceMutationResult } from "./actions"
import { ServiceSubmitButton } from "./ServiceSubmitButton"

type ServiceMutationAction = (
	previousState: ServiceMutationResult,
	formData: FormData,
) => Promise<ServiceMutationResult>

const initialState: ServiceMutationResult = { ok: false, message: "" }

export function ServiceMutationForm({
	action,
	children,
	className,
	buttonClassName,
	buttonLabel,
	pendingLabel,
	confirmMessage,
}: {
	readonly action: ServiceMutationAction
	readonly children: ReactNode
	readonly className?: string
	readonly buttonClassName?: string
	readonly buttonLabel: string
	readonly pendingLabel: string
	readonly confirmMessage?: string
}) {
	const [state, formAction] = useActionState(action, initialState)
	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault()
	}
	return (
		<form className={className} action={formAction} onSubmit={handleSubmit}>
			{children}
			<ServiceSubmitButton
				className={buttonClassName ?? (className === "onboarding-form" ? "button button--primary" : undefined)}
				pendingLabel={pendingLabel}
			>
				{buttonLabel}
			</ServiceSubmitButton>
			{state.message && (
				<p
					className={`form-message form-message--${state.ok ? "success" : "error"}`}
					role={state.ok ? "status" : "alert"}
					aria-live={state.ok ? "polite" : "assertive"}
				>
					{state.message}
				</p>
			)}
		</form>
	)
}
