"use client"

import { FormEvent, useState } from "react"

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
	const [message, setMessage] = useState("")
	const [submitting, setSubmitting] = useState(false)
	const [acceptCode, setAcceptCode] = useState("")

	async function invite(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setSubmitting(true)
		setMessage("")
		const form = new FormData(event.currentTarget)
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
			setMessage(
				`Invitation created for ${String(form.get("email"))}. Code: ${result.invitationCode}`,
			)
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
			event.currentTarget.reset()
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Invitation failed.")
		} finally {
			setSubmitting(false)
		}
	}

	async function updateInvitation(
		action: "cancel" | "resend",
		invitationId: string,
	) {
		setMessage("")
		const response = await fetch(
			`/api/manage/${encodeURIComponent(tenantSlug)}/invitations`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ action, invitationId }),
			},
		)
		const result = await response.json()
		if (!response.ok) {
			setMessage(result.error ?? "Invitation update failed.")
			return
		}
		setMessage(
			action === "resend"
				? `Invitation resent. New code: ${result.invitationCode}`
				: "Invitation cancelled.",
		)
		setInvitations((current) =>
			current.map((item) =>
				item.id === invitationId
					? { ...item, status: action === "cancel" ? "CANCELLED" : "PENDING" }
					: item,
			),
		)
	}

	async function acceptInvitation(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setMessage("")
		const response = await fetch("/api/team/invitations/accept", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ code: acceptCode.trim() }),
		})
		const result = await response.json()
		setMessage(
			response.ok
				? `Invitation accepted. Open /manage/${result.slug}.`
				: (result.error ?? "Invitation could not be accepted."),
		)
	}

	return (
		<section className="manage-store-list" aria-label="Team invitations">
			<h2>Team Invitations</h2>
			<form onSubmit={invite} className="manage-form">
				<input
					name="email"
					type="email"
					placeholder="team@example.com"
					required
				/>
				<select name="role" defaultValue="STAFF">
					<option value="STAFF">Staff</option>
					<option value="ADMIN">Admin</option>
				</select>
				<button
					className="button button--primary"
					type="submit"
					disabled={submitting}
				>
					{submitting ? "Sending..." : "Invite member"}
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
								onClick={() => void updateInvitation("resend", invitation.id)}
							>
								Resend
							</button>
							<button
								className="button button--outline button--small"
								type="button"
								onClick={() => void updateInvitation("cancel", invitation.id)}
							>
								Cancel
							</button>
						</div>
					)}
				</article>
			))}
			<form onSubmit={acceptInvitation} className="manage-form">
				<input
					value={acceptCode}
					onChange={(event) => setAcceptCode(event.target.value)}
					placeholder="Invitation code"
					minLength={64}
					maxLength={64}
					required
				/>
				<button className="button button--outline" type="submit">
					Accept invitation
				</button>
			</form>
			{message && (
				<p className="form-message" role="status">
					{message}
				</p>
			)}
		</section>
	)
}
