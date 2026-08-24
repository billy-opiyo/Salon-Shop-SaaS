import type { PlanTier } from "@shared/types/tenant";

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
  | "multipleLocations";

export interface PlanEntitlements {
  readonly tier: PlanTier;
  readonly limits: Readonly<{
    readonly staffMembers: number;
    readonly galleryItems: number;
    readonly monthlyBookings: number;
    readonly storageMegabytes: number;
  }>;
  readonly features: Readonly<Record<EntitlementKey, boolean>>;
}

export const PLAN_ENTITLEMENTS: Readonly<Record<PlanTier, PlanEntitlements>> = {
  starter: {
    tier: "starter",
    limits: { staffMembers: 1, galleryItems: 50, monthlyBookings: 100, storageMegabytes: 500 },
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
    limits: { staffMembers: 10, galleryItems: 500, monthlyBookings: 1000, storageMegabytes: 5000 },
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
    limits: { staffMembers: Number.MAX_SAFE_INTEGER, galleryItems: Number.MAX_SAFE_INTEGER, monthlyBookings: Number.MAX_SAFE_INTEGER, storageMegabytes: Number.MAX_SAFE_INTEGER },
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
};

export function hasEntitlement(tier: PlanTier, feature: EntitlementKey): boolean {
  return PLAN_ENTITLEMENTS[tier].features[feature];
}
