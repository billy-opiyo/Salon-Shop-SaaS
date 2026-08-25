import { z } from "zod"

export const contactRequestSchema = z.object({
	tenantSlug: z.string().trim().min(3).max(48),
	name: z.string().trim().min(2).max(160),
	email: z.string().trim().email().max(320),
	subject: z.string().trim().min(2).max(160),
	message: z.string().trim().min(2).max(5000),
	turnstileToken: z.string().trim().min(1).max(2048),
})

export type ContactRequestInput = z.infer<typeof contactRequestSchema>
