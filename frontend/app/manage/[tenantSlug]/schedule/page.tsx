import { redirect } from "next/navigation"
import { auth } from "@/auth"
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
		if (!grouped.has(date)) {
			grouped.set(date, [])
		}
		grouped.get(date)!.push(booking)
	}
	return grouped
}

export default async function MerchantSchedulePage({
	params,
}: SchedulePageProps) {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const { tenantSlug } = await params
	let bookings
	try {
		bookings = await listScheduleForUser(session.user.id, tenantSlug)
	} catch (error) {
		if (error instanceof MerchantScheduleError)
			redirect(`/manage/${tenantSlug}`)
		throw error
	}

	const groupedByDay = groupBookingsByDay(bookings)
	const sortedDates = Array.from(groupedByDay.keys()).sort()

	return (
		<main className="manage-page">
			<header className="manage-header">
				<div>
					<p className="eyebrow">Operations</p>
					<h1>Schedule</h1>
					<p className="auth-card__intro">
						Upcoming appointments grouped by day for the salon team.
					</p>
				</div>
			</header>
			<section className="manage-store-list" aria-label="Upcoming schedule">
				{sortedDates.length === 0 ? (
					<p className="manage-empty">
						No upcoming appointments are scheduled.
					</p>
				) : (
					sortedDates.map((date) => {
						const dayBookings = groupedByDay.get(date)!
						const dateObj = new Date(`${date}T00:00:00.000Z`)
						const dayName = dateObj.toLocaleDateString("en-US", {
							weekday: "short",
							month: "short",
							day: "numeric",
						})

						return (
							<div key={date} style={{ marginBottom: "1.5em" }}>
								<h2
									style={{
										fontSize: "1.1em",
										fontWeight: "600",
										paddingBottom: "0.5em",
										borderBottom: "2px solid #007bff",
										marginBottom: "1em",
									}}
								>
									{dayName}
								</h2>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "0.75em",
									}}
								>
									{dayBookings.map((booking) => (
										<article
											className="manage-store"
											key={booking.id}
											style={{
												padding: "1em",
												border: "1px solid #ddd",
												borderRadius: "0.25em",
											}}
										>
											<div>
												<p className="eyebrow">{booking.timeLabel}</p>
												<h3 style={{ margin: "0.25em 0" }}>
													{booking.serviceName}
												</h3>
												<p style={{ fontSize: "0.9em", color: "#666" }}>
													{booking.firstName} {booking.lastName}
												</p>
											</div>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: "0.5em",
												}}
											>
												<span
													style={{
														padding: "0.25em 0.5em",
														borderRadius: "0.25em",
														fontSize: "0.85em",
														fontWeight: "500",
														background:
															booking.status === "CONFIRMED"
																? "#d4edda"
																: booking.status === "CANCELLED"
																	? "#f8d7da"
																	: "#e2e3e5",
														color:
															booking.status === "CONFIRMED"
																? "#155724"
																: booking.status === "CANCELLED"
																	? "#721c24"
																	: "#383d41",
													}}
												>
													{booking.status.toLowerCase()}
												</span>
											</div>
										</article>
									))}
								</div>
							</div>
						)
					})
				)}
			</section>

			<section
				style={{
					marginTop: "2em",
					padding: "1.5em",
					background: "#f8f9fa",
					borderRadius: "0.5em",
					fontSize: "0.9em",
					color: "#666",
				}}
			>
				<h3 style={{ marginBottom: "0.5em", color: "#333" }}>
					Schedule Summary
				</h3>
				<p>
					Total appointments: <strong>{bookings.length}</strong>
				</p>
				<p>
					Days scheduled: <strong>{sortedDates.length}</strong>
				</p>
				<p style={{ marginTop: "0.5em", fontSize: "0.85em" }}>
					Showing next 100 upcoming appointments.
				</p>
			</section>
		</main>
	)
}
