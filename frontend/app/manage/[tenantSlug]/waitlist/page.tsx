import { redirect } from "next/navigation"

import { auth } from "@/auth"
import {
	MerchantWaitlistError,
	listWaitlistForUser,
} from "@backend/services/merchantWaitlistService"

import { updateWaitlistStatus } from "./actions"

interface WaitlistPageProps {
	readonly params: Promise<{ tenantSlug: string }>
}
const statuses = ["WAITING", "CONTACTED", "BOOKED", "CANCELLED"] as const

export default async function MerchantWaitlistPage({
	params,
}: WaitlistPageProps) {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const { tenantSlug } = await params
	let entries
	try {
		entries = await listWaitlistForUser(session.user.id, tenantSlug)
	} catch (error) {
		if (error instanceof MerchantWaitlistError)
			redirect(`/manage/${tenantSlug}`)
		throw error
	}
	const counts = Object.fromEntries(
		statuses.map((status) => [
			status,
			entries.filter((entry) => entry.status === status).length,
		]),
	)
	return (
		<main className="manage-page admin-bookings">
			<header className="manage-header admin-bookings-header">
				<div>
					<p className="eyebrow">Merchant workspace</p>
					<h1>Waitlist</h1>
					<p className="admin-bookings-header__description">
						Keep queue positions visible and contact clients when availability
						opens.
					</p>
				</div>
			</header>
			<section
				className="admin-booking-filter-controls"
				aria-label="Waitlist status totals"
			>
				{statuses.map((status) => (
					<div className="admin-booking-filter-btn active" key={status}>
						<strong>{counts[status]}</strong>
						<span>{status.toLowerCase()}</span>
					</div>
				))}
			</section>
			<section className="admin-bookings-list" aria-label="Waitlist entries">
				{entries.length === 0 ? (
					<p className="manage-empty">
						No clients are waiting for an appointment.
					</p>
				) : (
					entries.map((entry) => (
						<article className="admin-booking-item" key={entry.id}>
							<div className="admin-booking-item__details">
								<p className="eyebrow">
									Queue {entry.queuePosition} · {entry.status.toLowerCase()}
								</p>
								<h2>{entry.user?.name ?? entry.email}</h2>
								<p>
									{entry.serviceName}
									{entry.preferredDate
										? ` · ${entry.preferredDate.toISOString().slice(0, 10)}`
										: ""}
									{entry.preferredTime ? ` at ${entry.preferredTime}` : ""}
								</p>
								<p>
									{entry.email} · {entry.phone}
								</p>
							</div>
							<div className="admin-booking-actions">
								{entry.status === "WAITING" && (
									<form action={updateWaitlistStatus}>
										<input type="hidden" name="tenantSlug" value={tenantSlug} />
										<input type="hidden" name="entryId" value={entry.id} />
										<input type="hidden" name="status" value="CONTACTED" />
										<button className="admin-action-btn" type="submit">
											Mark Contacted
										</button>
									</form>
								)}
								{entry.status !== "CANCELLED" && (
									<form action={updateWaitlistStatus}>
										<input type="hidden" name="tenantSlug" value={tenantSlug} />
										<input type="hidden" name="entryId" value={entry.id} />
										<input type="hidden" name="status" value="CANCELLED" />
										<button className="admin-action-btn" type="submit">
											Cancel
										</button>
									</form>
								)}
							</div>
						</article>
					))
				)}
			</section>
		</main>
	)
}
