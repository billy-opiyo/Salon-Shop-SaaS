import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
	getSecuritySnapshot,
	MerchantSecurityError,
} from "@backend/services/merchantSecurityService"

interface SecurityPageProps {
	readonly params: Promise<{ tenantSlug: string }>
}

export default async function MerchantSecurityPage({
	params,
}: SecurityPageProps) {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const { tenantSlug } = await params
	let snapshot
	try {
		snapshot = await getSecuritySnapshot(session.user.id, tenantSlug)
	} catch (error) {
		if (error instanceof MerchantSecurityError)
			redirect(`/manage/${tenantSlug}`)
		throw error
	}
	return (
		<main className="manage-page">
			<header className="manage-header">
				<div>
					<p className="eyebrow">Security monitoring</p>
					<h1>Security</h1>
					<p className="auth-card__intro">
						Review recent login activity, alerts, and account changes for this
						tenant.
					</p>
				</div>
			</header>
			<section
				className="admin-booking-filter-controls"
				aria-label="Security totals"
			>
				<div className="admin-booking-filter-btn active">
					<strong>{snapshot.stats.totalLogins}</strong>
					<span>recent logins</span>
				</div>
				<div className="admin-booking-filter-btn active">
					<strong>{snapshot.stats.openAlerts}</strong>
					<span>alerts</span>
				</div>
				<div className="admin-booking-filter-btn active">
					<strong>{snapshot.stats.totalAccountChanges}</strong>
					<span>account changes</span>
				</div>
				<div className="admin-booking-filter-btn active">
					<strong>{snapshot.stats.activeSessions}</strong>
					<span>active sessions</span>
				</div>
			</section>
			<section
				className="manage-store-list"
				aria-label="Recent security activity"
			>
				{snapshot.logins.map((login) => (
					<article className="manage-store" key={login.id}>
						<div>
							<p className="eyebrow">
								{login.status} · {login.riskLevel ?? "standard"}
							</p>
							<h2>{login.email ?? "Unknown account"}</h2>
							<p>
								{login.provider} · {login.country ?? "Unknown location"} ·{" "}
								{login.createdAt.toISOString()}
							</p>
						</div>
					</article>
				))}
				{snapshot.logins.length === 0 && (
					<p className="manage-empty">
						No tenant login activity has been recorded.
					</p>
				)}
			</section>
			<section className="manage-store-list" aria-label="Active sessions">
				<h2>Active sessions</h2>
				{snapshot.sessions.map((session) => (
					<article className="manage-store" key={session.id}>
						<div>
							<p className="eyebrow">Authenticated session</p>
							<h2>{session.user.name ?? session.user.email ?? session.userId}</h2>
							<p>Expires {session.expires.toISOString()}</p>
						</div>
					</article>
				))}
				{snapshot.sessions.length === 0 && (
					<p className="manage-empty">No active tenant sessions.</p>
				)}
			</section>
			<section className="manage-store-list" aria-label="Activity timeline">
				<h2>Activity timeline</h2>
				{snapshot.timeline.map((event) => (
					<article className="manage-store" key={event.id}>
						<div>
							<p className="eyebrow">{event.eventType}</p>
							<h2>{event.summary}</h2>
							<p>{event.createdAt.toISOString()}</p>
						</div>
					</article>
				))}
				{snapshot.timeline.length === 0 && (
					<p className="manage-empty">No activity timeline events.</p>
				)}
			</section>
		</main>
	)
}
