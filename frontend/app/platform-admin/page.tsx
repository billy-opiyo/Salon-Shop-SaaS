import Link from "next/link"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { getLoginUrlForPath } from "@shared/authCallback"
import {
	assertPlatformAdmin,
	PlatformAuthorizationError,
} from "@backend/services/platformAuthorization"
import {
	getPlatformAdminSnapshot,
	getPlatformStorefrontDesign,
} from "@backend/services/platformAdminService"
import { listPlatformTeamForAdmin } from "@backend/services/platformTeamService"
import { listPlatformRoleAssignments } from "@backend/services/platformRoleService"

import { PlatformAdminAction } from "./PlatformAdminAction"
import { PlatformTeamManager } from "./PlatformTeamManager"
import { PlatformStorefrontManager } from "./PlatformStorefrontManager"
import { PlatformRoleManager } from "./PlatformRoleManager"
import { PlatformBackToTop } from "@/components/shared/PlatformBackToTop"
import "./platform-admin.css"

function formatDate(value: Date | null): string {
	return value ? value.toLocaleDateString("en-KE") : "Not set"
}

function formatAmount(amountMinor: number, currency: string): string {
	return new Intl.NumberFormat("en-KE", {
		style: "currency",
		currency,
	}).format(amountMinor / 100)
}

export const metadata = {
	title: "Platform Operations | Beauty Sphia",
	description:
		"Beauty Sphia platform-wide salon, billing, security, and notification monitoring.",
}

