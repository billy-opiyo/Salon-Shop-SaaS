import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
	listScheduleForUser,
	MerchantScheduleError,
} from "@backend/services/merchantScheduleService"

interface SchedulePageProps {
	readonly params: Promise<{ tenantSlug: string }>
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
				{bookings.length === 0 ? (
					<p className="manage-empty">
						No upcoming appointments are scheduled.
					</p>
				) : (
					bookings.map((booking) => (
						<article className="manage-store" key={booking.id}>
							<div>
								<p className="eyebrow">
									{booking.appointmentDate.toISOString().slice(0, 10)} ·{" "}
									{booking.timeLabel}
								</p>
								<h2>{booking.serviceName}</h2>
								<p>
									{booking.firstName} {booking.lastName} ·{" "}
									{booking.status.toLowerCase()}
								</p>
							</div>
						</article>
					))
				)}
			</section>
		</main>
	)
}
