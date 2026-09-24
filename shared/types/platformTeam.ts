export interface PlatformTeamMemberView {
	readonly id: string
	readonly name: string
	readonly role: string
	readonly bio: string
	readonly avatarUrl: string | null
	readonly websiteUrl: string | null
	readonly instagramUrl: string | null
	readonly facebookUrl: string | null
	readonly linkedinUrl: string | null
	readonly xUrl: string | null
	readonly displayOrder: number
	readonly published: boolean
}
