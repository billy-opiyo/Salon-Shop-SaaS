import { z } from "zod"

export const reviewRequestSchema = z.object({
	tenantSlug: z.string().trim().min(3).max(48),
	rating: z.number().int().min(1).max(5),
	serviceName: z.string().trim().max(160).optional(),
	text: z.string().trim().min(10).max(3000),
	turnstileToken: z.string().trim().min(1).max(2048),
})

export type ReviewRequestInput = z.infer<typeof reviewRequestSchema>
