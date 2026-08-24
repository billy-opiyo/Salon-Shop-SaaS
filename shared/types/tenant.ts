export type PlanTier = "starter" | "business" | "enterprise";

export interface TenantTheme {
  readonly preset: string;
  readonly mode: "light" | "dark";
  readonly primaryColor: string;
}

export interface TenantActionLinks {
  readonly bookingPath: string;
  readonly whatsappUrl: string;
  readonly phoneUrl: string;
  readonly directionsUrl: string;
}

export interface TenantStorefront {
  readonly id: string;
  readonly slug: string;
  readonly businessName: string;
  readonly shortDescription: string;
  readonly locationLabel: string;
  readonly planTier: PlanTier;
  readonly theme: TenantTheme;
  readonly actionLinks: TenantActionLinks;
}
