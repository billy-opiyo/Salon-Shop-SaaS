import { z } from "zod"

import { THEME_PRESET_OPTIONS } from "@shared/constants/themePresets"

const themePresetKeys = THEME_PRESET_OPTIONS.map((preset) => preset.key) as [
	string,
	...string[],
]

const imageUrlSchema = z.union([
	z.string().url(),
	z.string().regex(/^\/(?!\/).+$/, "Use a valid same-origin asset path."),
	z.literal(""),
])

const socialLinksSchema = z
	.object({
		instagram: z.string().url().or(z.literal("")),
		facebook: z.string().url().or(z.literal("")),
		twitter: z.string().url().or(z.literal("")),
		tiktok: z.string().url().or(z.literal("")),
		whatsapp: z.string().url().or(z.literal("")),
	})
	.partial()

const sectionCopySchema = z
	.object({
		gallerySubtitle: z.string().trim().max(80),
		galleryTitle: z.string().trim().max(120),
		galleryDescription: z.string().trim().max(400),
		servicesSubtitle: z.string().trim().max(80),
		servicesTitle: z.string().trim().max(120),
		servicesDescription: z.string().trim().max(400),
		bookingSubtitle: z.string().trim().max(80),
		bookingTitle: z.string().trim().max(120),
		bookingDescription: z.string().trim().max(400),
		testimonialsSubtitle: z.string().trim().max(80),
		testimonialsTitle: z.string().trim().max(120),
		testimonialsDescription: z.string().trim().max(400),
		blogSubtitle: z.string().trim().max(100),
		blogTitle: z.string().trim().max(120),
		blogDescription: z.string().trim().max(500),
		visitSubtitle: z.string().trim().max(80),
		visitTitle: z.string().trim().max(120),
		visitDescription: z.string().trim().max(400),
		contactTitle: z.string().trim().max(120),
		contactDescription: z.string().trim().max(400),
		footerDescription: z.string().trim().max(300),
		craftedBy: z.string().trim().max(160),
		copyright: z.string().trim().max(200),
	})
	.partial()

const sectionVisibilitySchema = z
	.object({
		gallery: z.boolean(),
		services: z.boolean(),
		booking: z.boolean(),
		testimonials: z.boolean(),
		blog: z.boolean(),
		visit: z.boolean(),
		contact: z.boolean(),
	})
	.partial()

export const storefrontDesignConfigSchema = z.object({
	heroDescription: z.string().trim().max(600).optional(),
	sectionCopy: sectionCopySchema.optional(),
	sectionVisibility: sectionVisibilitySchema.optional(),
	mapEmbedUrl: z.string().url().or(z.literal("")).optional(),
})

export const storefrontDesignUpdateSchema = z.object({
	themePreset: z.enum(themePresetKeys).optional(),
	themeMode: z.enum(["dark", "light"]).optional(),
	logoUrl: imageUrlSchema.optional(),
	heroImageUrl: imageUrlSchema.optional(),
	heroTitle: z.string().trim().max(140).optional(),
	heroSubtitle: z.string().trim().max(160).optional(),
	phonePrimary: z.string().trim().max(40).optional(),
	phoneSecondary: z.string().trim().max(40).optional(),
	whatsappUrl: z.union([z.string().url(), z.literal("")]).optional(),
	emailPrimary: z.union([z.string().email(), z.literal("")]).optional(),
	emailBookings: z.union([z.string().email(), z.literal("")]).optional(),
	address: z.string().trim().max(500).optional(),
	storefrontConfig: storefrontDesignConfigSchema.optional(),
	openingHours: z
		.object({
			weekday: z.string().trim().max(120).optional(),
			saturday: z.string().trim().max(120).optional(),
			sunday: z.string().trim().max(120).optional(),
			publicHoliday: z.string().trim().max(120).optional(),
		})
		.optional(),
	socialLinks: socialLinksSchema.optional(),
})

export const tenantSettingsSchema = z.object({
	themePreset: z.enum(themePresetKeys),
	themeMode: z.enum(["dark", "light"]),
	logoUrl: imageUrlSchema,
	heroImageUrl: imageUrlSchema,
	heroTitle: z.string().trim().max(140),
	heroSubtitle: z.string().trim().max(160),
	phonePrimary: z.string().trim().max(40),
	phoneSecondary: z.string().trim().max(40),
	whatsappUrl: z.union([z.string().url(), z.literal("")]),
	emailPrimary: z.union([z.string().email(), z.literal("")]),
	emailBookings: z.union([z.string().email(), z.literal("")]),
	address: z.string().trim().max(500),
	storefrontConfig: storefrontDesignConfigSchema.optional(),
})

export type TenantSettingsInput = z.infer<typeof tenantSettingsSchema>
export type StorefrontDesignUpdate = z.infer<typeof storefrontDesignUpdateSchema>
