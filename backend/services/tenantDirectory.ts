import "server-only";

import type { TenantStorefront } from "@shared/types/tenant";

const fixtureTenant: TenantStorefront = {
  id: "tenant_fixture_royal_braids",
  slug: "royal-braids",
  businessName: "Royal Braids",
  shortDescription:
    "A premium salon storefront fixture preserving the reference experience while the SaaS foundation is built.",
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
};

const tenantFixtures: Readonly<Record<string, TenantStorefront>> = {
  [fixtureTenant.slug]: fixtureTenant,
};

export function getTenantStorefront(slug: string): TenantStorefront | null {
  const normalizedSlug = slug.trim().toLowerCase();
  return tenantFixtures[normalizedSlug] ?? null;
}
