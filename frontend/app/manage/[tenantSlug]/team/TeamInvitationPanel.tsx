"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { ConfirmActionButton } from "@/components/shared/ConfirmActionButton"
import { inferSalonAccessProfileLabel, type SalonSectionPermissions } from "@shared/constants/salonAccessProfiles"

type Invitation = {
	readonly id: string
	readonly inviteeEmail: string
	readonly role: string
	readonly permissions?: SalonSectionPermissions
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
					body: JSON.stringify({ email: form.get("email") }),
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
					role: "STAFF",
					permissions: {
						canManageBookings: false,
						canManageContent: false,
						canManageSecurity: false,
					},
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
		<section className="manage-store-list merchant-team-invitation-panel" aria-label="Team invitations">
			<div>
				<h2>Team invitations</h2>
				<p className="form-help">
					Invite members and manage pending invitations here. New members join without
					Salon Admin section access. After they accept, assign access from the <Link href={`/manage/${encodeURIComponent(tenantSlug)}?section=admins`}>Admins tab</Link>.
				</p>
			</div>
			<form onSubmit={invite} className="merchant-team-invitation-form">
				<label>
					<span>Team member email</span>
					<input
						name="email"
						type="email"
						autoComplete="email"
						placeholder="team@example.com"
						required
					/>
				</label>
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
							{invitation.status.toLowerCase()} · {inferSalonAccessProfileLabel(invitation.role, invitation.permissions)}
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
							<ConfirmActionButton
								className="button button--outline button--small"
								label={busyAction?.type === "update" && busyAction.invitationId === invitation.id && busyAction.action === "cancel" ? "Cancelling…" : "Cancel"}
								title="Cancel team invitation?"
								message={`Cancel the pending invitation for ${invitation.inviteeEmail}? The invitation code will stop working.`}
								confirmLabel="Cancel invitation"
								disabled={busyAction !== null}
								onConfirm={() => updateInvitation("cancel", invitation.id)}
							/>
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
