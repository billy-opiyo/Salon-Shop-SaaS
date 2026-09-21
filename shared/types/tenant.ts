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
	readonly beforeImageUrl?: string
	readonly title: string
	readonly category: string
	readonly tone: string
	readonly serviceName?: string
	readonly styleType?: string
	readonly length?: string
	readonly size?: string
	readonly hairType?: string
	readonly stylistName?: string
	readonly timeTaken?: string
	readonly priceRange?: string
	readonly featuredTrending?: boolean
	readonly featuredMostBooked?: boolean
	readonly createdAt?: string
	readonly updatedAt?: string
}

export interface TenantReview {
	readonly id?: string
	readonly author: string
	readonly rating: number
	readonly text: string
	readonly createdAt?: string
}

export interface TenantBlogPost {
	readonly id?: string
	readonly slug?: string
	readonly title: string
	readonly excerpt: string
	readonly category: string
	readonly imageUrl?: string
	readonly readTime?: string
	readonly publishDate?: string
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
	readonly heroTitle?: string
	readonly heroSubtitle?: string
	readonly services: readonly TenantService[]
	readonly gallery: readonly TenantGalleryItem[]
	readonly reviews: readonly TenantReview[]
	readonly blogPosts: readonly TenantBlogPost[]
}
