import "server-only"

import { Prisma } from "@prisma/client"
import { prisma } from "@backend/db/prisma"
import { requireTenantPermission } from "@backend/middleware/tenantAuthorization"
import {
	storefrontDesignUpdateSchema,
	tenantSettingsSchema,
	type StorefrontDesignUpdate,
} from "@shared/validation/settings"
import {
	DEFAULT_STOREFRONT_DESIGN,
	type StorefrontDesignConfig,
} from "@shared/constants/storefrontDesign"

export class TenantSettingsError extends Error {
	readonly code = "TENANT_SETTINGS_ERROR" as const
}

async function tenantContext(userId: string, tenantSlug: string) {
	try {
		return (
			await requireTenantPermission(userId, tenantSlug, "canManageContent")
		).tenant
	} catch (error) {
		if (error instanceof Error && error.message === "Store not found.") {
			throw new TenantSettingsError(error.message)
		}
		throw error
	}
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

function mergeStorefrontDesign(
	current: unknown,
	patch: StorefrontDesignUpdate["storefrontConfig"],
): StorefrontDesignConfig {
	const currentRecord =
		current && typeof current === "object"
			? (current as Partial<StorefrontDesignConfig>)
			: {}
	return {
		...DEFAULT_STOREFRONT_DESIGN,
		...currentRecord,
		...patch,
		sectionCopy: {
			...DEFAULT_STOREFRONT_DESIGN.sectionCopy,
			...(currentRecord.sectionCopy ?? {}),
			...(patch?.sectionCopy ?? {}),
		},
		sectionVisibility: {
			...DEFAULT_STOREFRONT_DESIGN.sectionVisibility,
			...(currentRecord.sectionVisibility ?? {}),
			...(patch?.sectionVisibility ?? {}),
		},
	}
}

export async function updateTenantDesignForUser(
	userId: string,
	tenantSlug: string,
	rawInput: unknown,
) {
	const tenant = await tenantContext(userId, tenantSlug)
	const input = storefrontDesignUpdateSchema.parse(rawInput)
	const design = mergeStorefrontDesign(
		tenant.settings?.storefrontConfig,
		input.storefrontConfig,
	)
	const currentOpeningHours =
		tenant.settings?.openingHours &&
		typeof tenant.settings.openingHours === "object"
			? (tenant.settings.openingHours as Record<string, unknown>)
			: {}
	const currentSocialLinks =
		tenant.settings?.socialLinks &&
		typeof tenant.settings.socialLinks === "object"
			? (tenant.settings.socialLinks as Record<string, unknown>)
			: {}

	return prisma.tenantSettings.upsert({
		where: { tenantId: tenant.id },
		create: {
			tenantId: tenant.id,
			themePreset: input.themePreset ?? "gold",
			themeMode: input.themeMode ?? "dark",
			logoUrl: input.logoUrl || null,
			heroImageUrl: input.heroImageUrl || null,
			heroTitle: input.heroTitle || null,
			heroSubtitle: input.heroSubtitle || null,
			phonePrimary: input.phonePrimary || null,
			phoneSecondary: input.phoneSecondary || null,
			whatsappUrl: input.whatsappUrl || null,
			emailPrimary: input.emailPrimary || null,
			emailBookings: input.emailBookings || null,
			address: input.address || null,
			storefrontConfig: design as unknown as Prisma.InputJsonValue,
			openingHours: {
				...currentOpeningHours,
				...(input.openingHours ?? {}),
			} as Prisma.InputJsonValue,
			socialLinks: {
				...currentSocialLinks,
				...(input.socialLinks ?? {}),
			} as Prisma.InputJsonValue,
		},
		update: {
			...(input.themePreset ? { themePreset: input.themePreset } : {}),
			...(input.themeMode ? { themeMode: input.themeMode } : {}),
			...(input.logoUrl !== undefined
				? { logoUrl: input.logoUrl || null }
				: {}),
			...(input.heroImageUrl !== undefined
				? { heroImageUrl: input.heroImageUrl || null }
				: {}),
			...(input.heroTitle !== undefined
				? { heroTitle: input.heroTitle || null }
				: {}),
			...(input.heroSubtitle !== undefined
				? { heroSubtitle: input.heroSubtitle || null }
				: {}),
			...(input.phonePrimary !== undefined
				? { phonePrimary: input.phonePrimary || null }
				: {}),
			...(input.phoneSecondary !== undefined
				? { phoneSecondary: input.phoneSecondary || null }
				: {}),
			...(input.whatsappUrl !== undefined
				? { whatsappUrl: input.whatsappUrl || null }
				: {}),
			...(input.emailPrimary !== undefined
				? { emailPrimary: input.emailPrimary || null }
				: {}),
			...(input.emailBookings !== undefined
				? { emailBookings: input.emailBookings || null }
				: {}),
			...(input.address !== undefined
				? { address: input.address || null }
				: {}),
			storefrontConfig: design as unknown as Prisma.InputJsonValue,
			...(input.openingHours
				? {
						openingHours: {
							...currentOpeningHours,
							...input.openingHours,
						} as Prisma.InputJsonValue,
				  }
				: {}),
			...(input.socialLinks
				? {
						socialLinks: {
							...currentSocialLinks,
							...input.socialLinks,
						} as Prisma.InputJsonValue,
				  }
				: {}),
		},
	})
}
