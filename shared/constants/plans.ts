import type { PlanTier } from "@shared/types/tenant"

export const BEAUTY_SPHIA_NAME = "Beauty Sphia"
export const BEAUTY_SPHIA_CURRENCY = "KES" as const
export const CURRENT_PRICE_VERSION = "2026-08-28"

export interface PlanPricing {
	readonly monthlyAmountMinor: number
	readonly setupFeeMinor: number
}

export interface PlanCommercialPositioning {
	readonly bestFor: string
	readonly upgradeReasons: readonly string[]
}

export const PLAN_PRICING: Readonly<Record<PlanTier, PlanPricing>> = {
	starter: { monthlyAmountMinor: 130000, setupFeeMinor: 500000 },
	business: { monthlyAmountMinor: 330000, setupFeeMinor: 500000 },
	enterprise: { monthlyAmountMinor: 800000, setupFeeMinor: 200000 },
}

export const PLAN_POSITIONING: Readonly<
	Record<PlanTier, PlanCommercialPositioning>
> = {
	starter: {
		bestFor: "A solo salon building its first professional storefront.",
		upgradeReasons: [
			"Up to 100 monthly bookings",
			"One owner-led workspace",
			"Core services, gallery, blog, and reviews",
		],
	},
	business: {
		bestFor: "A busy salon with a growing team and daily appointment flow.",
		upgradeReasons: [
			"Up to 1,000 monthly bookings",
			"Up to 10 staff members with permissions",
			"Waitlists, advanced scheduling, and automation",
		],
	},
	enterprise: {
		bestFor: "A multi-team salon business with custom operating needs.",
		upgradeReasons: [
			"Multiple locations and expanded usage",
			"Advanced security, audit, and data controls",
			"Custom domains and priority onboarding",
		],
	},
}

export const BILLING_POLICY = {
	currency: BEAUTY_SPHIA_CURRENCY,
	trialDays: 14,
	paymentGraceDays: 3,
	failedPaymentRetryCount: 2,
	setupTargetBusinessDays: "1-3",
	dataRetentionDaysAfterCancellation: 90,
	priceChangeNoticeDays: 30,
	billingProvider: "daraja" as const,
	paymentFlow: "stk-push" as const,
	transactionFeePayer: "sender" as const,
} as const

export type EntitlementKey =
	| "storefront"
	| "booking"
	| "gallery"
	| "blog"
	| "reviews"
	| "waitlist"
	| "advancedSchedule"
	| "staffMembers"
	| "securityInsights"
	| "whatsappAutomation"
	| "customDomains"
	| "multipleLocations"

export interface PlanEntitlements {
	readonly tier: PlanTier
	readonly limits: Readonly<{
		readonly staffMembers: number
		readonly galleryItems: number
		readonly monthlyBookings: number
		readonly storageMegabytes: number
	}>
	readonly features: Readonly<Record<EntitlementKey, boolean>>
}

export const PLAN_ENTITLEMENTS: Readonly<Record<PlanTier, PlanEntitlements>> = {
	starter: {
		tier: "starter",
		limits: {
			staffMembers: 1,
			galleryItems: 50,
			monthlyBookings: 100,
			storageMegabytes: 1000,
		},
		features: {
			storefront: true,
			booking: true,
			gallery: true,
			blog: true,
			reviews: true,
			waitlist: false,
			advancedSchedule: false,
			staffMembers: false,
			securityInsights: false,
			whatsappAutomation: false,
			customDomains: false,
			multipleLocations: false,
		},
	},
	business: {
		tier: "business",
		limits: {
			staffMembers: 10,
			galleryItems: 500,
			monthlyBookings: 1000,
			storageMegabytes: 5000,
		},
		features: {
			storefront: true,
			booking: true,
			gallery: true,
			blog: true,
			reviews: true,
			waitlist: true,
			advancedSchedule: true,
			staffMembers: true,
			securityInsights: true,
			whatsappAutomation: true,
			customDomains: true,
			multipleLocations: false,
		},
	},
	enterprise: {
		tier: "enterprise",
		limits: {
			staffMembers: Number.MAX_SAFE_INTEGER,
			galleryItems: Number.MAX_SAFE_INTEGER,
			monthlyBookings: Number.MAX_SAFE_INTEGER,
			storageMegabytes: Number.MAX_SAFE_INTEGER,
		},
		features: {
			storefront: true,
			booking: true,
			gallery: true,
			blog: true,
			reviews: true,
			waitlist: true,
			advancedSchedule: true,
			staffMembers: true,
			securityInsights: true,
			whatsappAutomation: true,
			customDomains: true,
			multipleLocations: true,
		},
	},
}

export function hasEntitlement(
	tier: PlanTier,
	feature: EntitlementKey,
): boolean {
	return PLAN_ENTITLEMENTS[tier].features[feature]
}
