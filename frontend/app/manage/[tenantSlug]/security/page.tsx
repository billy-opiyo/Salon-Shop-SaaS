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
					<strong>{snapshot.logins.length}</strong>
					<span>recent logins</span>
				</div>
				<div className="admin-booking-filter-btn active">
					<strong>{snapshot.alerts.length}</strong>
					<span>alerts</span>
				</div>
				<div className="admin-booking-filter-btn active">
					<strong>{snapshot.changes.length}</strong>
					<span>account changes</span>
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
		</main>
	)
}
