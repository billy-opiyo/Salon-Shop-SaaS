"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"

type Invitation = {
	readonly id: string
	readonly inviteeEmail: string
	readonly role: string
	readonly status: string
	readonly expiresAt: string
}

interface TeamInvitationPanelProps {
	readonly tenantSlug: string
	readonly initialInvitations: readonly Invitation[]
}

export function TeamInvitationPanel({
	tenantSlug,
	initialInvitations,
}: TeamInvitationPanelProps) {
	const [invitations, setInvitations] = useState([...initialInvitations])
	const [feedback, setFeedback] = useState<{
		readonly message: string
		readonly isError: boolean
	} | null>(null)
	const [busyAction, setBusyAction] = useState<
		| { readonly type: "invite" }
		| {
				readonly type: "update"
				readonly action: "cancel" | "resend"
				readonly invitationId: string
		  }
		| null
	>(null)

	async function invite(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const formElement = event.currentTarget
		setBusyAction({ type: "invite" })
		setFeedback(null)
		const form = new FormData(formElement)
		try {
			const response = await fetch(
				`/api/manage/${encodeURIComponent(tenantSlug)}/invitations`,
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						email: form.get("email"),
						role: form.get("role"),
					}),
				},
			)
			const result = await response.json()
			if (!response.ok) throw new Error(result.error ?? "Invitation failed.")
			setFeedback({
				message: `Invitation created for ${String(form.get("email"))}. Code: ${result.invitationCode}. Ask them to sign in and accept it at /join-team.`,
				isError: false,
			})
			setInvitations((current) => [
				{
					id: result.invitationId,
					inviteeEmail: String(form.get("email")),
					role: String(form.get("role")),
					status: "PENDING",
					expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
				},
				...current,
			])
			formElement.reset()
		} catch (error) {
			setFeedback({
				message: error instanceof Error ? error.message : "Invitation failed.",
				isError: true,
			})
		} finally {
			setBusyAction(null)
		}
	}

	async function updateInvitation(
		action: "cancel" | "resend",
		invitationId: string,
	) {
		setBusyAction({ type: "update", action, invitationId })
		setFeedback(null)
		try {
			const response = await fetch(
				`/api/manage/${encodeURIComponent(tenantSlug)}/invitations`,
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ action, invitationId }),
				},
			)
			const result = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(result.error ?? "Invitation update failed.")
			setFeedback({
				message: action === "resend"
					? `Invitation resent. New code: ${result.invitationCode}. Ask them to sign in and accept it at /join-team.`
					: "Invitation cancelled.",
				isError: false,
			})
			setInvitations((current) =>
				current.map((item) =>
					item.id === invitationId
						? { ...item, status: action === "cancel" ? "CANCELLED" : "PENDING" }
						: item,
				),
			)
		} catch (error) {
			setFeedback({
				message: error instanceof Error ? error.message : "Invitation update failed.",
				isError: true,
			})
		} finally {
			setBusyAction(null)
		}
	}

	return (
		<section className="manage-store-list" aria-label="Team invitations">
			<div>
				<h2>Team invitations</h2>
				<p className="form-help">
					After sharing a code, invitees should sign in with the invited email and
					accept it on the <Link href="/join-team">team invitation page</Link>.
				</p>
			</div>
			<form onSubmit={invite} className="manage-form">
				<input
					name="email"
					type="email"
					aria-label="Team member email address"
					placeholder="team@example.com"
					required
				/>
				<select name="role" defaultValue="STAFF" aria-label="Team member role">
					<option value="STAFF">Staff</option>
					<option value="ADMIN">Admin</option>
				</select>
				<button
					className="button button--primary"
					type="submit"
					disabled={busyAction !== null}
				>
					{busyAction?.type === "invite" ? "Sending..." : "Invite member"}
				</button>
			</form>
			{invitations.map((invitation) => (
				<article className="manage-store" key={invitation.id}>
					<div>
						<p className="eyebrow">
							{invitation.status.toLowerCase()} ·{" "}
							{invitation.role.toLowerCase()}
						</p>
						<h3>{invitation.inviteeEmail}</h3>
						<p>Expires {new Date(invitation.expiresAt).toLocaleDateString()}</p>
					</div>
					{invitation.status === "PENDING" && (
						<div className="manage-store__actions">
							<button
								className="button button--outline button--small"
								type="button"
								disabled={busyAction !== null}
								onClick={() => void updateInvitation("resend", invitation.id)}
							>
								{busyAction?.type === "update" && busyAction.invitationId === invitation.id && busyAction.action === "resend" ? "Resending…" : "Resend"}
							</button>
							<button
								className="button button--outline button--small"
								type="button"
								disabled={busyAction !== null}
								onClick={() => void updateInvitation("cancel", invitation.id)}
							>
								{busyAction?.type === "update" && busyAction.invitationId === invitation.id && busyAction.action === "cancel" ? "Cancelling…" : "Cancel"}
							</button>
						</div>
					)}
				</article>
			))}
			{feedback && (
				<p
					className={`form-message form-message--${feedback.isError ? "error" : "success"}`}
					role={feedback.isError ? "alert" : "status"}
					aria-live={feedback.isError ? "assertive" : "polite"}
				>
					{feedback.message}
				</p>
			)}
		</section>
	)
}
