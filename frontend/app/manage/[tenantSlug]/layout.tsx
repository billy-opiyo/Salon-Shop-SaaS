import "../../../styles/salon-storefront.css"
import { Suspense } from "react"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@backend/db/prisma"
import { MerchantWorkspaceNavigation } from "@/components/tenant/MerchantWorkspaceNavigation"
import { salonThemeStyle } from "@/lib/salonTheme"
import { DEFAULT_THEME_PRESET, isThemePreset } from "@shared/constants/themePresets"

export default function TenantAdminLayout({
	children,
	params,
	}: Readonly<{
		children: React.ReactNode
		params: Promise<{ tenantSlug: string }>
	}>) {
	return (
		<Suspense fallback={<TenantAdminLoadingShell />}>
			<TenantAdminLayoutContent params={params}>{children}</TenantAdminLayoutContent>
		</Suspense>
	)
}

function TenantAdminLoadingShell() {
	return (
		<div className="platform-site merchant-workspace-shell" aria-busy="true">
			<header className="admin-bookings-header merchant-admin-console-banner">
				<div className="admin-console-heading">
					<div className="section-subtitle">Salon Admin</div>
					<h1 className="section-title">Salon admin</h1>
				</div>
			</header>
			<div className="admin-panel merchant-workspace-panel merchant-workspace-loading">
				<p role="status">Loading the selected salon admin page…</p>
			</div>
		</div>
	)
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
					tenant: { select: { settings: { select: { themePreset: true } } } },
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
	const savedThemePreset = membership?.tenant.settings?.themePreset
	const themePreset =
		savedThemePreset && isThemePreset(savedThemePreset)
			? savedThemePreset
			: DEFAULT_THEME_PRESET

	return (
		<div
			className="platform-site merchant-workspace-shell"
			data-theme-preset={themePreset}
			style={salonThemeStyle(themePreset)}
		>
			<header className="admin-bookings-header merchant-admin-console-banner">
				<div className="admin-console-heading">
					<div className="section-subtitle">Admin Console</div>
					<h1 className="section-title">Salon admin workspace</h1>
				</div>
				<p className="section-desc">
					Manage salon operations, storefront content, and settings. Available
					sections are tailored to your role.
				</p>
				<p className="merchant-admin-console-home">
					<Link
						className="btn btn-outline"
						href={`/${tenantSlug.trim().toLowerCase()}#home`}
					>
						← Back to Homepage
					</Link>
				</p>
			</header>
			{session?.user && (
				<div className="admin-auth-card merchant-admin-session">
					<div className="admin-auth-actions">
						<div className="admin-user-state">
							Logged in as {session.user.email ?? "your account"}
							{membership?.role
								? ` (${membership.role.replace(/_/g, " ")})`
								: ""}
						</div>
					</div>
					<p className="admin-auth-tip">
						Only authorized salon accounts can access this panel.
					</p>
				</div>
			)}
			<div className="admin-panel merchant-workspace-panel">
				<MerchantWorkspaceNavigation
					tenantSlug={tenantSlug.trim().toLowerCase()}
					access={access}
					placement="layout"
				/>
				{children}
			</div>
		</div>
	)
}
