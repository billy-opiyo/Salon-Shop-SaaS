import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { getLoginUrlForPath } from "@shared/authCallback"
import {
	assertAnalyticsAccess,
	getBookingAnalytics,
	getReviewAnalytics,
	getTenantAnalytics,
} from "@backend/services/analyticsService"

interface AnalyticsPageProps {
	readonly params: Promise<{ tenantSlug: string }>
}

export default async function MerchantAnalyticsPage({
	params,
}: AnalyticsPageProps) {
	const { tenantSlug } = await params
	const session = await auth()
	if (!session?.user?.id)
		redirect(getLoginUrlForPath(`/manage/${tenantSlug}/analytics`))

	const tenant = await (
		await import("@backend/db/prisma")
	).prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: { id: true },
	})
	if (!tenant) redirect("/manage")
	try {
		await assertAnalyticsAccess(session.user.id, tenant.id)
	} catch {
		redirect(`/manage/${tenantSlug}`)
	}

	const [analytics, bookingAnalytics, reviewAnalytics] = await Promise.all([
		getTenantAnalytics(tenant.id),
		getBookingAnalytics(tenant.id),
		getReviewAnalytics(tenant.id),
	])

	const confirmationPercentage = analytics.totalBookings > 0
		? Math.round((analytics.confirmedBookings / analytics.totalBookings) * 100)
		: 0
	const cancellationPercentage = analytics.totalBookings > 0
		? Math.round((analytics.cancelledBookings / analytics.totalBookings) * 100)
		: 0
	const metrics = [
		{
			label: "Total bookings",
			value: analytics.totalBookings,
			detail: `Confirmed: ${analytics.confirmedBookings} (${confirmationPercentage}%)`,
		},
		{
			label: "Average rating",
			value: `${analytics.averageRating.toFixed(1)} / 5`,
			detail: `From ${analytics.totalReviews} reviews`,
		},
		{
			label: "Unique clients",
			value: analytics.uniqueClients,
			detail: "With booked appointments",
		},
		{
			label: "New messages",
			value: analytics.newMessages,
			detail: `From ${analytics.totalMessages} total`,
		},
	]
	const bookingStatuses = [
		{ label: "Pending", value: bookingAnalytics.bookingsByStatus.PENDING ?? 0, tone: "pending" },
		{ label: "Confirmed", value: bookingAnalytics.bookingsByStatus.CONFIRMED ?? 0, tone: "confirmed" },
		{ label: "Cancelled", value: bookingAnalytics.bookingsByStatus.CANCELLED ?? 0, tone: "cancelled" },
	]
	const reviewMetrics = [
		{ label: "Total reviews", value: reviewAnalytics.totalReviews },
		{ label: "Approved", value: reviewAnalytics.approvedReviews },
		{ label: "Pending", value: reviewAnalytics.pendingReviews },
		{ label: "Flagged", value: reviewAnalytics.flaggedReviews },
	]

	return (
		<main className="manage-page merchant-analytics-page">
			<header className="manage-header">
				<div>
					<p className="eyebrow">Business intelligence</p>
					<h1>Analytics &amp; insights</h1>
					<p className="auth-card__intro">
						Key metrics and trends for your salon business.
					</p>
				</div>
			</header>

			<section className="merchant-analytics-metrics" aria-label="Salon overview">
				{metrics.map((metric) => (
					<article className="merchant-analytics-metric" key={metric.label}>
						<p>{metric.label}</p>
					<strong>{metric.value}</strong>
						<span>{metric.detail}</span>
					</article>
				))}
			</section>

			<section className="merchant-analytics-section" aria-labelledby="booking-status-title">
				<header className="merchant-analytics-section__heading">
					<p className="eyebrow">Bookings</p>
					<h2 id="booking-status-title">Booking status</h2>
				</header>
				<div className="merchant-analytics-status-grid">
					{bookingStatuses.map((status) => (
						<article className={`merchant-analytics-status merchant-analytics-status--${status.tone}`} key={status.label}>
							<span>{status.label}</span>
							<strong>{status.value}</strong>
						</article>
					))}
				</div>
			</section>

			{bookingAnalytics.bookingsByService.length > 0 && (
				<section className="merchant-analytics-section" aria-labelledby="top-services-title">
					<header className="merchant-analytics-section__heading">
						<p className="eyebrow">What clients book</p>
						<h2 id="top-services-title">Top services</h2>
					</header>
					<ol className="merchant-analytics-service-list">
						{bookingAnalytics.bookingsByService.slice(0, 5).map((service, index) => (
							<li key={`${service.serviceName}-${index}`}>
								<span>{service.serviceName}</span>
								<strong>{service.count} bookings</strong>
							</li>
						))}
					</ol>
				</section>
			)}

			<section className="merchant-analytics-section" aria-labelledby="review-insights-title">
				<header className="merchant-analytics-section__heading">
					<p className="eyebrow">Client feedback</p>
					<h2 id="review-insights-title">Review insights</h2>
				</header>
				<div className="merchant-analytics-review-grid">
					{reviewMetrics.map((metric) => (
						<article className="merchant-analytics-review" key={metric.label}>
							<span>{metric.label}</span>
							<strong>{metric.value}</strong>
						</article>
					))}
				</div>
			</section>

			<section className="merchant-analytics-insights" aria-labelledby="business-insights-title">
				<p className="eyebrow">At a glance</p>
				<h2 id="business-insights-title">Business insights</h2>
				<ul>
					<li>Average confirmation time: <strong>{bookingAnalytics.averageTimeToConfirmation.toFixed(1)} minutes</strong></li>
					<li>Cancellation rate: <strong>{cancellationPercentage}%</strong></li>
					<li>Waitlist entries: <strong>{analytics.activeWaitlistEntries} active</strong></li>
				</ul>
			</section>
		</main>
	)
}
