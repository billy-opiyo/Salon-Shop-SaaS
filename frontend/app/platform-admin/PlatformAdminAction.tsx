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
	const [error, setError] = useState("")

	async function runAction() {
		setBusy(true)
		setError("")
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
			router.refresh()
		} catch (actionError) {
			setError(
				actionError instanceof Error ? actionError.message : "Action failed.",
			)
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
			{error && (
				<span className="platform-admin-action-error" role="alert">
					{error}
				</span>
			)}
		</span>
	)
}
