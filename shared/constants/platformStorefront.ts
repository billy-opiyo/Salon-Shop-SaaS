import { z } from "zod"

export interface PlatformStorefrontContent {
	readonly showcaseEyebrow: string
	readonly showcaseTitle: string
	readonly showcaseDescription: string
	readonly showcasePrimaryLabel: string
	readonly showcaseSecondaryLabel: string
	readonly topStoresEyebrow: string
	readonly topStoresTitle: string
	readonly topStoresViewAllLabel: string
	readonly howEyebrow: string
	readonly howTitle: string
	readonly howSteps: readonly { readonly title: string; readonly description: string }[]
	readonly plansEyebrow: string
	readonly plansTitle: string
	readonly plansDescription: string
	readonly contactEyebrow: string
	readonly contactTitle: string
	readonly contactDescription: string
	readonly footerDescription: string
}

export interface PlatformStorefrontDesign {
	readonly logoUrl: string
	readonly heroDesktopUrl: string
	readonly heroMobileUrl: string
	readonly heroAlt: string
	readonly content: PlatformStorefrontContent
}

export const DEFAULT_PLATFORM_STOREFRONT: PlatformStorefrontDesign = {
	logoUrl: "/platform/Beauty Sphia logo.webp",
	heroDesktopUrl: "/platform/heroimageBeautySphiadesktop.webp",
	heroMobileUrl: "/platform/heroimageBeautySphiamobile-tablet.webp",
	heroAlt: "Beauty Sphia salon management platform",
	content: {
		showcaseEyebrow: "A calmer way to run your business",
		showcaseTitle: "Where every salon finds its people — and every crown finds its craft.",
		showcaseDescription: "From glossy knotless braids to evenings that glow, the talent on Beauty Sphia turns appointments into rituals and clients into regulars. Step into a directory of independent salons, each one ready to welcome you the moment you arrive.",
		showcasePrimaryLabel: "Explore Stores",
		showcaseSecondaryLabel: "See plans",
		topStoresEyebrow: "Top Stores Available",
		topStoresTitle: "Step inside a live salon experience.",
		topStoresViewAllLabel: "View all stores",
		howEyebrow: "A calmer way to run your business",
		howTitle: "From first click to fully booked.",
		howSteps: [
			{ title: "Create", description: "Set up your salon identity, services, team, and public store address." },
			{ title: "Customize", description: "Bring your brand to life with the preserved salon storefront experience." },
			{ title: "Grow", description: "Manage bookings, content, customers, and daily operations from one workspace." },
		],
		plansEyebrow: "Choose your operating level",
		plansTitle: "Plans that grow with your salon.",
		plansDescription: "Simple monthly pricing in KES, with a one-time setup fee, followed by six months of free usage before monthly billing begins.",
		contactEyebrow: "Get in touch",
		contactTitle: "Let’s talk about your salon.",
		contactDescription: "Questions about the platform, ready to open a store, or just want to say hello? Drop us a message and the Beauty Sphia team will get right back to you.",
		footerDescription: "Manage your salon, book clients, and grow your brand in one place.",
	},
}

const contentSchema = z.object({
	showcaseEyebrow: z.string().trim().max(120),
	showcaseTitle: z.string().trim().max(240),
	showcaseDescription: z.string().trim().max(800),
	showcasePrimaryLabel: z.string().trim().max(80),
	showcaseSecondaryLabel: z.string().trim().max(80),
	topStoresEyebrow: z.string().trim().max(120),
	topStoresTitle: z.string().trim().max(240),
	topStoresViewAllLabel: z.string().trim().max(80),
	howEyebrow: z.string().trim().max(120),
	howTitle: z.string().trim().max(240),
	howSteps: z.array(z.object({ title: z.string().trim().max(80), description: z.string().trim().max(400) })).length(3),
	plansEyebrow: z.string().trim().max(120),
	plansTitle: z.string().trim().max(240),
	plansDescription: z.string().trim().max(800),
	contactEyebrow: z.string().trim().max(120),
	contactTitle: z.string().trim().max(240),
	contactDescription: z.string().trim().max(800),
	footerDescription: z.string().trim().max(400),
})

export const platformStorefrontDesignSchema = z.object({
	logoUrl: z.string().trim().max(2000),
	heroDesktopUrl: z.string().trim().max(2000),
	heroMobileUrl: z.string().trim().max(2000),
	heroAlt: z.string().trim().max(200),
	content: contentSchema,
})

export type PlatformStorefrontDesignInput = z.infer<typeof platformStorefrontDesignSchema>
