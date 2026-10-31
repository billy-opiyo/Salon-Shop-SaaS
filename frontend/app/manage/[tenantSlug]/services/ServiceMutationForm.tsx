"use client"

import { useActionState, type ReactNode } from "react"

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
	buttonLabel,
	pendingLabel,
}: {
	readonly action: ServiceMutationAction
	readonly children: ReactNode
	readonly className?: string
	readonly buttonLabel: string
	readonly pendingLabel: string
}) {
	const [state, formAction] = useActionState(action, initialState)
	return (
		<form className={className} action={formAction}>
			{children}
			<ServiceSubmitButton
				className={className === "onboarding-form" ? "button button--primary" : undefined}
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
