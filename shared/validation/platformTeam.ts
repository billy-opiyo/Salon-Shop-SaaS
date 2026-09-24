import { z } from "zod"

const optionalUrl = z
	.string()
	.trim()
	.max(2000)
	.refine((value) => {
		if (!value) return true
		try {
			return new URL(value).protocol === "https:"
		} catch {
			return false
		}
	}, "Use a valid HTTPS URL.")

export const platformTeamMemberSchema = z.object({
	name: z.string().trim().min(2).max(120),
	role: z.string().trim().min(2).max(120),
	bio: z.string().trim().min(10).max(2000),
	avatarUrl: optionalUrl.default(""),
	avatarObjectKey: z.string().trim().max(500).default(""),
	websiteUrl: optionalUrl,
	instagramUrl: optionalUrl,
	facebookUrl: optionalUrl,
	linkedinUrl: optionalUrl,
	xUrl: optionalUrl,
	displayOrder: z.number().int().min(0).max(9999),
	published: z.boolean(),
})

export type PlatformTeamMemberInput = z.infer<typeof platformTeamMemberSchema>
