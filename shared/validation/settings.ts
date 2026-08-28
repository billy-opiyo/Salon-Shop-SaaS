import { z } from "zod"

export const tenantSettingsSchema = z.object({
	themePreset: z.string().trim().min(1).max(40),
	themeMode: z.enum(["dark", "light"]),
	logoUrl: z.union([z.string().url(), z.literal("")]),
	heroImageUrl: z.union([z.string().url(), z.literal("")]),
	heroTitle: z.string().trim().max(140),
	heroSubtitle: z.string().trim().max(160),
	phonePrimary: z.string().trim().max(40),
	phoneSecondary: z.string().trim().max(40),
	whatsappUrl: z.union([z.string().url(), z.literal("")]),
	emailPrimary: z.union([z.string().email(), z.literal("")]),
	emailBookings: z.union([z.string().email(), z.literal("")]),
	address: z.string().trim().max(500),
})

export type TenantSettingsInput = z.infer<typeof tenantSettingsSchema>
