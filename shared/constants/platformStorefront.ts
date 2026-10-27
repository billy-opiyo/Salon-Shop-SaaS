import { z } from "zod"
import type { PlanTier } from "@shared/types/tenant"

export interface PlatformBranding {
	readonly name: string
	readonly tagline: string
}

export interface PlatformTheme {
	readonly primary: string
	readonly primaryDark: string
	readonly primaryLight: string
	readonly background: string
	readonly surface: string
	readonly foreground: string
	readonly muted: string
	readonly line: string
}

export interface PlatformHeroContent {
	readonly eyebrow: string
	readonly audience: string
	readonly title: string
	readonly highlight: string
	readonly description: string
	readonly actionLabel: string
	readonly signature: string
	readonly benefits: readonly { readonly title: string; readonly description: string }[]
}

export interface PlatformAboutContent {
	readonly eyebrow: string
	readonly title: string
	readonly description: string
	readonly teamEyebrow: string
	readonly teamTitle: string
	readonly teamDescription: string
	readonly ctaTitle: string
}

export interface PlatformSupportContent {
	readonly eyebrow: string
	readonly title: string
	readonly description: string
	readonly gettingStartedEyebrow: string
	readonly gettingStartedTitle: string
	readonly gettingStartedDescription: string
	readonly directHelpEyebrow: string
	readonly directHelpTitle: string
	readonly directHelpDescription: string
	readonly contactEyebrow: string
	readonly contactTitle: string
	readonly contactDescription: string
	readonly faqEyebrow: string
	readonly faqTitle: string
	readonly faqDescription: string
	readonly faqs: readonly { readonly question: string; readonly answer: string }[]
}

export interface PlatformDirectoryContent {
	readonly eyebrow: string
	readonly title: string
	readonly description: string
	readonly listEyebrow: string
	readonly listTitle: string
	readonly listDescription: string
	readonly ctaEyebrow: string
	readonly ctaTitle: string
	readonly ctaDescription: string
}

export interface PlatformContactDetails {
	readonly supportEmail: string
	readonly phone: string
	readonly whatsappUrl: string
	readonly facebookUrl: string
	readonly instagramUrl: string
	readonly tiktokUrl: string
	readonly address: string
}

export interface PlatformPlanDisplay {
	readonly name: string
	readonly description: string
	readonly bestFor: string
	readonly monthlyAmountMinor: number
	readonly setupFeeMinor: number
	readonly features: readonly string[]
}

export interface PlatformBillingDisplay {
	readonly currency: string
	readonly freeUsageMonths: number
	readonly paymentMode: "paybill-stk" | "till-stk"
	readonly businessShortCode: string
	readonly accountReferencePrefix: string
	readonly paymentInstructions: string
	readonly receiptInstructions: string
	readonly priceVersion: string
}

export interface PlatformPolicyContent {
	readonly eyebrow: string
	readonly title: string
	readonly introduction: string
	readonly sections: readonly { readonly heading: string; readonly body: string }[]
}

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
	readonly branding: PlatformBranding
	readonly theme: PlatformTheme
	readonly homeHero: PlatformHeroContent
	readonly about: PlatformAboutContent
	readonly support: PlatformSupportContent
	readonly directory: PlatformDirectoryContent
	readonly contact: PlatformContactDetails
	readonly plans: Readonly<Record<PlanTier, PlatformPlanDisplay>>
	readonly billing: PlatformBillingDisplay
	readonly privacyPolicy: PlatformPolicyContent
	readonly termsPolicy: PlatformPolicyContent
	readonly cookiePolicy: PlatformPolicyContent
	readonly content: PlatformStorefrontContent
}

