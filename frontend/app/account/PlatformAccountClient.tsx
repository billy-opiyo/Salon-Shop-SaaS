"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"

import type { ClientAccountSnapshot } from "@shared/types/clientAccount"

type Preferences = NonNullable<ClientAccountSnapshot["preferences"]>

const defaultPreferences: Preferences = {
	theme: "dark",
	fontSize: "medium",
	highContrast: false,
	reducedMotion: false,
	notifyEmail: true,
	notifySms: false,
	notifyPush: false,
}

export function PlatformAccountClient({
	initialSnapshot,
	canDeleteAccount,
}: {
	readonly initialSnapshot: ClientAccountSnapshot
	readonly canDeleteAccount: boolean
}) {
	const router = useRouter()
	const [snapshot, setSnapshot] = useState(initialSnapshot)
	const [name, setName] = useState(initialSnapshot.profile.name ?? "")
	const [email, setEmail] = useState(initialSnapshot.profile.email)
	const [pendingEmail, setPendingEmail] = useState("")
	const [phone, setPhone] = useState(initialSnapshot.profile.phone ?? "")
	const [image, setImage] = useState(initialSnapshot.profile.image ?? "")
	const [preferences, setPreferences] = useState<Preferences>(initialSnapshot.preferences ?? defaultPreferences)
	const [currentPassword, setCurrentPassword] = useState("")
	const [newPassword, setNewPassword] = useState("")
	const [message, setMessage] = useState("")
	const [error, setError] = useState(false)
	const [busy, setBusy] = useState(false)
	const [editingBooking, setEditingBooking] = useState<string | null>(null)
	const [newDate, setNewDate] = useState("")
	const [newTime, setNewTime] = useState("")

	const setStatus = (text: string, isError = false) => {
		setMessage(text)
		setError(isError)
	}

	const patchAccount = async (body: Record<string, unknown>): Promise<boolean> => {
		const response = await fetch("/api/account", {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		})
		const result = await response.json().catch(() => ({})) as { error?: string }
		if (!response.ok) setStatus(result.error ?? "Your account could not be updated.", true)
		return response.ok
	}

	const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setBusy(true)
		setStatus("Saving your profile…")
		try {
			if (!(await patchAccount({ name, phone }))) return
			setSnapshot((current) => ({ ...current, profile: { ...current.profile, name, phone: phone || null } }))
			if (email.trim().toLowerCase() !== snapshot.profile.email.toLowerCase()) {
				const requestedEmail = email.trim().toLowerCase()
				const response = await fetch("/api/account", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ email: requestedEmail }),
				})
				const result = await response.json().catch(() => ({})) as { error?: string }
				if (!response.ok) {
					setStatus(result.error ?? "Email change could not be requested.", true)
					return
				}
				setEmail(snapshot.profile.email)
				setPendingEmail(requestedEmail)
				setStatus("Your profile was saved. Follow the confirmation link sent to your new email address to finish changing it.")
			} else {
				setStatus("Your profile was saved.")
			}
		} catch {
			setStatus("Your profile could not be saved. Please try again.", true)
		} finally {
			setBusy(false)
		}
	}

	const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return
		if (file.size > 1024 * 1024) {
			setStatus("Choose an image under 1 MB.", true)
			return
		}
		setBusy(true)
		setStatus("Uploading your profile picture…")
		try {
			const formData = new FormData()
			formData.set("avatar", file)
			const response = await fetch("/api/account/avatar", { method: "POST", body: formData })
			const result = await response.json() as { image?: string; error?: string }
			if (!response.ok || !result.image) throw new Error(result.error ?? "The image could not be saved.")
			setImage(result.image)
			setSnapshot((current) => ({ ...current, profile: { ...current.profile, image: result.image ?? null } }))
			window.dispatchEvent(new CustomEvent("beauty-sphia:profile-image-updated", { detail: { image: result.image } }))
			setStatus("Your profile picture was updated.")
		} catch (uploadError) {
			setStatus(uploadError instanceof Error ? uploadError.message : "The image could not be saved.", true)
		} finally {
			event.target.value = ""
			setBusy(false)
		}
	}

	const changePassword = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setBusy(true)
		setStatus("Updating your password…")
		try {
			if (await patchAccount({ currentPassword, newPassword })) {
				setCurrentPassword("")
				setNewPassword("")
				setStatus("Your password was changed.")
			}
		} catch {
			setStatus("Your password could not be changed. Please try again.", true)
		} finally {
			setBusy(false)
		}
	}

	const requestPasswordReset = async () => {
		setBusy(true)
		try {
			const response = await fetch("/api/auth/password-reset", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ action: "request", email: snapshot.profile.email }),
			})
			const result = await response.json() as { message?: string; error?: string }
			setStatus(response.ok ? result.message ?? "If your account is eligible, a reset email will arrive shortly." : result.error ?? "Password reset email could not be sent.", !response.ok)
		} catch {
			setStatus("Password reset email could not be sent.", true)
		} finally {
			setBusy(false)
		}
	}

	const savePreferences = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setBusy(true)
		setStatus("Saving your preferences…")
		try {
			if (await patchAccount(preferences)) {
				setSnapshot((current) => ({ ...current, preferences }))
				setStatus("Your preferences were saved.")
			}
		} catch {
			setStatus("Your preferences could not be saved.", true)
		} finally {
			setBusy(false)
		}
	}

	const cancelBooking = async (bookingId: string, tenantSlug: string) => {
		if (!window.confirm("Cancel this appointment?")) return
		setBusy(true)
		try {
			const response = await fetch("/api/account/bookings", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ bookingId, tenantSlug }),
			})
			const result = await response.json().catch(() => ({})) as { error?: string }
			if (!response.ok) throw new Error(result.error ?? "This appointment could not be cancelled.")
			setSnapshot((current) => ({ ...current, bookings: current.bookings.map((booking) => booking.id === bookingId ? { ...booking, status: "cancelled" } : booking) }))
			setStatus("Your appointment was cancelled.")
		} catch (cancelError) {
			setStatus(cancelError instanceof Error ? cancelError.message : "This appointment could not be cancelled.", true)
		} finally {
			setBusy(false)
		}
	}

	const rescheduleBooking = async (booking: ClientAccountSnapshot["bookings"][number]) => {
		if (!newDate || !newTime.trim()) {
			setStatus("Choose a new date and time first.", true)
			return
		}
		setBusy(true)
		try {
			const response = await fetch("/api/account/bookings/reschedule", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ tenantSlug: booking.tenantSlug, bookingId: booking.id, appointmentDate: newDate, timeLabel: newTime.trim(), stylistId: booking.stylistId ?? undefined }),
			})
			const result = await response.json().catch(() => ({})) as { error?: string }
			if (!response.ok) throw new Error(result.error ?? "That appointment time is unavailable.")
			setSnapshot((current) => ({ ...current, bookings: current.bookings.map((item) => item.id === booking.id ? { ...item, appointmentDate: newDate, timeLabel: newTime.trim() } : item) }))
			setEditingBooking(null)
			setStatus("Your appointment was rescheduled.")
		} catch (rescheduleError) {
			setStatus(rescheduleError instanceof Error ? rescheduleError.message : "That appointment time is unavailable.", true)
		} finally {
			setBusy(false)
		}
	}

	const deleteAccount = async () => {
		if (!canDeleteAccount || !window.confirm("Permanently delete your Beauty Sphia account? This cannot be undone.")) return
		setBusy(true)
		try {
			const response = await fetch("/api/account", { method: "DELETE" })
			const result = await response.json().catch(() => ({})) as { error?: string }
			if (!response.ok) throw new Error(result.error ?? "Your account could not be deleted.")
			await signOut({ redirect: false })
			router.replace("/")
			router.refresh()
		} catch (deleteError) {
			setStatus(deleteError instanceof Error ? deleteError.message : "Your account could not be deleted.", true)
		} finally {
			setBusy(false)
		}
	}

	const today = new Date().toISOString().slice(0, 10)

	return (
		<div className="platform-account-content" data-account-theme={preferences.theme} data-account-size={preferences.fontSize} data-account-contrast={preferences.highContrast ? "high" : "normal"} data-account-motion={preferences.reducedMotion ? "reduced" : "normal"}>
			{message && <p className={`platform-account-message${error ? " is-error" : ""}`} role={error ? "alert" : "status"}>{message}</p>}
			<div className="platform-account-grid">
				<section className="platform-account-panel" aria-labelledby="platform-profile-title">
					<p className="eyebrow">Profile</p><h2 id="platform-profile-title">Personal details</h2>
					<div className="platform-account-avatar-row">
						{image ? <Image className="platform-account-profile-image" src={image} alt="Your profile picture" width={88} height={88} unoptimized /> : <div className="platform-account-profile-initial" aria-hidden="true">{snapshot.profile.email.charAt(0).toUpperCase()}</div>}
						<label className="button button--outline button--small">Change picture<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadAvatar} disabled={busy} /><small>JPG, PNG, WebP, or GIF · up to 1 MB</small></label>
					</div>
					<form className="platform-account-form" onSubmit={saveProfile}>
						<label>Full name<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required /></label>
						<label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />{pendingEmail ? <small>Confirmation sent to {pendingEmail}. Your current email remains active until you verify it.</small> : <small>Email changes take effect after you confirm the message sent to the new address.</small>}</label>
						<label>Phone number<input type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} /></label>
						<button className="button button--primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
					</form>
				</section>

				<section className="platform-account-panel" aria-labelledby="platform-password-title">
					<p className="eyebrow">Account security</p><h2 id="platform-password-title">Password and sign-in</h2>
					<form className="platform-account-form" onSubmit={changePassword}>
						<label>Current password<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
						<label>New password<input type="password" autoComplete="new-password" minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /><small>Use at least 12 characters.</small></label>
						<button className="button button--primary" type="submit" disabled={busy}>{busy ? "Updating…" : "Change password"}</button>
					</form>
					<button className="button button--ghost" type="button" onClick={() => void requestPasswordReset()} disabled={busy}>Send password reset email</button>
					<h3 className="platform-account-subheading">Recent sign-ins</h3>
					<ul className="platform-account-history">{snapshot.loginHistory.slice(0, 6).map((item) => <li key={item.id}><strong>{item.provider}</strong><span>{item.status} · {item.riskLevel ?? "standard"}</span><small>{item.country ?? "Unknown location"} · {new Date(item.createdAt).toLocaleDateString("en-KE")}</small></li>)}</ul>
				</section>

				<section className="platform-account-panel" aria-labelledby="platform-preferences-title">
					<p className="eyebrow">Personal settings</p><h2 id="platform-preferences-title">Appearance and notifications</h2>
					<form className="platform-account-form" onSubmit={savePreferences}>
						<div className="platform-account-form__row">
							<label>Appearance<select value={preferences.theme} onChange={(event) => setPreferences((current) => ({ ...current, theme: event.target.value as Preferences["theme"] }))}><option value="dark">Dark</option><option value="light">Light</option></select></label>
							<label>Text size<select value={preferences.fontSize} onChange={(event) => setPreferences((current) => ({ ...current, fontSize: event.target.value as Preferences["fontSize"] }))}><option value="small">Small</option><option value="medium">Default</option><option value="large">Large</option></select></label>
						</div>
						<div className="platform-account-checks">
							<label><input type="checkbox" checked={preferences.highContrast} onChange={(event) => setPreferences((current) => ({ ...current, highContrast: event.target.checked }))} /> High contrast</label>
							<label><input type="checkbox" checked={preferences.reducedMotion} onChange={(event) => setPreferences((current) => ({ ...current, reducedMotion: event.target.checked }))} /> Reduced motion</label>
							<label><input type="checkbox" checked={preferences.notifyEmail} onChange={(event) => setPreferences((current) => ({ ...current, notifyEmail: event.target.checked }))} /> Email notifications</label>
							<label><input type="checkbox" checked={preferences.notifySms} onChange={(event) => setPreferences((current) => ({ ...current, notifySms: event.target.checked }))} /> SMS notifications</label>
							<label><input type="checkbox" checked={preferences.notifyPush} onChange={(event) => setPreferences((current) => ({ ...current, notifyPush: event.target.checked }))} /> Push notifications</label>
						</div>
						<button className="button button--primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save preferences"}</button>
					</form>
				</section>

				<section className="platform-account-panel platform-account-panel--wide" aria-labelledby="platform-bookings-title">
					<p className="eyebrow">Appointments</p><h2 id="platform-bookings-title">Your bookings</h2>
					{snapshot.bookings.length ? <div className="platform-account-bookings">{snapshot.bookings.map((booking) => {
						const canManage = ["pending", "confirmed", "waitlisted"].includes(booking.status)
						const canReschedule = ["pending", "confirmed"].includes(booking.status)
						return <article className="platform-account-booking" key={booking.id}>
							<div className="platform-account-booking__details"><p className="eyebrow">{booking.tenantName}</p><h3>{booking.serviceName}</h3><span>{booking.appointmentDate} at {booking.timeLabel} · {booking.stylistName ?? "Any available stylist"}</span>{booking.specialRequests && <small>Note: {booking.specialRequests}</small>}</div>
							<div className="platform-account-booking__actions"><span className={`platform-account-status platform-account-status--${booking.status}`}>{booking.status.replaceAll("_", " ")}</span><Link className="button button--ghost button--small" href={`/${booking.tenantSlug}`}>Open salon</Link>{canManage && <button className="button button--outline button--small" type="button" disabled={busy} onClick={() => void cancelBooking(booking.id, booking.tenantSlug)}>Cancel</button>}{canReschedule && <button className="button button--outline button--small" type="button" onClick={() => { setEditingBooking((current) => current === booking.id ? null : booking.id); setNewDate(booking.appointmentDate); setNewTime(booking.timeLabel) }}>Reschedule</button>}</div>
							{editingBooking === booking.id && <form className="platform-account-reschedule" onSubmit={(event) => { event.preventDefault(); void rescheduleBooking(booking) }}><label>New date<input type="date" min={today} value={newDate} onChange={(event) => setNewDate(event.target.value)} required /></label><label>New time<input type="text" value={newTime} onChange={(event) => setNewTime(event.target.value)} placeholder="e.g. 10:30 AM" maxLength={40} required /></label><button className="button button--primary button--small" type="submit" disabled={busy}>{busy ? "Saving…" : "Save new time"}</button><small>The salon will confirm availability for your requested time.</small></form>}
						</article>
					})}</div> : <p className="platform-account-empty">No appointments are linked to your Beauty Sphia account yet. Browse salons to book your next visit.</p>}
				</section>

				<section className="platform-account-panel" aria-labelledby="platform-reviews-title">
					<p className="eyebrow">Your feedback</p><h2 id="platform-reviews-title">Reviews</h2>
					{snapshot.reviews.length ? <ul className="platform-account-review-list">{snapshot.reviews.map((review) => <li key={review.id}><div><strong>{review.serviceName ?? review.tenantName}</strong><span>{"★".repeat(review.rating)} · {review.status}</span></div><p>{review.text}</p><Link href={`/${review.tenantSlug}`}>Visit {review.tenantName}</Link></li>)}</ul> : <p className="platform-account-empty">Reviews you submit at Beauty Sphia salons will appear here.</p>}
				</section>

				<section className="platform-account-panel" aria-labelledby="platform-favorites-title">
					<p className="eyebrow">Saved inspiration</p><h2 id="platform-favorites-title">Favorite styles</h2>
					{snapshot.favorites.length ? <div className="platform-account-favorites">{snapshot.favorites.map((favorite) => <Link className="platform-account-favorite" href={`/${favorite.tenantSlug}`} key={favorite.id}><Image src={favorite.imageUrl} alt={favorite.styleName} width={240} height={180} unoptimized /><span><strong>{favorite.styleName}</strong><small>{favorite.category ?? favorite.tenantName} · {favorite.tenantName}</small></span></Link>)}</div> : <p className="platform-account-empty">Save styles from a salon gallery and they will be collected here.</p>}
				</section>

				<section className="platform-account-panel platform-account-panel--wide platform-account-danger" aria-labelledby="platform-delete-title">
					<p className="eyebrow">Privacy controls</p><h2 id="platform-delete-title">Delete your account</h2>
					{canDeleteAccount ? <><p>Deleting your account permanently removes your Beauty Sphia sign-in and personal profile.</p><button className="button button--outline" type="button" onClick={() => void deleteAccount()} disabled={busy}>Delete account permanently</button></> : <p>Transfer or remove your salon ownership before deleting this account. Your salon workspaces are connected to this sign-in.</p>}
				</section>
			</div>
		</div>
	)
}
