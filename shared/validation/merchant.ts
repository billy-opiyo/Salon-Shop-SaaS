import { z } from "zod"

export const bookingStatusSchema = z.enum([
	"PENDING",
	"CONFIRMED",
  "WAITLISTED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "NO_SHOW",
])

export const bookingStatusUpdateSchema = z.object({
	tenantSlug: z.string().trim().min(3).max(48),
	bookingId: z.string().trim().cuid(),
	status: bookingStatusSchema,
})

export type BookingStatusUpdateInput = z.infer<typeof bookingStatusUpdateSchema>

export const serviceMutationSchema = z.object({
	tenantSlug: z.string().trim().min(3).max(48),
	serviceId: z.string().trim().cuid().optional(),
	categoryId: z.string().trim().cuid(),
	name: z.string().trim().min(2).max(160),
	slug: z
		.string()
		.trim()
		.min(2)
		.max(160)
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
	description: z.string().trim().min(2).max(3000),
	priceLabel: z.string().trim().min(1).max(120),
	priceMinor: z.preprocess(
		(value) => (value === "" || value === null || value === undefined ? undefined : value),
		z.coerce.number().int().min(0).max(10_000_000).optional(),
	),
	durationLabel: z.string().trim().min(1).max(80),
	orderOnly: z.boolean(),
})

export type ServiceMutationInput = z.infer<typeof serviceMutationSchema>

export const servicePriceUpdateSchema = z.object({
	tenantSlug: z.string().trim().min(3).max(48),
	serviceId: z.string().trim().cuid(),
	priceMinor: z.coerce.number().int().min(0).max(10_000_000),
})

export type ServicePriceUpdateInput = z.infer<typeof servicePriceUpdateSchema>

export const galleryMutationSchema = z.object({
	tenantSlug: z.string().trim().min(3).max(48),
	categoryKey: z.string().trim().max(80).optional(),
	styleName: z.string().trim().min(2).max(160),
	imageUrl: z.string().trim().url().max(2000),
	beforeImageUrl: z
		.string()
		.trim()
		.url()
		.max(2000)
		.optional()
		.or(z.literal("")),
	styleType: z.string().trim().max(120).optional(),
	description: z.string().trim().max(5000).optional(),
	serviceName: z.string().trim().max(160).optional(),
	length: z.string().trim().max(80).optional(),
	size: z.string().trim().max(80).optional(),
	hairType: z.string().trim().max(120).optional(),
	productBrand: z.string().trim().max(160).optional(),
	productSize: z.string().trim().max(80).optional(),
	productDescription: z.string().trim().max(5000).optional(),
	hairServiceType: z.string().trim().max(160).optional(),
	hairTechnique: z.string().trim().max(160).optional(),
	hairLengthDensity: z.string().trim().max(160).optional(),
	hairProductsUsed: z.string().trim().max(5000).optional(),
	stylistName: z.string().trim().max(160).optional(),
	timeTaken: z.string().trim().max(80).optional(),
	priceRange: z.string().trim().max(120).optional(),
	featuredTrending: z.boolean().optional(),
	featuredMostBooked: z.boolean().optional(),
	published: z.boolean(),
})

export type GalleryMutationInput = z.infer<typeof galleryMutationSchema>

export const blogMutationSchema = z.object({
	tenantSlug: z.string().trim().min(3).max(48),
	title: z.string().trim().min(2).max(200),
	slug: z
		.string()
		.trim()
		.min(2)
		.max(200)
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
	excerpt: z.string().trim().min(2).max(5000),
	imageUrl: z.string().trim().url().max(2000).optional().or(z.literal("")),
	readTime: z.string().trim().max(80).optional(),
	publishDate: z.string().date(),
	readMoreUrl: z.string().trim().url().max(2000).optional().or(z.literal("")),
	published: z.boolean(),
})

export type BlogMutationInput = z.infer<typeof blogMutationSchema>