export default async function PlatformAdminPage() {
	const session = await auth()
	if (!session?.user?.id)
		redirect(getLoginUrlForPath("/platform-admin"))
	let role: Awaited<ReturnType<typeof assertPlatformAdmin>>
	try {
		role = await assertPlatformAdmin(session.user.id, session.user.email)
	} catch (error) {
		if (error instanceof PlatformAuthorizationError) redirect("/")
		throw error
	}

	const [snapshot, teamMembers, storefrontDesign, roleAssignments] = await Promise.all([
		role === "OWNER" ? getPlatformAdminSnapshot() : Promise.resolve(null),
		role !== "STORE_SUPPORT" ? listPlatformTeamForAdmin(session.user.id, session.user.email) : Promise.resolve([]),
		getPlatformStorefrontDesign(),
		role === "OWNER" ? listPlatformRoleAssignments(session.user.id, session.user.email) : Promise.resolve([]),
	])
	const counts = snapshot?.counts
	const metricCards = counts ? [
		["Total salons", counts.totalTenants, "Across the Beauty Sphia platform"],
		[
			"Active salons",
			counts.activeTenants,
			`${counts.activeSubscriptions} active or trial plans`,
		],
		[
			"Payment due",
			counts.paymentDueSubscriptions,
			`${counts.overdueInvoices} overdue invoices`,
		],
		[
			"Suspended",
			counts.suspendedTenants,
			`${counts.suspendedSubscriptions} suspended subscriptions`,
		],
		[
			"Notification failures",
			counts.failedNotifications,
			"Delivery records needing attention",
		],
		[
			"Open security alerts",
			counts.unresolvedSecurityAlerts,
			"Unresolved platform alerts",
		],
	] as const : []

	return (
		<>
		<main className="platform-home-shell platform-admin-page">
			<header className="platform-admin-header">
				<div>
					<p className="eyebrow">Beauty Sphia operations</p>
					<h1>Platform Admin · {role === "OWNER" ? "Owner" : role === "STORE_EDITOR" ? "Store Editor" : "Store Support"}</h1>
					<p className="auth-card__intro">
						{role === "OWNER" ? "Watch platform operations and manage every platform feature." : role === "STORE_EDITOR" ? "Manage public site content and team profiles." : "Manage the public support page, FAQs, and support contact details."}
					</p>
				</div>
				<div className="platform-admin-header__meta">
					<Link className="button button--outline platform-admin-home-link" href="/" prefetch>
						Platform Home
					</Link>
					<span>Signed in as {session.user.email}</span>
					{snapshot && <span>Updated {snapshot.generatedAt.toLocaleTimeString("en-KE")}</span>}
				</div>
			</header>

			{snapshot && <section
				className="platform-admin-metrics"
				aria-label="Platform overview"
			>
				{metricCards.map(([label, value, detail]) => (
					<article className="platform-admin-metric" key={label}>
						<p className="eyebrow">{label}</p>
						<strong>{value}</strong>
						<span>{detail}</span>
					</article>
				))}
			</section>}

			{snapshot && <section className="platform-admin-grid" aria-label="Platform monitoring">
				<section
					className="platform-admin-panel"
					aria-labelledby="stores-title"
				>
					<div className="section-heading section-heading--row">
						<div>
							<p className="eyebrow">Tenant directory</p>
						<h2 id="stores-title">Recent salons</h2>
						</div>
					</div>
					<div className="platform-admin-list">
						{snapshot.recentTenants.map((tenant) => (
							<article className="platform-admin-row" key={tenant.id}>
								<div>
									<strong>{tenant.businessName}</strong>
									<span>
										/{tenant.slug} ·{" "}
										{tenant.subscription?.plan.displayName ?? "No plan"}
									</span>
								</div>
								<div>
									<b
										className={`platform-admin-status platform-admin-status--${tenant.status.toLowerCase()}`}
									>
										{tenant.status}
									</b>
									<span>{formatDate(tenant.createdAt)}</span>
								</div>
								{tenant.status === "ACTIVE" && (
									<PlatformAdminAction
										action="suspend-tenant"
										id={tenant.id}
										label="Suspend"
										confirmation={`Suspend ${tenant.businessName}? This will stop public storefront access.`}
									/>
								)}
								{tenant.status === "SUSPENDED" && (
									<PlatformAdminAction
										action="reactivate-tenant"
										id={tenant.id}
										label="Reactivate"
										confirmation={`Reactivate ${tenant.businessName}?`}
									/>
								)}
							</article>
						))}
						{snapshot.recentTenants.length === 0 && (
							<p className="manage-empty">No salons found.</p>
						)}
					</div>
				</section>

				<section
					className="platform-admin-panel"
					aria-labelledby="payments-title"
				>
					<div className="section-heading">
						<p className="eyebrow">Payment operations</p>
						<h2 id="payments-title">Manual-review payments</h2>
					</div>
					<div className="platform-admin-list">
						{snapshot.recentManualReviewPayments.map((attempt) => (
							<article className="platform-admin-row" key={attempt.id}>
								<div>
									<strong>{attempt.invoice.tenant.businessName}</strong>
									<span>
										{attempt.invoice.invoiceNumber} · {attempt.phoneNumber}
									</span>
								</div>
								<div>
									<span>
										{attempt.resultDescription ?? "Manual review requested"}
									</span>
									<PlatformAdminAction
										action="resolve-payment"
										id={attempt.id}
										label="Resolve"
										confirmation="Mark this payment attempt as resolved?"
									/>
								</div>
							</article>
						))}
						{snapshot.recentManualReviewPayments.length === 0 && (
							<p className="manage-empty">No payments require manual review.</p>
						)}
					</div>
				</section>

				<section
					className="platform-admin-panel"
					aria-labelledby="billing-title"
				>
					<div className="section-heading">
						<p className="eyebrow">Revenue protection</p>
						<h2 id="billing-title">Invoices needing attention</h2>
					</div>
					<div className="platform-admin-list">
						{snapshot.recentInvoices.map((invoice) => (
							<article className="platform-admin-row" key={invoice.id}>
								<div>
									<strong>{invoice.tenant.businessName}</strong>
									<span>{invoice.invoiceNumber}</span>
								</div>
								<div>
									<b>{formatAmount(invoice.amountMinor, invoice.currency)}</b>
									<span>Due {formatDate(invoice.dueAt)}</span>
								</div>
							</article>
						))}
						{snapshot.recentInvoices.length === 0 && (
							<p className="manage-empty">No pending invoices.</p>
						)}
					</div>
				</section>

				<section
					className="platform-admin-panel"
					aria-labelledby="notifications-title"
				>
					<div className="section-heading">
						<p className="eyebrow">Delivery health</p>
						<h2 id="notifications-title">Failed notifications</h2>
					</div>
					<div className="platform-admin-list">
						{snapshot.recentNotifications.map((notification) => (
							<article className="platform-admin-row" key={notification.id}>
								<div>
									<strong>{notification.tenant.businessName}</strong>
									<span>
										{notification.channel} · {notification.templateKey}
									</span>
								</div>
								<div>
									<b>{notification.destination}</b>
									<span>{notification.errorMessage ?? "Provider failed"}</span>
								</div>
							</article>
						))}
						{snapshot.recentNotifications.length === 0 && (
							<p className="manage-empty">No failed notification deliveries.</p>
						)}
					</div>
				</section>

				<section
					className="platform-admin-panel"
					aria-labelledby="security-title"
				>
					<div className="section-heading">
						<p className="eyebrow">Risk watch</p>
						<h2 id="security-title">Open security alerts</h2>
					</div>
					<div className="platform-admin-list">
						{snapshot.recentAlerts.map((alert) => (
							<article className="platform-admin-row" key={alert.id}>
								<div>
									<strong>{alert.tenant?.businessName ?? "Platform"}</strong>
									<span>{alert.alertType}</span>
								</div>
								<div>
									<b
										className={`platform-admin-severity platform-admin-severity--${alert.severity.toLowerCase()}`}
									>
										{alert.severity}
									</b>
									<span>{alert.message}</span>
									<PlatformAdminAction
										action="resolve-security-alert"
										id={alert.id}
										label="Resolve"
										confirmation="Resolve this security alert?"
									/>
								</div>
							</article>
						))}
						{snapshot.recentAlerts.length === 0 && (
							<p className="manage-empty">No unresolved security alerts.</p>
						)}
					</div>
				</section>
			</section>}
			<PlatformStorefrontManager initialDesign={storefrontDesign} role={role} />
			{role !== "STORE_SUPPORT" && <PlatformTeamManager initialMembers={teamMembers} />}
			{role === "OWNER" && <PlatformRoleManager initialAssignments={roleAssignments} />}
		</main>
		<PlatformBackToTop />
		</>
	)
}
