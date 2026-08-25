export type PlanTier = "starter" | "business" | "enterprise"

export interface TenantTheme {
	readonly preset: string
	readonly mode: "light" | "dark"
	readonly primaryColor: string
}

export interface TenantActionLinks {
	readonly bookingPath: string
	readonly whatsappUrl: string
	readonly phoneUrl: string
	readonly directionsUrl: string
}

export interface TenantContactDetails {
	readonly phonePrimary?: string
	readonly phoneSecondary?: string
	readonly emailPrimary?: string
	readonly emailBookings?: string
	readonly address?: string
}

export interface TenantService {
	readonly id?: string
	readonly name: string
	readonly description: string
	readonly durationMinutes: number
	readonly priceLabel: string
	readonly category: string
	readonly isCosmeticProduct?: boolean
}

export interface TenantGalleryItem {
	readonly id?: string
	readonly imageUrl?: string
	readonly title: string
	readonly category: string
	readonly tone: string
}

export interface TenantReview {
	readonly author: string
	readonly rating: number
	readonly text: string
}

export interface TenantBlogPost {
	readonly slug?: string
	readonly title: string
	readonly excerpt: string
	readonly category: string
}

export interface TenantStorefront {
	readonly id: string
	readonly slug: string
	readonly businessName: string
	readonly shortDescription: string
	readonly locationLabel: string
	readonly planTier: PlanTier
	readonly theme: TenantTheme
	readonly actionLinks: TenantActionLinks
	readonly contact?: TenantContactDetails
	readonly logoUrl?: string
	readonly heroImageUrl?: string
	readonly services: readonly TenantService[]
	readonly gallery: readonly TenantGalleryItem[]
	readonly reviews: readonly TenantReview[]
	readonly blogPosts: readonly TenantBlogPost[]
}
