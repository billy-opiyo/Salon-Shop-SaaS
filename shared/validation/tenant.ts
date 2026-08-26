import { z } from "zod"

export const tenantSlugSchema = z
	.string()
	.trim()
	.toLowerCase()
	.min(3)
	.max(48)
	.regex(
		/^[a-z0-9]+(?:-[a-z0-9]+)*$/,
		"Use lowercase letters, numbers, and single hyphens.",
	)

export const createTenantSchema = z.object({
	businessName: z.string().trim().min(2).max(120),
	heroTitle: z.string().trim().min(2).max(140).optional(),
	heroSubtitle: z.string().trim().min(2).max(160).optional(),
	slug: tenantSlugSchema,
	planTier: z.enum(["starter", "business", "enterprise"]).default("starter"),
	country: z.string().trim().min(2).max(80).default("Kenya"),
	city: z.string().trim().max(80).optional(),
	timezone: z.string().trim().min(1).max(80).default("Africa/Nairobi"),
	locale: z.string().trim().min(2).max(20).default("en-KE"),
	currency: z.string().trim().length(3).toUpperCase().default("KES"),
	termsAccepted: z.literal(true),
	privacyAccepted: z.literal(true),
	cookiesAccepted: z.literal(true),
})

export type CreateTenantInput = z.infer<typeof createTenantSchema>
