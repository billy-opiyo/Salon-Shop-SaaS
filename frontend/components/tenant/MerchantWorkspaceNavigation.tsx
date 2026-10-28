"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

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
	const searchParams = useSearchParams()
	const basePath = `/manage/${tenantSlug}`
	if (!access) return null

	const links = [
		{ label: "Bookings", href: `${basePath}?section=bookings`, section: "bookings", visible: access.canManageBookings },
		{ label: "Waitlist", href: `${basePath}?section=waitlist`, section: "waitlist", visible: access.canManageBookings },
		{ label: "Schedule", href: `${basePath}?section=schedule`, section: "schedule", visible: access.canManageBookings },
		{ label: "Gallery", href: `${basePath}?section=gallery`, section: "gallery", visible: access.canManageContent },
		{ label: "Blog", href: `${basePath}?section=blogs`, section: "blogs", visible: access.canManageContent },
		{ label: "Reviews", href: `${basePath}?section=reviews`, section: "reviews", visible: access.canManageContent },
		{ label: "Messages", href: `${basePath}?section=messages`, section: "messages", visible: access.canManageContent },
		{ label: "Services", href: `${basePath}?section=services`, section: "services", visible: access.canManageContent },
		{ label: "Staff", href: `${basePath}/staff`, visible: access.canManageContent },
		{ label: "Analytics", href: `${basePath}/analytics`, visible: access.canManageBookings },
		{ label: "Salon Design", href: `${basePath}?section=design`, section: "design", visible: access.canManageContent },
		{ label: "Preview", href: `${basePath}/preview`, visible: access.canManageContent },
		{ label: "Admins", href: `${basePath}?section=admins`, section: "admins", visible: access.canManageAdmins },
		{ label: "Team", href: `${basePath}/team`, visible: access.canManageAdmins },
		{ label: "Domains", href: `${basePath}/domains`, visible: access.canManageSecurity },
		{ label: "Security", href: `${basePath}?section=security`, section: "security", visible: access.canManageSecurity },
		{ label: "Billing", href: `${basePath}/billing`, visible: access.canManageBilling || access.isOwner },
	]
	const defaultSection = access.canManageBookings
		? "bookings"
		: access.canManageContent
			? "gallery"
			: access.canManageAdmins
				? "admins"
				: "security"
	const activeSection =
		links.find((link) => link.visible && link.section === searchParams.get("section"))?.section ??
		defaultSection

	return (
		<nav
			className="merchant-workspace-navigation admin-section-tabs"
			aria-label="Salon workspace pages"
		>
			{links.filter((link) => link.visible).map((link) => {
				const normalizedPath = pathname.replace(/\/$/, "")
				const isActive = link.section
					? normalizedPath === basePath && activeSection === link.section
					: normalizedPath === link.href.replace(/\/$/, "")
				return (
				<Link
					key={link.href}
					className={`admin-section-tab${isActive ? " active" : ""}`}
					href={link.href}
					aria-current={isActive ? "page" : undefined}
				>
					{link.label}
				</Link>
				)
			})}
		</nav>
	)
}
