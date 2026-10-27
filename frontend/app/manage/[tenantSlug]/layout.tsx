import "../../../styles/salon-storefront.css"
import { auth } from "@/auth"
import { prisma } from "@backend/db/prisma"
import { MerchantWorkspaceNavigation } from "@/components/tenant/MerchantWorkspaceNavigation"
import { PlatformMobileActions } from "@/components/shared/PlatformActionIcon"
import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"
import { platformThemeStyle } from "@/lib/platformTheme"

export default function TenantAdminLayout({
	children,
	params,
	}: Readonly<{
		children: React.ReactNode
		params: Promise<{ tenantSlug: string }>
	}>) {
	return <TenantAdminLayoutContent params={params}>{children}</TenantAdminLayoutContent>
}

async function TenantAdminLayoutContent({
	children,
	params,
}: {
	readonly children: React.ReactNode
	readonly params: Promise<{ tenantSlug: string }>
}) {
	const { tenantSlug } = await params
	const session = await auth()
	const membership = session?.user?.id
		? await prisma.membership.findFirst({
				where: {
					userId: session.user.id,
					status: "ACTIVE",
					tenant: { slug: tenantSlug.trim().toLowerCase() },
				},
				select: {
					role: true,
					canManageBookings: true,
					canManageContent: true,
					canManageAdmins: true,
					canManageSecurity: true,
					canManageBilling: true,
				},
			})
		: null
	const isOwner = membership?.role === "OWNER"
	const access = membership
		? {
				isOwner,
				canManageBookings: isOwner || membership.canManageBookings,
				canManageContent: isOwner || membership.canManageContent,
				canManageAdmins: isOwner || membership.canManageAdmins,
				canManageSecurity: isOwner || membership.canManageSecurity,
				canManageBilling: membership.role === "ADMIN" && membership.canManageBilling,
			}
		: null
	const design = await getPlatformStorefrontDesign()

	return (
		<div
			className="platform-site platform-site--with-mobile-actions merchant-workspace-shell"
			style={platformThemeStyle(design.theme)}
		>
			<MerchantWorkspaceNavigation tenantSlug={tenantSlug.trim().toLowerCase()} access={access} />
			{children}
			<PlatformMobileActions />
		</div>
	)
}
