import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { getLoginUrlForPath } from "@shared/authCallback"
import { prisma } from "@backend/db/prisma"

interface AdminPageProps {
	readonly params: Promise<{ tenantSlug: string }>
}

export default async function TenantAdminPage({ params }: AdminPageProps) {
	const { tenantSlug } = await params
	const normalizedSlug = tenantSlug.trim().toLowerCase()
	const session = await auth()
	const userId = session?.user?.id
	if (!userId) redirect(getLoginUrlForPath(`/manage/${normalizedSlug}`))
	const tenant = await prisma.tenant.findUnique({
		where: { slug: normalizedSlug },
		select: {
			id: true,
			memberships: {
				where: { userId, status: "ACTIVE" },
				select: {
					role: true,
					canManageBookings: true,
					canManageContent: true,
					canManageAdmins: true,
					canManageSecurity: true,
					canManageBilling: true,
				},
			},
		},
	})
	const membership = tenant?.memberships[0]
	if (!tenant || !membership) redirect("/account")

	const canManageBookings = membership.role === "OWNER" || membership.canManageBookings
	const canManageContent = membership.role === "OWNER" || membership.canManageContent
	const canManageAdmins = membership.role === "OWNER" || membership.canManageAdmins
	const canManageSecurity = membership.role === "OWNER" || membership.canManageSecurity
	const destination = canManageBookings
		? "analytics"
		: canManageContent
			? "services"
			: canManageAdmins
				? "team"
				: canManageSecurity
					? "security"
					: (membership.role === "ADMIN" && membership.canManageBilling)
						? "billing"
						: null

	if (!destination) redirect("/account")
	redirect(`/manage/${encodeURIComponent(normalizedSlug)}/${destination}`)
}
