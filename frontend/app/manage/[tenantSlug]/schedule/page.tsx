import { redirect } from "next/navigation"
import Link from "next/link"

import { auth } from "@/auth"
import { getLoginUrlForPath } from "@shared/authCallback"
import {
	listScheduleForUser,
	MerchantScheduleError,
} from "@backend/services/merchantScheduleService"

interface SchedulePageProps {
	readonly params: Promise<{ tenantSlug: string }>
}

function groupBookingsByDay(
	bookings: Array<{
		id: string
		appointmentDate: Date
		timeLabel: string
		serviceName: string
		firstName: string
		lastName: string
		status: string
	}>,
): Map<string, typeof bookings> {
	const grouped = new Map<string, typeof bookings>()
	for (const booking of bookings) {
		const date = booking.appointmentDate.toISOString().slice(0, 10)
		const dayBookings = grouped.get(date) ?? []
		dayBookings.push(booking)
		grouped.set(date, dayBookings)
	}
	return grouped
}

export default async function MerchantSchedulePage({
	params,
}: SchedulePageProps) {
	const { tenantSlug } = await params
	redirect(`/manage/${encodeURIComponent(tenantSlug)}?section=schedule`)
	const session = await auth()
	const userId = session?.user?.id
	if (!userId)
		redirect(getLoginUrlForPath(`/manage/${tenantSlug}/schedule`))
	let bookings: Awaited<ReturnType<typeof listScheduleForUser>>
	try {
		bookings = await listScheduleForUser(userId, tenantSlug)
	} catch (error) {
		if (error instanceof MerchantScheduleError)
			redirect(`/manage/${tenantSlug}`)
		throw error
	}

	const groupedByDay = groupBookingsByDay(bookings)
	const sortedDates = Array.from(groupedByDay.keys()).sort()

	return (
		<main className="manage-page merchant-schedule-page">
			<header className="manage-header">
				<div>
					<p className="eyebrow">Operations</p>
					<h1>Schedule</h1>
					<p className="auth-card__intro">
						Upcoming appointments grouped by day for the salon team.
					</p>
				</div>
			</header>

			<section className="merchant-schedule-days" aria-label="Upcoming schedule">
				{sortedDates.length === 0 ? (
					<div className="manage-empty-state merchant-schedule-empty">
						<p className="manage-empty">No upcoming appointments are scheduled. New and confirmed appointments will be grouped here by day.</p>
						<Link className="button button--outline button--small" href={`/manage/${encodeURIComponent(tenantSlug)}/bookings`}>Review bookings</Link>
					</div>
				) : sortedDates.map((date) => {
					const dayBookings = groupedByDay.get(date) ?? []
					const dateObj = new Date(`${date}T00:00:00.000Z`)
					const dayName = dateObj.toLocaleDateString("en-KE", {
						weekday: "long",
						month: "long",
						day: "numeric",
						timeZone: "UTC",
					})

					return (
						<section className="merchant-schedule-day" key={date} aria-label={dayName}>
							<h2>{dayName}</h2>
							<div className="merchant-schedule-day__bookings">
								{dayBookings.map((booking) => (
									<article className="merchant-schedule-booking" key={booking.id}>
										<div>
											<p className="eyebrow">{booking.timeLabel}</p>
											<h3>{booking.serviceName}</h3>
											<p className="merchant-schedule-booking__client">
												{booking.firstName} {booking.lastName}
											</p>
										</div>
										<span className={`merchant-schedule-booking__status merchant-schedule-booking__status--${booking.status.toLowerCase().replace(/[^a-z0-9-]/g, "")}`}>
											{booking.status.toLowerCase()}
										</span>
									</article>
								))}
							</div>
						</section>
					)
				})}
			</section>

			<section className="merchant-schedule-summary" aria-labelledby="schedule-summary-title">
				<p className="eyebrow">At a glance</p>
				<h2 id="schedule-summary-title">Schedule summary</h2>
				<div>
					<p>Total appointments <strong>{bookings.length}</strong></p>
					<p>Days scheduled <strong>{sortedDates.length}</strong></p>
				</div>
				<p className="merchant-schedule-summary__note">Showing the next 100 upcoming appointments.</p>
			</section>
		</main>
	)
}
