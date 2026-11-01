"use client"

import { useActionState } from "react"

import { ConfirmSubmitButton } from "@/components/shared/ConfirmActionButton"
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
			<ConfirmSubmitButton
				className="button button--outline"
				title="Cancel this subscription?"
				message="Schedule subscription cancellation for the end of the current paid period? The storefront will be archived when that period ends."
				confirmLabel="Schedule cancellation"
				pendingLabel="Cancelling…"
			>
				Confirm cancellation
			</ConfirmSubmitButton>
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
