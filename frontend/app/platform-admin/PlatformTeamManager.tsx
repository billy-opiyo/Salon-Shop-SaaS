"use client"

import { FormEvent, useState } from "react"

import type { PlatformTeamMemberView } from "@shared/types/platformTeam"

interface PlatformTeamManagerProps {
	readonly initialMembers: readonly PlatformTeamMemberView[]
}

interface TeamFormState {
	readonly name: string
	readonly role: string
	readonly bio: string
	readonly websiteUrl: string
	readonly instagramUrl: string
	readonly facebookUrl: string
	readonly linkedinUrl: string
	readonly xUrl: string
	readonly displayOrder: string
	readonly published: boolean
}

const emptyForm: TeamFormState = {
	name: "",
	role: "",
	bio: "",
	websiteUrl: "",
	instagramUrl: "",
	facebookUrl: "",
	linkedinUrl: "",
	xUrl: "",
	displayOrder: "0",
	published: true,
}

function formFromMember(member: PlatformTeamMemberView): TeamFormState {
	return {
		name: member.name,
		role: member.role,
		bio: member.bio,
		websiteUrl: member.websiteUrl ?? "",
		instagramUrl: member.instagramUrl ?? "",
		facebookUrl: member.facebookUrl ?? "",
		linkedinUrl: member.linkedinUrl ?? "",
		xUrl: member.xUrl ?? "",
		displayOrder: String(member.displayOrder),
		published: member.published,
	}
}

function safeAvatarUrl(value: string | null): string | null {
	if (!value) return null
	try {
		return new URL(value).protocol === "https:" ? value : null
	} catch {
		return null
	}
}

