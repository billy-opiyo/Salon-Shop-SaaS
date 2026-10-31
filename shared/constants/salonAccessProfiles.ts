export interface SalonSectionPermissions {
	readonly canManageBookings: boolean
	readonly canManageContent: boolean
	readonly canManageSecurity: boolean
}

export const SALON_ACCESS_PROFILES: readonly {
	readonly key: string
	readonly label: string
	readonly role: "STAFF" | "ADMIN"
	readonly description: string
	readonly permissions: SalonSectionPermissions
}[] = [
	{
		key: "staff",
		label: "Staff",
		role: "STAFF",
		description: "No Salon Admin sections",
		permissions: { canManageBookings: false, canManageContent: false, canManageSecurity: false },
	},
	{
		key: "booking_manager",
		label: "Booking Manager",
		role: "ADMIN",
		description: "Bookings, waitlist, schedule, and analytics",
		permissions: { canManageBookings: true, canManageContent: false, canManageSecurity: false },
	},
	{
		key: "storefront_editor",
		label: "Storefront Editor",
		role: "ADMIN",
		description: "Gallery, services, blog, reviews, client messages, and design",
		permissions: { canManageBookings: false, canManageContent: true, canManageSecurity: false },
	},
	{
		key: "security_manager",
		label: "Security Manager",
		role: "ADMIN",
		description: "Security monitoring and salon domains",
		permissions: { canManageBookings: false, canManageContent: false, canManageSecurity: true },
	},
	{
		key: "operations_manager",
		label: "Operations Manager",
		role: "ADMIN",
		description: "Booking operations and storefront content",
		permissions: { canManageBookings: true, canManageContent: true, canManageSecurity: false },
	},
	{
		key: "custom",
		label: "Custom access",
		role: "ADMIN",
		description: "Choose section access below",
		permissions: { canManageBookings: false, canManageContent: false, canManageSecurity: false },
	},
]

export function getSalonAccessProfile(key: string) {
	return SALON_ACCESS_PROFILES.find((profile) => profile.key === key) ?? SALON_ACCESS_PROFILES[0]
}

export function inferSalonAccessProfileLabel(
	role: string,
	value: unknown,
): string {
	if (role === "OWNER") return "Salon Owner · Super Admin"
	const permissions = value && typeof value === "object" && !Array.isArray(value)
		? value as Record<string, unknown>
		: {}
	if (
		role === "STAFF" &&
		permissions.canManageBookings !== true &&
		permissions.canManageContent !== true &&
		permissions.canManageSecurity !== true
	) return "Staff"
	const profile = SALON_ACCESS_PROFILES.find((candidate) =>
		candidate.key !== "custom" && candidate.key !== "staff" &&
		candidate.permissions.canManageBookings === (permissions.canManageBookings === true) &&
		candidate.permissions.canManageContent === (permissions.canManageContent === true) &&
		candidate.permissions.canManageSecurity === (permissions.canManageSecurity === true),
	)
	return profile?.label ?? "Custom access"
}
