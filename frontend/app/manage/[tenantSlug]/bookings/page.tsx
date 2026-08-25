import { redirect } from "next/navigation"

import { auth } from "@/auth"
import {
	MerchantBookingError,
	listBookingsForUser,
} from "@backend/services/merchantBookingService"

import { updateBookingStatus } from "./actions"

interface BookingsPageProps {
	readonly params: Promise<{ tenantSlug: string }>
}

const statuses = [
	"PENDING",
	"CONFIRMED",
	"WAITLISTED",
	"COMPLETED",
	"CANCELLED",
] as const

function formatDate(value: Date): string {
	return value.toISOString().slice(0, 10)
}

function nextStatuses(
	status: (typeof statuses)[number],
): readonly (typeof statuses)[number][] {
	if (status === "PENDING") return ["CONFIRMED", "WAITLISTED", "CANCELLED"]
	if (status === "CONFIRMED") return ["COMPLETED", "CANCELLED"]
	if (status === "WAITLISTED") return ["CONFIRMED", "CANCELLED"]
	return []
}

export default async function MerchantBookingsPage({
	params,
}: BookingsPageProps) {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const { tenantSlug } = await params

	let bookings
	try {
		bookings = await listBookingsForUser(session.user.id, tenantSlug)
	} catch (error) {
		if (error instanceof MerchantBookingError) redirect(`/manage/${tenantSlug}`)
		throw error
	}

	const counts = Object.fromEntries(
		statuses.map((status) => [
			status,
			bookings.filter((booking) => booking.status === status).length,
		]),
	)

	return (
		<main className="manage-page admin-bookings">
			<header className="manage-header admin-bookings-header">
				<div>
					<p className="eyebrow">Merchant workspace</p>
					<h1>Bookings</h1>
					<p className="admin-bookings-header__description">
						Review appointments and move them through the same lifecycle as the
						salon.
					</p>
				</div>
			</header>

			<section
				className="admin-booking-filter-controls"
				aria-label="Booking status totals"
			>
				{statuses.map((status) => (
					<div className="admin-booking-filter-btn active" key={status}>
						<strong>{counts[status]}</strong>
						<span>{status.toLowerCase()}</span>
					</div>
				))}
			</section>

			<section className="admin-bookings-list" aria-label="Bookings">
				{bookings.length === 0 ? (
					<p className="manage-empty">
						No bookings have been received for this store.
					</p>
				) : (
					bookings.map((booking) => {
						const bookingStatus = booking.status as (typeof statuses)[number]
						return (
							<article className="admin-booking-item" key={booking.id}>
								<div className="admin-booking-item__details">
									<p className="eyebrow">{bookingStatus.toLowerCase()}</p>
									<h2>
										{booking.firstName} {booking.lastName}
									</h2>
									<p>
										{booking.serviceName} ·{" "}
										{formatDate(booking.appointmentDate)} at {booking.timeLabel}
									</p>
									<p>
										{booking.email} · {booking.phone}
									</p>
									{booking.specialRequests && <p>{booking.specialRequests}</p>}
								</div>
								<div className="admin-booking-actions">
									{nextStatuses(bookingStatus).map((status) => (
										<form action={updateBookingStatus} key={status}>
											<input
												type="hidden"
												name="tenantSlug"
												value={tenantSlug}
											/>
											<input
												type="hidden"
												name="bookingId"
												value={booking.id}
											/>
											<input type="hidden" name="status" value={status} />
											<button className="admin-action-btn" type="submit">
												{status === "CANCELLED"
													? "Cancel + Release"
													: status === "CONFIRMED"
														? "Confirm"
														: status === "COMPLETED"
															? "Complete"
															: "Move to Waitlist"}
											</button>
										</form>
									))}
								</div>
							</article>
						)
					})
				)}
			</section>
		</main>
	)
}
