import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { prisma } from "@backend/db/prisma"
import { getReferencePageMarkup } from "@backend/services/referenceMarkup"
import { getTenantStorefront } from "@backend/services/tenantDirectory"
import { ReferenceSalonRuntime } from "@/components/reference/ReferenceSalonRuntime"

interface AdminPageProps {
	readonly params: Promise<{ tenantSlug: string }>
}

export default async function TenantAdminPage({ params }: AdminPageProps) {
	const session = await auth()
	const userId = session?.user?.id
	if (!userId) redirect("/login")

	const { tenantSlug } = await params
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: { id: true },
	})
	if (!tenant) redirect("/manage")

	const membership = await prisma.membership.findUnique({
		where: { tenantId_userId: { tenantId: tenant.id, userId } },
		select: {
			status: true,
			canManageAdmins: true,
			canManageBookings: true,
			canManageContent: true,
			canManageSecurity: true,
		},
	})
	const hasAdminAccess =
		membership?.status === "ACTIVE" &&
		(membership.canManageAdmins ||
			membership.canManageBookings ||
			membership.canManageContent ||
			membership.canManageSecurity)
	if (!hasAdminAccess) redirect("/manage")

	const page = await getReferencePageMarkup("admin.html")

	return (
		<ReferenceSalonRuntime
			markup={page.html}
			bodyClassName={page.bodyClassName}
			headStyles={page.headStyles}
			clientConfig={{}}
			runtimeKind="admin"
		/>
	)
}
