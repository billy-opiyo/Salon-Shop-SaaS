"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"

export function JoinTeamInvitationForm() {
	const [code, setCode] = useState("")
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [feedback, setFeedback] = useState<{
		readonly message: string
		readonly isError: boolean
	} | null>(null)
	const [acceptedSlug, setAcceptedSlug] = useState<string | null>(null)

	async function acceptInvitation(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setIsSubmitting(true)
		setFeedback(null)
		setAcceptedSlug(null)
		try {
			const response = await fetch("/api/team/invitations/accept", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ code: code.trim().toLowerCase() }),
			})
			const result = (await response.json().catch(() => ({}))) as {
				error?: string
				slug?: string
			}
			if (!response.ok || !result.slug)
				throw new Error(result.error ?? "Invitation could not be accepted.")
			setAcceptedSlug(result.slug)
			setFeedback({
				message: "Invitation accepted. Your salon workspace is ready.",
				isError: false,
			})
		} catch (error) {
			setFeedback({
				message:
					error instanceof Error
						? error.message
						: "Invitation could not be accepted.",
				isError: true,
			})
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<>
			<form className="auth-form" onSubmit={acceptInvitation}>
				<label>
					Invitation code
					<input
						value={code}
						onChange={(event) => setCode(event.target.value)}
						placeholder="Paste your 64-character code"
						minLength={64}
						maxLength={64}
						pattern="[a-fA-F0-9]{64}"
						autoComplete="off"
						autoCapitalize="none"
						spellCheck={false}
						disabled={isSubmitting || Boolean(acceptedSlug)}
						required
					/>
				</label>
				<p className="form-help">
					Sign in with the email address the salon owner invited. Invitation codes
					expire after seven days.
				</p>
				<button
					className="button button--primary"
					type="submit"
					disabled={isSubmitting || Boolean(acceptedSlug)}
					aria-busy={isSubmitting}
				>
					{isSubmitting ? "Accepting invitation…" : "Accept invitation"}
				</button>
			</form>
			{feedback && (
				<p
					className={`form-message form-message--${feedback.isError ? "error" : "success"}`}
					role={feedback.isError ? "alert" : "status"}
					aria-live={feedback.isError ? "assertive" : "polite"}
				>
					{feedback.message}
				</p>
			)}
			{acceptedSlug && (
				<Link
					className="button button--primary button--small"
					href={`/manage/${encodeURIComponent(acceptedSlug)}`}
				>
					Open salon workspace
				</Link>
			)}
		</>
	)
}
