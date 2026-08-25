import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
	listMessagesForUser,
	MerchantMessageError,
} from "@backend/services/merchantMessageService"
import { removeMessage, setMessageStatus } from "./actions"

interface MessagesPageProps {
	readonly params: Promise<{ tenantSlug: string }>
}
const statuses = ["NEW", "READ", "RESOLVED"] as const

export default async function MerchantMessagesPage({
	params,
}: MessagesPageProps) {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const { tenantSlug } = await params
	let messages
	try {
		messages = await listMessagesForUser(session.user.id, tenantSlug)
	} catch (error) {
		if (error instanceof MerchantMessageError) redirect(`/manage/${tenantSlug}`)
		throw error
	}
	const counts = Object.fromEntries(
		statuses.map((status) => [
			status,
			messages.filter((message) => message.status === status).length,
		]),
	)
	return (
		<main className="manage-page">
			<header className="manage-header">
				<div>
					<p className="eyebrow">Storefront management</p>
					<h1>Messages</h1>
					<p className="auth-card__intro">
						Review customer questions and keep the contact inbox moving toward
						resolution.
					</p>
				</div>
			</header>
			<section
				className="admin-booking-filter-controls"
				aria-label="Message status totals"
			>
				{statuses.map((status) => (
					<div className="admin-booking-filter-btn active" key={status}>
						<strong>{counts[status]}</strong>
						<span>{status.toLowerCase()}</span>
					</div>
				))}
			</section>
			<section className="manage-store-list" aria-label="Contact messages">
				{messages.length === 0 ? (
					<p className="manage-empty">
						No contact messages have been received.
					</p>
				) : (
					messages.map((message) => (
						<article className="manage-store" key={message.id}>
							<div>
								<p className="eyebrow">
									{message.status.toLowerCase()} ·{" "}
									{message.createdAt.toISOString().slice(0, 10)}
								</p>
								<h2>{message.subject}</h2>
								<p>
									{message.name} · {message.email}
								</p>
								<p>{message.message}</p>
							</div>
							<div className="manage-store__actions">
								{message.status === "NEW" && (
									<form action={setMessageStatus}>
										<input type="hidden" name="tenantSlug" value={tenantSlug} />
										<input type="hidden" name="messageId" value={message.id} />
										<input type="hidden" name="status" value="READ" />
										<button
											className="button button--outline button--small"
											type="submit"
										>
											Mark read
										</button>
									</form>
								)}
								{message.status !== "RESOLVED" && (
									<form action={setMessageStatus}>
										<input type="hidden" name="tenantSlug" value={tenantSlug} />
										<input type="hidden" name="messageId" value={message.id} />
										<input type="hidden" name="status" value="RESOLVED" />
										<button
											className="button button--outline button--small"
											type="submit"
										>
											Resolve
										</button>
									</form>
								)}
								<form action={removeMessage}>
									<input type="hidden" name="tenantSlug" value={tenantSlug} />
									<input type="hidden" name="messageId" value={message.id} />
									<button
										className="button button--outline button--small"
										type="submit"
									>
										Delete
									</button>
								</form>
							</div>
						</article>
					))
				)}
			</section>
		</main>
	)
}
