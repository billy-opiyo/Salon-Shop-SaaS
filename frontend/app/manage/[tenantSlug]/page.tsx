import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { getLoginUrlForPath } from "@shared/authCallback"
import { prisma } from "@backend/db/prisma"
import { SalonAdminRuntime } from "@/components/tenant/SalonAdminRuntime"
import type { SalonAdminSection } from "@/components/tenant/SalonAdminMarkup"

interface AdminPageProps {
	readonly params: Promise<{ tenantSlug: string }>
	readonly searchParams: Promise<{ section?: string | string[] }>
}

const sectionOrder: readonly SalonAdminSection[] = [
	"bookings",
	"waitlist",
	"schedule",
	"gallery",
	"blogs",
	"reviews",
	"messages",
	"services",
	"admins",
	"security",
	"design",
]

export default async function TenantAdminPage({
	params,
	searchParams,
}: AdminPageProps) {
	const { tenantSlug } = await params
	const normalizedSlug = tenantSlug.trim().toLowerCase()
	const session = await auth()
	const userId = session?.user?.id ?? ""
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
				},
			},
		},
	})
	const membership = tenant?.memberships[0]
	if (!tenant || !membership) redirect("/account")

	const isOwner = membership.role === "OWNER"
	const canManageBookings = isOwner || membership.canManageBookings
	const canManageContent = isOwner || membership.canManageContent
	const allowedSections = sectionOrder.filter((section) => {
		if (section === "bookings" || section === "waitlist" || section === "schedule")
			return canManageBookings
		if (section === "admins") return isOwner || membership.canManageAdmins
		if (section === "security") return isOwner || membership.canManageSecurity
		return canManageContent
	})
	if (allowedSections.length === 0) redirect("/account")

	const query = await searchParams
	const requestedSection = Array.isArray(query.section)
		? query.section[0]
		: query.section
	const initialSection = allowedSections.includes(requestedSection as SalonAdminSection)
		? (requestedSection as SalonAdminSection)
		: (allowedSections[0] ?? "bookings")

	return (
		<SalonAdminRuntime
			tenantSlug={normalizedSlug}
			userEmail={session?.user?.email ?? "your account"}
			initialSection={initialSection}
			allowedSections={allowedSections}
		/>
	)
}
