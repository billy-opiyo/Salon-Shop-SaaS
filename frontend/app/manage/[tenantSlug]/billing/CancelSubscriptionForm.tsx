"use client"

import { useActionState } from "react"

import { ManageSubmitButton } from "@/components/tenant/ManageSubmitButton"
import { cancelSubscription, type ChangePlanResult } from "./actions"

const initialState: ChangePlanResult = { ok: false, message: "" }

export function CancelSubscriptionForm({
	tenantSlug,
}: {
	readonly tenantSlug: string
}) {
	const [state, formAction] = useActionState(cancelSubscription, initialState)
	return (
		<form className="auth-form" action={formAction}>
			<input type="hidden" name="tenantSlug" value={tenantSlug} />
			<label>
				<input
					name="confirmation"
					value="confirmed"
					type="checkbox"
					required
				/>
				I understand the cancellation effective date shown above.
			</label>
			<ManageSubmitButton
				className="button button--outline"
				pendingLabel="Cancelling…"
			>
				Confirm cancellation
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
