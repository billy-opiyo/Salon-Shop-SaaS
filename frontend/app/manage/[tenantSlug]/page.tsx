import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { SalonAdminRuntime } from "@/components/tenant/SalonAdminRuntime"
import { getLoginUrlForPath } from "@shared/authCallback"
import { prisma } from "@backend/db/prisma"
import {
	getMerchantAdminSnapshot,
	MerchantAdminSnapshotError,
} from "@backend/services/merchantAdminSnapshotService"

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
		select: { id: true, status: true },
	})
	if (!tenant) redirect("/manage")

	try {
		await getMerchantAdminSnapshot(userId, normalizedSlug)
	} catch (error) {
		if (error instanceof MerchantAdminSnapshotError) redirect("/manage")
		throw error
	}

	return <SalonAdminRuntime tenantSlug={normalizedSlug} />
}
