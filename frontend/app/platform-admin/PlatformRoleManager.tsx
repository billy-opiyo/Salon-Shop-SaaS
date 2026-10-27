"use client"

import { useState } from "react"

type RoleAssignment = {
	readonly id: string
	readonly email: string
	readonly role: "STORE_EDITOR" | "STORE_SUPPORT"
	readonly createdAt: Date
	readonly updatedAt: Date
}

export function PlatformRoleManager({
	initialAssignments,
}: {
	readonly initialAssignments: readonly RoleAssignment[]
}) {
	const [assignments, setAssignments] = useState(initialAssignments)
	const [email, setEmail] = useState("")
	const [role, setRole] = useState<RoleAssignment["role"]>("STORE_EDITOR")
	const [message, setMessage] = useState("")
	const [busy, setBusy] = useState(false)

	const save = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setBusy(true)
		setMessage("Saving role…")
		try {
			const response = await fetch("/api/platform-admin/roles", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email, role }),
			})
			const result = await response.json() as { assignment?: RoleAssignment; error?: string }
			if (!response.ok || !result.assignment) throw new Error(result.error ?? "The role could not be saved.")
			setAssignments((current) => [
				...current.filter((item) => item.id !== result.assignment?.id),
				result.assignment as RoleAssignment,
			].sort((left, right) => left.email.localeCompare(right.email)))
			setEmail("")
			setMessage(`${role === "STORE_EDITOR" ? "Store Editor" : "Store Support"} access saved for ${result.assignment.email}.`)
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "The role could not be saved.")
		} finally {
			setBusy(false)
		}
	}

	const remove = async (assignment: RoleAssignment) => {
		setBusy(true)
		setMessage(`Removing access for ${assignment.email}…`)
		try {
			const response = await fetch(`/api/platform-admin/roles?id=${encodeURIComponent(assignment.id)}`, { method: "DELETE" })
			const result = await response.json() as { error?: string }
			if (!response.ok) throw new Error(result.error ?? "The role could not be removed.")
			setAssignments((current) => current.filter((item) => item.id !== assignment.id))
			setMessage(`Platform access removed for ${assignment.email}.`)
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "The role could not be removed.")
		} finally {
			setBusy(false)
		}
	}

	return (
		<section className="platform-admin-panel platform-role-admin" aria-labelledby="platform-roles-title">
			<div className="section-heading">
				<p className="eyebrow">Owner controls</p>
				<h2 id="platform-roles-title">Platform access roles</h2>
				<p>The configured Owner account keeps full access. Assign other accounts only the platform sections they need.</p>
			</div>
			<form className="onboarding-form platform-role-form" onSubmit={save}>
				<label>Email address<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
				<label>Role<select value={role} onChange={(event) => setRole(event.target.value as RoleAssignment["role"])}><option value="STORE_EDITOR">Store Editor — platform site content</option><option value="STORE_SUPPORT">Store Support — support page and FAQs</option></select></label>
				<button className="button button--primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Assign role"}</button>
			</form>
			<div className="platform-admin-list" aria-label="Assigned platform roles">
				{assignments.map((assignment) => (
					<article className="platform-admin-row" key={assignment.id}>
						<div><strong>{assignment.email}</strong><span>{assignment.role === "STORE_EDITOR" ? "Store Editor · site content and team profiles" : "Store Support · support page and FAQs"}</span></div>
						<button className="button button--ghost button--small" type="button" disabled={busy} onClick={() => void remove(assignment)}>Remove access</button>
					</article>
				))}
				{assignments.length === 0 && <p className="manage-empty">No delegated platform roles yet.</p>}
			</div>
			{message && <p className="form-message" role="status">{message}</p>}
		</section>
	)
}
