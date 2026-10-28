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
	const [feedback, setFeedback] = useState<{
		readonly message: string
		readonly type: "status" | "success" | "error"
	} | null>(null)
	const [busy, setBusy] = useState(false)
	const [removingAssignmentId, setRemovingAssignmentId] = useState<string | null>(null)

	const save = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setBusy(true)
		setFeedback({ message: "Saving role…", type: "status" })
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
			setFeedback({
				message: `${role === "STORE_EDITOR" ? "Store Editor" : "Store Support"} access saved for ${result.assignment.email}.`,
				type: "success",
			})
		} catch (error) {
			setFeedback({
				message: error instanceof Error ? error.message : "The role could not be saved.",
				type: "error",
			})
		} finally {
			setBusy(false)
		}
	}

	const remove = async (assignment: RoleAssignment) => {
		setBusy(true)
		setRemovingAssignmentId(assignment.id)
		setFeedback({ message: `Removing access for ${assignment.email}…`, type: "status" })
		try {
			const response = await fetch(`/api/platform-admin/roles?id=${encodeURIComponent(assignment.id)}`, { method: "DELETE" })
			const result = await response.json() as { error?: string }
			if (!response.ok) throw new Error(result.error ?? "The role could not be removed.")
			setAssignments((current) => current.filter((item) => item.id !== assignment.id))
			setFeedback({ message: `Platform access removed for ${assignment.email}.`, type: "success" })
		} catch (error) {
			setFeedback({
				message: error instanceof Error ? error.message : "The role could not be removed.",
				type: "error",
			})
		} finally {
			setRemovingAssignmentId(null)
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
			<form className="onboarding-form platform-admin-form platform-role-form" onSubmit={save}>
				<label>Email address<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
				<label>Role<select value={role} onChange={(event) => setRole(event.target.value as RoleAssignment["role"])}><option value="STORE_EDITOR">Store Editor — platform site content</option><option value="STORE_SUPPORT">Store Support — support page and FAQs</option></select></label>
				<button className="button button--primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Assign role"}</button>
			</form>
			<div className="platform-admin-list" aria-label="Assigned platform roles">
				{assignments.map((assignment) => (
					<article className="platform-admin-row" key={assignment.id}>
						<div><strong>{assignment.email}</strong><span>{assignment.role === "STORE_EDITOR" ? "Store Editor · site content and team profiles" : "Store Support · support page and FAQs"}</span></div>
						<button className="button button--ghost button--small" type="button" disabled={busy} onClick={() => void remove(assignment)}>
							{removingAssignmentId === assignment.id ? "Removing…" : "Remove access"}
						</button>
					</article>
				))}
				{assignments.length === 0 && <p className="manage-empty">No delegated platform roles yet.</p>}
			</div>
			{feedback && (
				<p
					className={`form-message${feedback.type === "success" ? " form-message--success" : feedback.type === "error" ? " form-message--error" : ""}`}
					role={feedback.type === "error" ? "alert" : "status"}
					aria-live={feedback.type === "error" ? "assertive" : "polite"}
				>
					{feedback.message}
				</p>
			)}
		</section>
	)
}
