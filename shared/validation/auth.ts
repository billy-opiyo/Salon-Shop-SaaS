import { z } from "zod"

export const credentialsSchema = z.object({
	email: z.string().trim().email().max(320),
	password: z.string().min(12).max(128),
})

export const signupSchema = credentialsSchema.extend({
	name: z.string().trim().min(2).max(120),
	turnstileToken: z.string().trim().min(1).max(2048),
})

export type SignupInput = z.infer<typeof signupSchema>

export const profileUpdateSchema = z.object({
	name: z.string().trim().min(2).max(120),
	phone: z.string().trim().min(7).max(32).optional(),
})

export const passwordChangeSchema = z.object({
	currentPassword: z.string().min(12).max(128),
	newPassword: z.string().min(12).max(128),
})

export const preferencesSchema = z.object({
	theme: z.enum(["dark", "light"]),
	fontSize: z.enum(["small", "medium", "large"]),
	highContrast: z.boolean(),
	reducedMotion: z.boolean(),
	notifyEmail: z.boolean(),
	notifySms: z.boolean(),
	notifyPush: z.boolean(),
})
