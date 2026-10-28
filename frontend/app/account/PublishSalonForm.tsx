"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { publishStore } from "@/app/manage/actions"

export function PublishSalonForm({ tenantId }: { readonly tenantId: string }) {
	const router = useRouter()
	const [isPending, startTransition] = useTransition()
	const [feedback, setFeedback] = useState<{
		readonly ok: boolean
		readonly message: string
	} | null>(null)

	const submit = (formData: FormData) => {
		setFeedback(null)
		startTransition(async () => {
			try {
				const result = await publishStore(formData)
				setFeedback(result)
				if (result.ok) router.refresh()
			} catch {
				setFeedback({
					ok: false,
					message: "Your salon could not be published. Please try again.",
				})
			}
		})
	}

	return (
		<div className="platform-account-publish">
			<form action={submit}>
				<input type="hidden" name="tenantId" value={tenantId} />
				<button className="button button--primary button--small" type="submit" disabled={isPending}>
					{isPending ? "Publishing…" : "Publish salon"}
				</button>
			</form>
			{feedback && (
				<p className={feedback.ok ? "platform-account-publish__message" : "platform-account-publish__message is-error"} role={feedback.ok ? "status" : "alert"}>
					{feedback.message}
				</p>
			)}
		</div>
	)
}
