import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
	listTeamForUser,
	MerchantTeamError,
} from "@backend/services/merchantTeamService"

interface TeamPageProps {
	readonly params: Promise<{ tenantSlug: string }>
}

export default async function MerchantTeamPage({ params }: TeamPageProps) {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const { tenantSlug } = await params
	let members
	try {
		members = await listTeamForUser(session.user.id, tenantSlug)
	} catch (error) {
		if (error instanceof MerchantTeamError) redirect(`/manage/${tenantSlug}`)
		throw error
	}
	return (
		<main className="manage-page">
			<header className="manage-header">
				<div>
					<p className="eyebrow">Team management</p>
					<h1>Team</h1>
					<p className="auth-card__intro">
						Review active membership, roles, and section permissions for this
						salon workspace.
					</p>
				</div>
			</header>
			<section className="manage-store-list" aria-label="Team members">
				{members.map((member) => (
					<article className="manage-store" key={member.id}>
						<div>
							<p className="eyebrow">
								{member.status.toLowerCase()} · {member.role.toLowerCase()}
							</p>
							<h2>{member.user.name ?? member.user.email}</h2>
							<p>{member.user.email}</p>
							<p>
								{[
									member.canManageBookings && "Bookings",
									member.canManageContent && "Content",
									member.canManageAdmins && "Admins",
									member.canManageSecurity && "Security",
								]
									.filter(Boolean)
									.join(" · ") || "No delegated permissions"}
							</p>
						</div>
					</article>
				))}
			</section>
		</main>
	)
}