export const DEFAULT_PLATFORM_STOREFRONT: PlatformStorefrontDesign = {
	logoUrl: "/platform/Beauty Sphia logo.webp",
	heroDesktopUrl: "/platform/heroimageBeautySphiadesktop.webp",
	heroMobileUrl: "/platform/heroimageBeautySphiamobile-tablet.webp",
	heroAlt: "Beauty Sphia salon management platform",
	branding: {
		name: "Beauty Sphia",
		tagline: "Manage | Book | Grow",
	},
	theme: {
		primary: "#d7a84f",
		primaryDark: "#a96f23",
		primaryLight: "#f1d59b",
		background: "#0c0a07",
		surface: "#221b11",
		foreground: "#fff8e8",
		muted: "#c8bda8",
		line: "#5b4728",
	},
	homeHero: {
		eyebrow: "The salon platform for owners and customers",
		audience: "Salon Owners · Stylists · Customers",
		title: "A better salon experience for",
		highlight: "everyone",
		description: "Beauty Sphia helps salon owners manage bookings, clients, and daily operations. Customers can discover salons, explore services, and book appointments with ease.",
		actionLabel: "Start Your Salon",
		signature: "More Clients · Less Admin · Bigger Dreams",
		benefits: [
			{ title: "Online Bookings", description: "Help customers book anytime and keep your salon schedule organized." },
			{ title: "Client Management", description: "Build lasting relationships. Keep your clients organized and loyal." },
			{ title: "Salon Discovery", description: "Help customers find your salon, explore services, and book a visit." },
			{ title: "Business Growth", description: "Make data-driven decisions. Track growth and make smarter decisions." },
		],
	},
	about: {
		eyebrow: "About Beauty Sphia",
		title: "The people behind calmer salon operations.",
		description: "Beauty Sphia brings salon owners, their teams, and their clients into one thoughtful operating experience.",
		teamEyebrow: "Our people",
		teamTitle: "Meet Our Team",
		teamDescription: "Our team combines product thinking, salon empathy, and careful engineering to help independent businesses grow with confidence.",
		ctaTitle: "Build your next salon chapter with us.",
	},
	support: {
		eyebrow: "Salon Owner Support",
		title: "A helpful partner for every salon you build.",
		description: "Need help with setup, storefront content, bookings, billing, or your team workspace? We are here to help you keep your salon moving.",
		gettingStartedEyebrow: "Getting started",
		gettingStartedTitle: "Launch with confidence.",
		gettingStartedDescription: "Use the onboarding workspace to set your identity, services, schedule, staff, and storefront content.",
		directHelpEyebrow: "Direct help",
		directHelpTitle: "Talk to our team.",
		directHelpDescription: "For account, billing, or technical questions, email the Beauty Sphia support team.",
		contactEyebrow: "Platform contact",
		contactTitle: "Tell us what you need.",
		contactDescription: "Share a question or product suggestion directly with the Beauty Sphia team.",
		faqEyebrow: "Frequently Asked Questions",
		faqTitle: "Quick answers for salon owners and clients.",
		faqDescription: "Find guidance on getting started, running a salon workspace, bookings, and subscription payments.",
		faqs: [
			{ question: "How do I create a salon workspace?", answer: "Create or sign in to your Beauty Sphia account, choose Start Your Salon, complete the salon details, and select a plan. The workspace is created for your account and is not visible to other salon owners." },
			{ question: "When can customers see my salon storefront?", answer: "After the setup payment is confirmed, open your merchant workspace and publish your salon. You can then share its public storefront link with customers." },
			{ question: "How do customers book an appointment?", answer: "Customers can open a salon storefront, choose a service and an available time, then submit the booking form. The salon team can review and manage bookings from its own workspace." },
			{ question: "How do I pay a setup fee or subscription invoice?", answer: "Open the salon billing page, enter the M-Pesa phone number that should receive the STK prompt, and approve the payment on that phone. The current Paybill or Till instructions are shown with the invoice." },
			{ question: "Where can I update salon details and services?", answer: "Sign in with an active salon team account, open that salon's management workspace, and use its settings and content areas to update branding, contact details, services, hours, gallery, and other storefront information." },
			{ question: "I cannot sign in or find the answer I need. What should I do?", answer: "Use the Log in option to return to your account. If you still need help with account access, billing, bookings, or setup, contact the Beauty Sphia support team using the email or WhatsApp details on this page." },
		],
	},
	directory: {
		eyebrow: "The Beauty Sphia Directory",
		title: "Find your next favourite salon.",
		description: "Browse independent salons already running on Beauty Sphia. Discover freshly launched salons and community favourites, then step inside a live salon experience.",
		listEyebrow: "Curated picks",
		listTitle: "Top Salons Available",
		listDescription: "Our most-loved and most recently added salons, ranked for you. New salons are featured as they open their doors.",
		ctaEyebrow: "Own your corner of the platform",
		ctaTitle: "Ready to open your own salon?",
		ctaDescription: "Join the growing family of independent salons bringing their brand online with Beauty Sphia.",
	},
	contact: {
		supportEmail: "support@beautysphia.com",
		phone: "+254740470381",
		whatsappUrl: "https://wa.me/254740470381",
		facebookUrl: "https://www.facebook.com/",
		instagramUrl: "https://www.instagram.com/",
		tiktokUrl: "https://www.tiktok.com/",
		address: "",
	},
	plans: {
		starter: {
			name: "Starter",
			description: "Launch a polished salon storefront with the essentials.",
			bestFor: "A solo salon building its first professional storefront.",
			monthlyAmountMinor: 130000,
			setupFeeMinor: 500000,
			features: ["Launch one polished salon storefront", "Manage services, gallery, blog, and reviews", "Handle up to 100 bookings each month", "Owner-led workspace with standard support"],
		},
		business: {
			name: "Business",
			description: "Run daily salon operations with deeper customer workflows.",
			bestFor: "A busy salon with a growing team and daily appointment flow.",
			monthlyAmountMinor: 330000,
			setupFeeMinor: 500000,
			features: ["Run up to 1,000 bookings each month", "Manage up to 10 staff members with permissions", "Use waitlists and advanced scheduling", "Automate email and WhatsApp follow-up"],
		},
		enterprise: {
			name: "Enterprise",
			description: "Scale multiple teams, locations, and operational requirements.",
			bestFor: "A multi-team salon business with custom operating needs.",
			monthlyAmountMinor: 800000,
			setupFeeMinor: 200000,
			features: ["Operate multiple salon locations", "Use expanded or negotiated usage limits", "Apply advanced security and audit controls", "Receive custom-domain and priority onboarding support"],
		},
	},
	billing: {
		currency: "KES",
		freeUsageMonths: 6,
		paymentMode: "paybill-stk",
		businessShortCode: "",
		accountReferencePrefix: "BS",
		paymentInstructions: "Enter your M-Pesa phone number and approve the STK Push prompt to pay your setup fee or monthly invoice.",
		receiptInstructions: "Your M-Pesa receipt is added to your billing record after payment is confirmed.",
		priceVersion: "2026-08-28",
	},
	privacyPolicy: {
		eyebrow: "Platform policy",
		title: "Privacy Policy",
		introduction: "We use account, salon, booking, and operational data to provide the platform, protect accounts, and support customer workflows.",
		sections: [
			{ heading: "Data stewardship", body: "Salon owners must collect and use customer information lawfully, explain their own salon practices, and keep access limited to authorized team members." },
			{ heading: "Security", body: "We use authentication, authorization, rate limits, audit records, and provider safeguards appropriate to the platform services enabled for a workspace." },
			{ heading: "Agreement", body: "By creating a salon workspace, you acknowledge this privacy policy." },
		],
	},
	termsPolicy: {
		eyebrow: "Platform policy",
		title: "Terms of Service",
		introduction: "These terms govern salon workspace creation, storefront publishing, bookings, customer communication, and responsible use of the Beauty Sphia salon platform.",
		sections: [
			{ heading: "Workspace responsibility", body: "Owners are responsible for accurate salon information, lawful content, customer consent, and the services offered through their storefront." },
			{ heading: "Platform use", body: "Do not misuse the platform, attempt unauthorized access, upload harmful content, or use customer information outside the purposes disclosed to customers." },
			{ heading: "Agreement", body: "By creating a salon workspace, you confirm that you have read and agree to these terms." },
		],
	},
	cookiePolicy: {
		eyebrow: "Platform policy",
		title: "Cookie Policy",
		introduction: "The platform may use essential cookies for authentication, security, preferences, and reliable navigation.",
		sections: [
			{ heading: "Essential cookies", body: "These support secure sessions and platform operation. They cannot be disabled while using protected workspace features." },
			{ heading: "Preferences", body: "Theme and accessibility preferences may be stored locally or in your account when the relevant feature is enabled." },
			{ heading: "Agreement", body: "By using the platform, you acknowledge this cookie policy." },
		],
	},
	content: {
		showcaseEyebrow: "A calmer way to run your business",
		showcaseTitle: "Where every salon finds its people — and every crown finds its craft.",
		showcaseDescription: "From glossy knotless braids to evenings that glow, the talent on Beauty Sphia turns appointments into rituals and clients into regulars. Step into a directory of independent salons, each one ready to welcome you the moment you arrive.",
		showcasePrimaryLabel: "Explore Salons",
		showcaseSecondaryLabel: "See pricings",
		topStoresEyebrow: "Top Salons Available",
		topStoresTitle: "Step inside a live salon experience.",
		topStoresViewAllLabel: "View all salons",
		howEyebrow: "A calmer way to run your business",
		howTitle: "From first click to fully booked.",
		howSteps: [
			{ title: "Create", description: "Set up your salon identity, services, team, and public salon address." },
			{ title: "Customize", description: "Bring your brand to life with the preserved salon storefront experience." },
			{ title: "Grow", description: "Manage bookings, content, customers, and daily operations from one workspace." },
		],
		plansEyebrow: "Transparent pricings",
		plansTitle: "Pricings that grow with your salon.",
		plansDescription: "Simple monthly pricing in KES, with a one-time setup fee and a complimentary usage period before monthly billing begins.",
		contactEyebrow: "Get in touch",
		contactTitle: "Let’s talk about your salon.",
		contactDescription: "Questions about the platform, ready to open a salon, or just want to say hello? Drop us a message and the Beauty Sphia team will get right back to you.",
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

const text = (max: number) => z.string().trim().min(1).max(max)
const optionalText = (max: number) => z.string().trim().max(max)
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/)
const imageUrl = z.string().trim().max(2000).refine(
	(value) => value.startsWith("/") || value.startsWith("https://"),
	"Image URLs must be local paths or use HTTPS.",
)
const sectionCopySchema = z.object({
	heading: text(160),
	body: text(2400),
})
const planDisplaySchema = z.object({
	name: text(80),
	description: text(800),
	bestFor: text(400),
	monthlyAmountMinor: z.number().int().min(0).max(100_000_000),
	setupFeeMinor: z.number().int().min(0).max(100_000_000),
	features: z.array(text(240)).min(1).max(8),
})

export const platformStorefrontDesignSchema = z.object({
	logoUrl: imageUrl,
	heroDesktopUrl: imageUrl,
	heroMobileUrl: imageUrl,
	heroAlt: text(200),
	branding: z.object({ name: text(100), tagline: text(160) }),
	theme: z.object({
		primary: color,
		primaryDark: color,
		primaryLight: color,
		background: color,
		surface: color,
		foreground: color,
		muted: color,
		line: color,
	}),
	homeHero: z.object({
		eyebrow: text(160),
		audience: text(180),
		title: text(200),
		highlight: text(100),
		description: text(1000),
		actionLabel: text(80),
		signature: text(240),
		benefits: z.array(z.object({ title: text(100), description: text(400) })).length(4),
	}),
	about: z.object({
		eyebrow: text(160), title: text(240), description: text(1200),
		teamEyebrow: text(160), teamTitle: text(240), teamDescription: text(1200), ctaTitle: text(240),
	}),
	support: z.object({
		eyebrow: text(160), title: text(240), description: text(1200),
		gettingStartedEyebrow: text(160), gettingStartedTitle: text(240), gettingStartedDescription: text(1200),
		directHelpEyebrow: text(160), directHelpTitle: text(240), directHelpDescription: text(1200),
		contactEyebrow: text(160), contactTitle: text(240), contactDescription: text(1200),
		faqEyebrow: text(160), faqTitle: text(240), faqDescription: text(1200),
		faqs: z.array(z.object({ question: text(240), answer: text(1600) })).min(3).max(12),
	}),
	directory: z.object({
		eyebrow: text(160), title: text(240), description: text(1200),
		listEyebrow: text(160), listTitle: text(240), listDescription: text(1200),
		ctaEyebrow: text(160), ctaTitle: text(240), ctaDescription: text(1200),
	}),
	contact: z.object({
		supportEmail: z.string().trim().email().max(320),
		phone: optionalText(40),
		whatsappUrl: z.string().trim().max(2000).refine((value) => value === "" || value.startsWith("https://")),
		facebookUrl: z.string().trim().max(2000).refine((value) => value === "" || value.startsWith("https://")),
		instagramUrl: z.string().trim().max(2000).refine((value) => value === "" || value.startsWith("https://")),
		tiktokUrl: z.string().trim().max(2000).refine((value) => value === "" || value.startsWith("https://")),
		address: optionalText(300),
	}),
	plans: z.object({
		starter: planDisplaySchema,
		business: planDisplaySchema,
		enterprise: planDisplaySchema,
	}),
	billing: z.object({
		currency: z.literal("KES"),
		freeUsageMonths: z.number().int().min(0).max(60),
		paymentMode: z.enum(["paybill-stk", "till-stk"]),
		businessShortCode: z.string().trim().max(20).regex(/^[0-9]*$/),
		accountReferencePrefix: text(12),
		paymentInstructions: text(800),
		receiptInstructions: text(800),
		priceVersion: z.string().trim().min(1).max(80),
	}),
	privacyPolicy: z.object({ eyebrow: text(160), title: text(200), introduction: text(1200), sections: z.array(sectionCopySchema).min(1).max(12) }),
	termsPolicy: z.object({ eyebrow: text(160), title: text(200), introduction: text(1200), sections: z.array(sectionCopySchema).min(1).max(12) }),
	cookiePolicy: z.object({ eyebrow: text(160), title: text(200), introduction: text(1200), sections: z.array(sectionCopySchema).min(1).max(12) }),
	content: contentSchema,
})

export type PlatformStorefrontDesignInput = z.infer<typeof platformStorefrontDesignSchema>
