import "server-only"

import { prisma } from "@backend/db/prisma"
import { resolveTenantSlugByHost } from "@backend/services/tenantDomainService"
import type { TenantStorefront } from "@shared/types/tenant"
import {
	DEFAULT_STOREFRONT_DESIGN,
	type StorefrontDesignConfig,
} from "@shared/constants/storefrontDesign"
import {
	DEFAULT_SALON_BLOGS,
	DEFAULT_SALON_GALLERY,
	DEFAULT_SALON_REVIEWS,
	DEFAULT_SALON_SERVICES,
} from "@shared/constants/legacySalonCatalog"

const ROYAL_BRAIDS_HERO_SUBTITLE = "Premium African Hair Braiding & Beauty"
const ROYAL_BRAIDS_HERO_TITLE =
	"Celebrate Your Crown with <span>Beautiful Braids</span>"
const ROYAL_BRAIDS_HERO_DESCRIPTION =
	"From signature braids, hair services and flawless twists to glowing beauty spa rituals, precision nails, radiant makeup, barber grooming, eyebrows & lash enhancements, and bridal-ready glam—step into a full beauty experience crafted to make you shine."

const fixtureTenant: TenantStorefront = {
	id: "tenant_fixture_royal_braids",
	slug: "royal-braids",
	businessName: "Royal Braids",
	shortDescription: ROYAL_BRAIDS_HERO_DESCRIPTION,
	heroTitle: ROYAL_BRAIDS_HERO_TITLE,
	heroSubtitle: ROYAL_BRAIDS_HERO_SUBTITLE,
	locationLabel: "Nairobi, Kenya",
	planTier: "business",
	theme: {
		preset: "gold",
		mode: "dark",
		primaryColor: "#d7a84f",
	},
	actionLinks: {
		bookingPath: "#booking",
		whatsappUrl: "https://wa.me/254740470381",
		phoneUrl: "tel:+254740470381",
		directionsUrl: "#visit",
	},
	contact: {
		phonePrimary: "+254740470381",
		emailPrimary: "info@royalbraids.ke",
		emailBookings: "bookings@royalbraids.ke",
		address:
			"Westlands Shopping Centre, 2nd Floor<br />Waiyaki Way, Nairobi, Kenya",
	},
	services: DEFAULT_SALON_SERVICES.map((service) => ({
		name: service.name,
		description: service.description,
		durationMinutes: Number.parseInt(service.durationLabel, 10) || 0,
		durationLabel: service.durationLabel,
		priceLabel: service.priceLabel,
		priceMinor: service.priceMinor ?? undefined,
		category: service.categoryKey,
		isCosmeticProduct: service.orderOnly,
	})),
	gallery: DEFAULT_SALON_GALLERY.map((item, index) => ({
		title: item.title,
		category: item.serviceCategory,
		tone: `gallery-tone--${["gold", "rose", "plum", "sand"][index % 4]}`,
		imageUrl: item.imageUrl,
		beforeImageUrl: item.beforeImageUrl,
		serviceName: item.serviceName,
		styleType: item.styleType,
		stylistName: item.stylistName,
		length: item.length,
		size: item.size,
		timeTaken: item.timeTaken,
		priceRange: item.priceRange,
		hairType: item.hairType,
		featuredTrending: item.featuredTrending,
		featuredMostBooked: item.featuredMostBooked,
	})),
	reviews: DEFAULT_SALON_REVIEWS.map((review) => ({
		author: review.name,
		rating: review.rating,
		text: review.text,
		role: review.role,
		source: review.source,
	})),
	blogPosts: DEFAULT_SALON_BLOGS.map((post) => ({
		title: post.title,
		excerpt: post.excerpt,
		category: "Journal",
		imageUrl: post.imageUrl,
		readTime: post.readTime,
		publishDate: post.publishDate,
	})),
}

const tenantFixtures: Readonly<Record<string, TenantStorefront>> = {
	[fixtureTenant.slug]: fixtureTenant,
}

