import { z } from "zod"

export const reviewRequestSchema = z.object({
	tenantSlug: z.string().trim().min(3).max(48),
	rating: z.number().int().min(1).max(5),
	serviceName: z.string().trim().max(160).optional(),
	text: z.string().trim().min(10).max(3000),
	turnstileToken: z.string().trim().min(1).max(2048),
})

export type ReviewRequestInput = z.infer<typeof reviewRequestSchema>

export const reviewEditSchema = reviewRequestSchema
	.omit({ turnstileToken: true })
	.extend({
		id: z.string().trim().cuid(),
	})

export const reviewReportSchema = z.object({
	tenantSlug: z.string().trim().min(3).max(48),
	id: z.string().trim().cuid(),
	reason: z.string().trim().min(2).max(500),
	turnstileToken: z.string().trim().min(1).max(2048),
})

export type ReviewEditInput = z.infer<typeof reviewEditSchema>
export type ReviewReportInput = z.infer<typeof reviewReportSchema>
