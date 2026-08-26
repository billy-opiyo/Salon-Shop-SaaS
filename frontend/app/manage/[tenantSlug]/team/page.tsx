import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
	listTeamForUser,
	MerchantTeamError,
} from "@backend/services/merchantTeamService"
import { listTeamInvitationsForUser } from "@backend/services/teamInvitationService"
import { prisma } from "@backend/db/prisma"
import { TeamInvitationPanel } from "./TeamInvitationPanel"

interface TeamInvitationSummary {
	readonly id: string
	readonly inviteeEmail: string
	readonly role: string
	readonly status: string
	readonly expiresAt: Date
}

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
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: { id: true },
	})
	if (!tenant) redirect(`/manage`)
	let invitations: TeamInvitationSummary[] = []
	try {
		invitations = await listTeamInvitationsForUser(session.user.id, tenant.id)
	} catch {
		invitations = []
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
			<TeamInvitationPanel
				tenantSlug={tenantSlug}
				initialInvitations={invitations.map((invitation) => ({
					...invitation,
					expiresAt: invitation.expiresAt.toISOString(),
				}))}
			/>
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