export async function getTenantStorefront(
	slug: string,
): Promise<TenantStorefront | null> {
	const normalizedSlug = slug.trim().toLowerCase()
	const fixture = tenantFixtures[normalizedSlug]

	if (!process.env.DATABASE_URL) return fixture ?? null

	try {
		const tenant = await prisma.tenant.findUnique({
			where: { slug: normalizedSlug },
			select: {
				id: true,
				slug: true,
				businessName: true,
				country: true,
				city: true,
				currency: true,
				status: true,
				subscription: { select: { plan: { select: { tier: true } } } },
		settings: {
			select: {
						themePreset: true,
						themeMode: true,
						phonePrimary: true,
						phoneSecondary: true,
						whatsappUrl: true,
						emailPrimary: true,
						emailBookings: true,
						address: true,
						logoUrl: true,
						heroImageUrl: true,
						heroTitle: true,
				heroSubtitle: true,
				openingHours: true,
				socialLinks: true,
				storefrontConfig: true,
				bookingPaymentsEnabled: true,
				bookingPaymentModes: true,
				bookingDepositPercent: true,
					},
				},
				services: {
					where: { enabled: true, category: { enabled: true } },
					orderBy: { sortOrder: "asc" },
					select: {
						id: true,
						name: true,
						description: true,
						durationLabel: true,
						priceLabel: true,
						priceMinor: true,
						orderOnly: true,
						category: { select: { label: true } },
					},
				},
				galleryStyles: {
					where: { published: true, category: { enabled: true } },
					orderBy: { updatedAt: "desc" },
					take: 24,
					select: {
						id: true,
						styleName: true,
						serviceName: true,
						styleType: true,
						length: true,
						size: true,
						hairType: true,
						stylistName: true,
						timeTaken: true,
						priceRange: true,
						imageUrl: true,
						beforeImageUrl: true,
						featuredTrending: true,
						featuredMostBooked: true,
						createdAt: true,
						updatedAt: true,
						category: { select: { label: true } },
					},
				},
				reviews: {
					where: { status: "APPROVED" },
					orderBy: { createdAt: "desc" },
					take: 6,
					select: { id: true, name: true, rating: true, text: true, createdAt: true },
				},
				blogPosts: {
					where: { published: true },
					orderBy: { publishDate: "desc" },
					take: 6,
					select: { id: true, slug: true, title: true, excerpt: true, imageUrl: true, readTime: true, publishDate: true },
				},
			},
		})

		if (
			!tenant ||
			tenant.status === "ARCHIVED" ||
			tenant.status === "SUSPENDED"
		)
			return fixture ?? null

		const planTier = tenant.subscription?.plan.tier.toLowerCase()
		const resolvedPlan =
			planTier === "business" || planTier === "enterprise"
				? planTier
				: "starter"
		const phone = tenant.settings?.phonePrimary ?? "+254740470381"
		const isRoyalBraids = normalizedSlug === "royal-braids"
		return {
			id: tenant.id,
			slug: tenant.slug,
			businessName: tenant.businessName,
			shortDescription: isRoyalBraids
				? ROYAL_BRAIDS_HERO_DESCRIPTION
				: "A welcoming beauty experience shaped around your services, clients, and signature work.",
			locationLabel: [tenant.city, tenant.country].filter(Boolean).join(", "),
			planTier: resolvedPlan,
			theme: {
				preset: tenant.settings?.themePreset ?? "gold",
				mode: tenant.settings?.themeMode === "light" ? "light" : "dark",
				primaryColor: "#d7a84f",
			},
			actionLinks: {
				bookingPath: "#booking",
				whatsappUrl:
					tenant.settings?.whatsappUrl ?? "https://wa.me/254740470381",
				phoneUrl: `tel:${phone}`,
				directionsUrl: "#visit",
			},
			contact: {
				phonePrimary: tenant.settings?.phonePrimary ?? undefined,
				phoneSecondary: tenant.settings?.phoneSecondary ?? undefined,
				emailPrimary: tenant.settings?.emailPrimary ?? undefined,
				emailBookings: tenant.settings?.emailBookings ?? undefined,
				address: tenant.settings?.address ?? undefined,
			},
			bookingPayment: {
				enabled: tenant.settings?.bookingPaymentsEnabled === true,
				modes: Array.isArray(tenant.settings?.bookingPaymentModes)
					? tenant.settings.bookingPaymentModes.filter(
							(mode): mode is "partial" | "full" | "after_service" =>
								mode === "partial" || mode === "full" || mode === "after_service",
						)
					: ["partial", "full", "after_service"],
				depositPercent: tenant.settings?.bookingDepositPercent ?? 50,
				currency: tenant.currency,
			},
			logoUrl: tenant.settings?.logoUrl ?? undefined,
			heroImageUrl: tenant.settings?.heroImageUrl ?? undefined,
			heroDescription:
				(tenant.settings?.storefrontConfig as StorefrontDesignConfig | null)
					?.heroDescription ?? undefined,
			heroTitle: isRoyalBraids
				? ROYAL_BRAIDS_HERO_TITLE
				: (tenant.settings?.heroTitle ?? undefined),
				heroSubtitle: isRoyalBraids
				? ROYAL_BRAIDS_HERO_SUBTITLE
				: (tenant.settings?.heroSubtitle ?? undefined),
			storefrontConfig: (() => {
				const stored = tenant.settings?.storefrontConfig as
					| Partial<StorefrontDesignConfig>
					| null
					| undefined
				return {
					...DEFAULT_STOREFRONT_DESIGN,
					...stored,
					mapEmbedUrl:
						typeof stored?.mapEmbedUrl === "string" && stored.mapEmbedUrl.trim()
							? stored.mapEmbedUrl
							: DEFAULT_STOREFRONT_DESIGN.mapEmbedUrl,
					sectionCopy: {
						...DEFAULT_STOREFRONT_DESIGN.sectionCopy,
						...(stored?.sectionCopy ?? {}),
					},
					sectionVisibility: {
						...DEFAULT_STOREFRONT_DESIGN.sectionVisibility,
						...(stored?.sectionVisibility ?? {}),
					},
				}
			})(),
			openingHours:
				tenant.settings?.openingHours &&
				typeof tenant.settings.openingHours === "object"
					? (tenant.settings.openingHours as Record<string, string>)
					: undefined,
			socialLinks:
				tenant.settings?.socialLinks &&
				typeof tenant.settings.socialLinks === "object"
					? (tenant.settings.socialLinks as Record<string, string>)
					: undefined,
			services: tenant.services.map((service) => ({
				id: service.id,
				name: service.name,
				description: service.description,
				durationMinutes: Number.parseInt(service.durationLabel, 10) || 0,
				durationLabel: service.durationLabel,
				priceLabel: service.orderOnly
					? "Order on WhatsApp"
					: service.priceLabel,
				priceMinor: service.priceMinor ?? undefined,
				category: service.category.label,
				isCosmeticProduct: service.orderOnly,
			})),
			gallery: tenant.galleryStyles.map((item, index) => ({
				id: item.id,
				title: item.styleName,
				category: item.category?.label ?? "Gallery",
				tone: `gallery-tone--${["gold", "rose", "plum", "sand"][index % 4]}`,
				imageUrl: item.imageUrl,
				beforeImageUrl: item.beforeImageUrl ?? undefined,
				serviceName: item.serviceName ?? undefined,
				styleType: item.styleType ?? undefined,
				length: item.length ?? undefined,
				size: item.size ?? undefined,
				hairType: item.hairType ?? undefined,
				stylistName: item.stylistName ?? undefined,
				timeTaken: item.timeTaken ?? undefined,
				priceRange: item.priceRange ?? undefined,
				featuredTrending: item.featuredTrending,
				featuredMostBooked: item.featuredMostBooked,
				createdAt: item.createdAt.toISOString(),
				updatedAt: item.updatedAt.toISOString(),
			})),
			reviews: tenant.reviews.map((review) => ({
				id: review.id,
				author: review.name,
				rating: review.rating,
				text: review.text,
				role: undefined,
				createdAt: review.createdAt.toISOString(),
			})),
			blogPosts: tenant.blogPosts.map((post) => ({
				id: post.id,
				slug: post.slug,
				title: post.title,
				excerpt: post.excerpt,
				category: "Journal",
				imageUrl: post.imageUrl ?? undefined,
				readTime: post.readTime ?? undefined,
				publishDate: post.publishDate.toISOString(),
			})),
		}
	} catch {
		return fixture ?? null
	}
}

export async function getTenantStorefrontByHost(
	host: string | null | undefined,
) {
	if (!process.env.DATABASE_URL) return null
	const slug = await resolveTenantSlugByHost(host)
	return slug ? getTenantStorefront(slug) : null
}