export function PlatformTeamManager({
	initialMembers,
}: PlatformTeamManagerProps) {
	const [members, setMembers] = useState([...initialMembers])
	const [editingId, setEditingId] = useState<string | null>(null)
	const [form, setForm] = useState<TeamFormState>(emptyForm)
	const [avatar, setAvatar] = useState<File | null>(null)
	const [busy, setBusy] = useState(false)
	const [message, setMessage] = useState("")
	const [error, setError] = useState("")

	function updateField<K extends keyof TeamFormState>(
		field: K,
		value: TeamFormState[K],
	) {
		setForm((current) => ({ ...current, [field]: value }))
	}

	function startCreate() {
		setEditingId(null)
		setForm(emptyForm)
		setAvatar(null)
		setMessage("")
		setError("")
	}

	function startEdit(member: PlatformTeamMemberView) {
		setEditingId(member.id)
		setForm(formFromMember(member))
		setAvatar(null)
		setMessage("")
		setError("")
		window.scrollTo({ top: 0, behavior: "smooth" })
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setBusy(true)
		setError("")
		setMessage("")
		const body = new FormData(event.currentTarget)
		body.set("action", editingId ? "update" : "create")
		if (editingId) body.set("id", editingId)
		if (avatar) body.set("avatar", avatar)
		try {
			const response = await fetch("/api/platform-admin/team", {
				method: "POST",
				body,
				credentials: "same-origin",
			})
			const result = (await response.json().catch(() => ({}))) as {
				member?: PlatformTeamMemberView
				error?: string
			}
			if (!response.ok || !result.member)
				throw new Error(result.error ?? "Team member could not be saved.")
			setMembers((current) => {
				const next = current.filter((member) => member.id !== result.member?.id)
				return [...next, result.member as PlatformTeamMemberView].sort(
					(a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
				)
			})
			setMessage(editingId ? "Team member updated." : "Team member added.")
			startCreate()
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: "Team member could not be saved.",
			)
		} finally {
			setBusy(false)
		}
	}

	async function remove(member: PlatformTeamMemberView) {
		if (!window.confirm(`Remove ${member.name} from the platform team?`)) return
		setBusy(true)
		setError("")
		try {
			const body = new FormData()
			body.set("action", "delete")
			body.set("id", member.id)
			const response = await fetch("/api/platform-admin/team", {
			method: "POST",
			body,
			credentials: "same-origin",
			})
			const result = (await response.json().catch(() => ({}))) as {
				error?: string
			}
			if (!response.ok) throw new Error(result.error ?? "Team member could not be removed.")
			setMembers((current) => current.filter((item) => item.id !== member.id))
			if (editingId === member.id) startCreate()
		} catch (removeError) {
			setError(
				removeError instanceof Error
					? removeError.message
					: "Team member could not be removed.",
			)
		} finally {
			setBusy(false)
		}
	}

	return (
		<section className="platform-admin-panel platform-team-admin" aria-labelledby="team-title">
			<div className="section-heading section-heading--row">
				<div>
					<p className="eyebrow">About Us</p>
					<h2 id="team-title">Meet Our Team</h2>
					<p>Add the people behind Beauty Sphia and keep their public profiles current.</p>
				</div>
				<button className="button button--outline button--small" type="button" onClick={startCreate}>
					Add team member
				</button>
			</div>
			<form className="platform-team-form" onSubmit={submit}>
				<div className="platform-team-form__grid">
					<label>Name<input name="name" value={form.name} onChange={(event) => updateField("name", event.target.value)} required maxLength={120} /></label>
					<label>Role<input name="role" value={form.role} onChange={(event) => updateField("role", event.target.value)} required maxLength={120} /></label>
					<label className="platform-team-form__wide">Short bio<textarea name="bio" value={form.bio} onChange={(event) => updateField("bio", event.target.value)} required minLength={10} maxLength={2000} rows={4} /></label>
					<label>Profile image<input name="avatar" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setAvatar(event.target.files?.[0] ?? null)} /></label>
					<label>Display order<input name="displayOrder" type="number" min="0" max="9999" value={form.displayOrder} onChange={(event) => updateField("displayOrder", event.target.value)} /></label>
					<label>Website URL<input name="websiteUrl" type="url" value={form.websiteUrl} onChange={(event) => updateField("websiteUrl", event.target.value)} placeholder="https://..." /></label>
					<label>Instagram URL<input name="instagramUrl" type="url" value={form.instagramUrl} onChange={(event) => updateField("instagramUrl", event.target.value)} placeholder="https://instagram.com/..." /></label>
					<label>Facebook URL<input name="facebookUrl" type="url" value={form.facebookUrl} onChange={(event) => updateField("facebookUrl", event.target.value)} placeholder="https://facebook.com/..." /></label>
					<label>LinkedIn URL<input name="linkedinUrl" type="url" value={form.linkedinUrl} onChange={(event) => updateField("linkedinUrl", event.target.value)} placeholder="https://linkedin.com/in/..." /></label>
					<label>X URL<input name="xUrl" type="url" value={form.xUrl} onChange={(event) => updateField("xUrl", event.target.value)} placeholder="https://x.com/..." /></label>
				</div>
				<label className="platform-team-form__published"><input name="published" type="checkbox" checked={form.published} onChange={(event) => updateField("published", event.target.checked)} /> Show this profile on the public About page</label>
				<div className="platform-team-form__actions">
					<button className="button button--primary" type="submit" disabled={busy}>{busy ? "Saving..." : editingId ? "Save changes" : "Add member"}</button>
					{editingId && <button className="button button--ghost" type="button" onClick={startCreate} disabled={busy}>Cancel edit</button>}
				</div>
				{message && <p className="form-message--success" role="status">{message}</p>}
				{error && <p className="form-message--error" role="alert">{error}</p>}
			</form>
			<div className="platform-team-admin__cards">
				{members.map((member) => (
					<article className="platform-team-card" key={member.id}>
						{safeAvatarUrl(member.avatarUrl) ? <img className="platform-team-card__avatar" src={safeAvatarUrl(member.avatarUrl) ?? undefined} alt={`${member.name} profile`} /> : <div className="platform-team-card__avatar platform-team-card__avatar--empty" aria-hidden="true">{member.name.slice(0, 1).toUpperCase()}</div>}
						<div className="platform-team-card__body"><p className="eyebrow">{member.published ? "Published" : "Hidden"}</p><h3>{member.name}</h3><strong>{member.role}</strong><p>{member.bio}</p></div>
						<div className="platform-team-card__actions"><button className="button button--outline button--small" type="button" onClick={() => startEdit(member)} disabled={busy}>Edit</button><button className="button button--ghost button--small" type="button" onClick={() => remove(member)} disabled={busy}>Remove</button></div>
					</article>
				))}
				{members.length === 0 && <p className="manage-empty">No platform team profiles have been added.</p>}
			</div>
		</section>
	)
}
