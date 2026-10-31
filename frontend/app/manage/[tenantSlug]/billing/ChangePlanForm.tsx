"use client"

import { useActionState } from "react"

import { ManageSubmitButton } from "@/components/tenant/ManageSubmitButton"
import { changePlan, type ChangePlanResult } from "./actions"

const initialState: ChangePlanResult = { ok: false, message: "" }

export function ChangePlanForm({
	tenantSlug,
	currentTier,
}: {
	readonly tenantSlug: string
	readonly currentTier: "starter" | "business" | "enterprise"
}) {
	const [state, formAction] = useActionState(changePlan, initialState)
	return (
		<form className="auth-form" action={formAction}>
			<input type="hidden" name="tenantSlug" value={tenantSlug} />
			<label>
				Change plan
				<select name="tier" defaultValue={currentTier}>
					<option value="starter">Starter</option>
					<option value="business">Business</option>
					<option value="enterprise">Enterprise</option>
				</select>
			</label>
			<ManageSubmitButton className="button button--outline" pendingLabel="Saving plan…">
				Save plan
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
