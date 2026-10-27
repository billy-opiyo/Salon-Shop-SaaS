"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export interface MerchantWorkspaceNavigationAccess {
	readonly canManageBookings: boolean
	readonly canManageContent: boolean
	readonly canManageAdmins: boolean
	readonly canManageSecurity: boolean
	readonly canManageBilling: boolean
	readonly isOwner: boolean
}

export function MerchantWorkspaceNavigation({
	tenantSlug,
	access,
}: {
	readonly tenantSlug: string
	readonly access: MerchantWorkspaceNavigationAccess | null
}) {
	const pathname = usePathname()
	const basePath = `/manage/${tenantSlug}`
	if (!access || pathname.replace(/\/$/, "") === basePath) return null

	const links = [
		{ label: "Bookings", href: `${basePath}/bookings`, visible: access.canManageBookings },
		{ label: "Waitlist", href: `${basePath}/waitlist`, visible: access.canManageBookings },
		{ label: "Schedule", href: `${basePath}/schedule`, visible: access.canManageBookings },
		{ label: "Gallery", href: `${basePath}/gallery`, visible: access.canManageContent },
		{ label: "Blog", href: `${basePath}/blog`, visible: access.canManageContent },
		{ label: "Reviews", href: `${basePath}/reviews`, visible: access.canManageContent },
		{ label: "Messages", href: `${basePath}/messages`, visible: access.canManageContent },
		{ label: "Services", href: `${basePath}/services`, visible: access.canManageContent },
		{ label: "Staff", href: `${basePath}/staff`, visible: access.canManageContent },
		{ label: "Analytics", href: `${basePath}/analytics`, visible: access.canManageBookings },
		{ label: "Settings", href: `${basePath}/settings`, visible: access.canManageContent },
		{ label: "Preview", href: `${basePath}/preview`, visible: access.canManageContent },
		{ label: "Team", href: `${basePath}/team`, visible: access.canManageAdmins },
		{ label: "Domains", href: `${basePath}/domains`, visible: access.canManageSecurity },
		{ label: "Security", href: `${basePath}/security`, visible: access.canManageSecurity },
		{ label: "Billing", href: `${basePath}/billing`, visible: access.canManageBilling || access.isOwner },
		{ label: "My account", href: "/account", visible: true },
	]

	return (
		<nav className="merchant-workspace-navigation" aria-label="Salon workspace pages">
			{links.filter((link) => link.visible).map((link) => (
				<Link
					key={link.href}
					href={link.href}
					aria-current={pathname === link.href ? "page" : undefined}
				>
					{link.label}
				</Link>
			))}
		</nav>
	)
}
