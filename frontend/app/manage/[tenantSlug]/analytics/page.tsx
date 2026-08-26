import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
	getTenantAnalytics,
	getBookingAnalytics,
	getReviewAnalytics,
} from "@backend/services/analyticsService"

interface AnalyticsPageProps {
	readonly params: Promise<{ tenantSlug: string }>
}

export default async function MerchantAnalyticsPage({
	params,
}: AnalyticsPageProps) {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const { tenantSlug } = await params

	const tenant = await (
		await import("@backend/db/prisma")
	).prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: { id: true },
	})
	if (!tenant) redirect(`/manage`)

	const [analytics, bookingAnalytics, reviewAnalytics] = await Promise.all([
		getTenantAnalytics(tenant.id),
		getBookingAnalytics(tenant.id),
		getReviewAnalytics(tenant.id),
	])

	const confirmationPercentage =
		analytics.totalBookings > 0
			? Math.round(
					(analytics.confirmedBookings / analytics.totalBookings) * 100,
				)
			: 0

	return (
		<main className="manage-page">
			<header className="manage-header">
				<div>
					<p className="eyebrow">Business Intelligence</p>
					<h1>Analytics & Insights</h1>
					<p className="auth-card__intro">
						Key metrics and trends for your salon business.
					</p>
				</div>
			</header>

			<section
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
					gap: "1.5em",
					marginBottom: "2em",
				}}
			>
				<div
					style={{
						padding: "1.5em",
						border: "1px solid #ddd",
						borderRadius: "0.5em",
						background: "#f8f9fa",
					}}
				>
					<p
						style={{ color: "#666", fontSize: "0.9em", marginBottom: "0.5em" }}
					>
						Total Bookings
					</p>
					<h2 style={{ fontSize: "2em", margin: "0" }}>
						{analytics.totalBookings}
					</h2>
					<p
						style={{ fontSize: "0.85em", color: "#999", margin: "0.5em 0 0 0" }}
					>
						Confirmed: {analytics.confirmedBookings} ({confirmationPercentage}%)
					</p>
				</div>

				<div
					style={{
						padding: "1.5em",
						border: "1px solid #ddd",
						borderRadius: "0.5em",
						background: "#f8f9fa",
					}}
				>
					<p
						style={{ color: "#666", fontSize: "0.9em", marginBottom: "0.5em" }}
					>
						Average Rating
					</p>
					<h2 style={{ fontSize: "2em", margin: "0" }}>
						{analytics.averageRating.toFixed(1)} ⭐
					</h2>
					<p
						style={{ fontSize: "0.85em", color: "#999", margin: "0.5em 0 0 0" }}
					>
						from {analytics.totalReviews} reviews
					</p>
				</div>

				<div
					style={{
						padding: "1.5em",
						border: "1px solid #ddd",
						borderRadius: "0.5em",
						background: "#f8f9fa",
					}}
				>
					<p
						style={{ color: "#666", fontSize: "0.9em", marginBottom: "0.5em" }}
					>
						Unique Clients
					</p>
					<h2 style={{ fontSize: "2em", margin: "0" }}>
						{analytics.uniqueClients}
					</h2>
					<p
						style={{ fontSize: "0.85em", color: "#999", margin: "0.5em 0 0 0" }}
					>
						Booked appointments
					</p>
				</div>

				<div
					style={{
						padding: "1.5em",
						border: "1px solid #ddd",
						borderRadius: "0.5em",
						background: "#f8f9fa",
					}}
				>
					<p
						style={{ color: "#666", fontSize: "0.9em", marginBottom: "0.5em" }}
					>
						Messages
					</p>
					<h2 style={{ fontSize: "2em", margin: "0" }}>
						{analytics.newMessages}
					</h2>
					<p
						style={{ fontSize: "0.85em", color: "#999", margin: "0.5em 0 0 0" }}
					>
						New from {analytics.totalMessages} total
					</p>
				</div>
			</section>

			<section style={{ marginBottom: "2em" }}>
				<h2 style={{ marginBottom: "1em" }}>Booking Status Breakdown</h2>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
						gap: "1em",
					}}
				>
					{[
						[
							"PENDING",
							bookingAnalytics.bookingsByStatus.PENDING ?? 0,
							"#ffc107",
						],
						[
							"CONFIRMED",
							bookingAnalytics.bookingsByStatus.CONFIRMED ?? 0,
							"#28a745",
						],
						[
							"CANCELLED",
							bookingAnalytics.bookingsByStatus.CANCELLED ?? 0,
							"#dc3545",
						],
					].map(([status, count, color]) => (
						<div
							key={status}
							style={{
								padding: "1em",
								background: color,
								color: "white",
								borderRadius: "0.5em",
								textAlign: "center",
							}}
						>
							<p style={{ margin: "0", fontSize: "0.9em", opacity: 0.9 }}>
								{status}
							</p>
							<h3 style={{ fontSize: "1.5em", margin: "0.25em 0" }}>{count}</h3>
						</div>
					))}
				</div>
			</section>

			{bookingAnalytics.bookingsByService.length > 0 && (
				<section style={{ marginBottom: "2em" }}>
					<h2 style={{ marginBottom: "1em" }}>Top Services</h2>
					<div style={{ border: "1px solid #ddd", borderRadius: "0.5em" }}>
						{bookingAnalytics.bookingsByService
							.slice(0, 5)
							.map((service, i) => (
								<div
									key={i}
									style={{
										padding: "1em",
										borderBottom:
											i <
											Math.min(5, bookingAnalytics.bookingsByService.length - 1)
												? "1px solid #eee"
												: "none",
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
									}}
								>
									<div>
										<p style={{ margin: "0", fontWeight: "500" }}>
											{service.serviceName}
										</p>
									</div>
									<div
										style={{
											fontSize: "0.9em",
											color: "#666",
										}}
									>
										{service.count} bookings
									</div>
								</div>
							))}
					</div>
				</section>
			)}

			<section style={{ marginBottom: "2em" }}>
				<h2 style={{ marginBottom: "1em" }}>Review Insights</h2>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
						gap: "1em",
					}}
				>
					<div
						style={{
							padding: "1em",
							background: "#f8f9fa",
							borderRadius: "0.5em",
						}}
					>
						<p
							style={{
								color: "#666",
								fontSize: "0.9em",
								marginBottom: "0.5em",
							}}
						>
							Total Reviews
						</p>
						<h3 style={{ fontSize: "1.5em", margin: "0" }}>
							{reviewAnalytics.totalReviews}
						</h3>
					</div>
					<div
						style={{
							padding: "1em",
							background: "#f8f9fa",
							borderRadius: "0.5em",
						}}
					>
						<p
							style={{
								color: "#666",
								fontSize: "0.9em",
								marginBottom: "0.5em",
							}}
						>
							Approved
						</p>
						<h3 style={{ fontSize: "1.5em", margin: "0" }}>
							{reviewAnalytics.approvedReviews}
						</h3>
					</div>
					<div
						style={{
							padding: "1em",
							background: "#f8f9fa",
							borderRadius: "0.5em",
						}}
					>
						<p
							style={{
								color: "#666",
								fontSize: "0.9em",
								marginBottom: "0.5em",
							}}
						>
							Pending
						</p>
						<h3 style={{ fontSize: "1.5em", margin: "0" }}>
							{reviewAnalytics.pendingReviews}
						</h3>
					</div>
					<div
						style={{
							padding: "1em",
							background: "#f8f9fa",
							borderRadius: "0.5em",
						}}
					>
						<p
							style={{
								color: "#666",
								fontSize: "0.9em",
								marginBottom: "0.5em",
							}}
						>
							Flagged
						</p>
						<h3 style={{ fontSize: "1.5em", margin: "0" }}>
							{reviewAnalytics.flaggedReviews}
						</h3>
					</div>
				</div>
			</section>

			<section
				style={{
					padding: "1.5em",
					background: "#e7f3ff",
					borderLeft: "4px solid #2196F3",
					borderRadius: "0.25em",
				}}
			>
				<h3 style={{ margin: "0 0 0.5em 0", color: "#1565c0" }}>
					💡 Business Insights
				</h3>
				<ul style={{ margin: "0", paddingLeft: "1.5em", color: "#0d47a1" }}>
					<li>
						Avg. confirmation time:{" "}
						<strong>
							{bookingAnalytics.averageTimeToConfirmation.toFixed(1)}
						</strong>{" "}
						minutes
					</li>
					<li>
						Cancellation rate:{" "}
						<strong>
							{analytics.totalBookings > 0
								? Math.round(
										(analytics.cancelledBookings / analytics.totalBookings) *
											100,
									)
								: 0}
						</strong>
						%
					</li>
					<li>
						Waitlist entries: <strong>{analytics.activeWaitlistEntries}</strong>{" "}
						active
					</li>
				</ul>
			</section>
		</main>
	)
}
