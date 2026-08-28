import "server-only"

import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
} from "@backend/services/authorization"
import { tenantSettingsSchema } from "@shared/validation/settings"

export class TenantSettingsError extends Error {
	readonly code = "TENANT_SETTINGS_ERROR" as const
}

async function tenantContext(userId: string, tenantSlug: string) {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: {
			id: true,
			slug: true,
			businessName: true,
			settings: true,
			memberships: {
				where: { userId, status: "ACTIVE" },
				select: {
					tenantId: true,
					userId: true,
					role: true,
					status: true,
					canManageContent: true,
					canManageAdmins: true,
					canManageBookings: true,
					canManageSecurity: true,
				},
			},
		},
	})
	if (!tenant) throw new TenantSettingsError("Store not found.")
	const membership = assertTenantMembership(
		tenant.memberships[0] ?? null,
		tenant.id,
	)
	assertTenantPermission(membership, "canManageContent")
	return tenant
}

export async function getTenantSettingsForUser(
	userId: string,
	tenantSlug: string,
) {
	const tenant = await tenantContext(userId, tenantSlug)
	return {
		tenant: { slug: tenant.slug, businessName: tenant.businessName },
		settings: tenant.settings,
	}
}

export async function updateTenantSettingsForUser(
	userId: string,
	tenantSlug: string,
	rawInput: unknown,
) {
	const tenant = await tenantContext(userId, tenantSlug)
	const input = tenantSettingsSchema.parse(rawInput)
	return prisma.tenantSettings.upsert({
		where: { tenantId: tenant.id },
		create: {
			tenantId: tenant.id,
			...input,
			logoUrl: input.logoUrl || null,
			heroImageUrl: input.heroImageUrl || null,
			whatsappUrl: input.whatsappUrl || null,
			emailPrimary: input.emailPrimary || null,
			emailBookings: input.emailBookings || null,
		},
		update: {
			...input,
			logoUrl: input.logoUrl || null,
			heroImageUrl: input.heroImageUrl || null,
			whatsappUrl: input.whatsappUrl || null,
			emailPrimary: input.emailPrimary || null,
			emailBookings: input.emailBookings || null,
		},
	})
}
