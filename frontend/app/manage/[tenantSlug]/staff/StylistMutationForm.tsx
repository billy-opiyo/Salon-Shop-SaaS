"use client"

import { useActionState, type ReactNode } from "react"

import { ManageSubmitButton } from "@/components/tenant/ManageSubmitButton"
import type { StylistMutationResult } from "./actions"

type StylistMutationAction = (
	previousState: StylistMutationResult,
	formData: FormData,
) => Promise<StylistMutationResult>

const initialState: StylistMutationResult = { ok: false, message: "" }

export function StylistMutationForm({
	action,
	children,
	className,
	id,
	ariaLabel,
	buttonLabel,
	pendingLabel,
	buttonClassName,
}: {
	readonly action: StylistMutationAction
	readonly children: ReactNode
	readonly className?: string
	readonly id?: string
	readonly ariaLabel?: string
	readonly buttonLabel: string
	readonly pendingLabel: string
	readonly buttonClassName?: string
}) {
	const [state, formAction] = useActionState(action, initialState)
	return (
		<form className={className} id={id} aria-label={ariaLabel} action={formAction}>
			{children}
			<ManageSubmitButton
				className={buttonClassName}
				pendingLabel={pendingLabel}
			>
				{buttonLabel}
			</ManageSubmitButton>
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
