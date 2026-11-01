"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ConfirmActionButton } from "@/components/shared/ConfirmActionButton"

interface PlatformAdminActionProps {
	readonly action: string
	readonly id: string
	readonly label: string
	readonly confirmation: string
}

export function PlatformAdminAction({
	action,
	id,
	label,
	confirmation,
}: PlatformAdminActionProps) {
	const router = useRouter()
	const [busy, setBusy] = useState(false)
	const [feedback, setFeedback] = useState<{ readonly message: string; readonly error: boolean } | null>(null)

	async function runAction() {
		setBusy(true)
		setFeedback(null)
		try {
			const response = await fetch("/api/platform-admin/actions", {
				method: "POST",
				credentials: "same-origin",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ action, id }),
			})
			const result = (await response.json().catch(() => ({}))) as {
				error?: string
			}
			if (!response.ok) throw new Error(result.error ?? "Action failed.")
			setFeedback({ message: `${label} completed successfully.`, error: false })
			router.refresh()
		} catch (actionError) {
			setFeedback({ message: actionError instanceof Error ? actionError.message : "Action failed.", error: true })
		} finally {
			setBusy(false)
		}
	}

	return (
		<span className="platform-admin-action-wrap">
			<ConfirmActionButton
				className="button button--outline button--small"
				label={busy ? "Working..." : label}
				title="Confirm platform action"
				message={confirmation}
				confirmLabel={label}
				disabled={busy}
				onConfirm={runAction}
			/>
			{feedback && (
				<span className={`form-message ${feedback.error ? "form-message--error" : "form-message--success"} platform-admin-action-error`} role={feedback.error ? "alert" : "status"}>
					{feedback.message}
				</span>
			)}
		</span>
	)
}
