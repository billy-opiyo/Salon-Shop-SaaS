import "server-only";

import { prisma } from "@backend/db/prisma";
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
  services: [
    { name: "Signature Knotless Braids", description: "Lightweight, polished braids tailored to your style.", durationMinutes: 180, priceLabel: "From KES 4,500", category: "Braids" },
    { name: "Silk Press & Finish", description: "A smooth, luminous finish with a considered aftercare routine.", durationMinutes: 120, priceLabel: "From KES 2,500", category: "Hair" },
    { name: "Royal Glow Facial", description: "A restorative facial ritual for an event-ready glow.", durationMinutes: 75, priceLabel: "From KES 2,000", category: "Beauty" },
    { name: "Edge Control & Care", description: "Salon-grade care products available through WhatsApp ordering.", durationMinutes: 0, priceLabel: "Order on WhatsApp", category: "Cosmetics", isCosmeticProduct: true },
  ],
  gallery: [
    { title: "Golden knotless", category: "Braids", tone: "gallery-tone--gold" },
    { title: "Soft silk finish", category: "Hair", tone: "gallery-tone--rose" },
    { title: "Weekend glow", category: "Beauty", tone: "gallery-tone--plum" },
    { title: "Classic crown", category: "Braids", tone: "gallery-tone--sand" },
  ],
  reviews: [
    { author: "Miriam K.", rating: 5, text: "The finish was beautiful, the timing was thoughtful, and the whole visit felt personal." },
    { author: "Achieng O.", rating: 5, text: "My braids stayed neat for weeks. The team understood exactly what I wanted." },
    { author: "Njeri W.", rating: 4, text: "A calm, welcoming space with careful attention to detail." },
  ],
  blogPosts: [
    { title: "How to prepare for your next braid appointment", excerpt: "A simple routine that helps your stylist create your best result.", category: "Care guide" },
    { title: "The Royal Braids aftercare ritual", excerpt: "Keep your style fresh with a few small, consistent habits.", category: "Journal" },
  ],
};

const tenantFixtures: Readonly<Record<string, TenantStorefront>> = {
  [fixtureTenant.slug]: fixtureTenant,
};

export async function getTenantStorefront(slug: string): Promise<TenantStorefront | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  const fixture = tenantFixtures[normalizedSlug];


  if (!process.env.DATABASE_URL) return fixture ?? null;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: normalizedSlug },
      select: {
        id: true,
        slug: true,
        businessName: true,
        country: true,
        city: true,
        status: true,
        subscription: { select: { plan: { select: { tier: true } } } },
        settings: { select: { themePreset: true, themeMode: true, phonePrimary: true, whatsappUrl: true } },
        services: {
          where: { enabled: true },
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, description: true, durationLabel: true, priceLabel: true, orderOnly: true, category: { select: { label: true } } },
        },
        galleryStyles: {
          where: { published: true },
          orderBy: { updatedAt: "desc" },
          take: 24,
          select: { id: true, styleName: true, imageUrl: true, category: { select: { label: true } } },
        },
        reviews: {
          where: { status: "APPROVED" },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: { name: true, rating: true, text: true },
        },
        blogPosts: {
          where: { published: true },
          orderBy: { publishDate: "desc" },
          take: 6,
          select: { slug: true, title: true, excerpt: true },
        },
      },
    });

    if (!tenant || tenant.status === "ARCHIVED" || tenant.status === "SUSPENDED") return fixture ?? null;

    const planTier = tenant.subscription?.plan.tier.toLowerCase();
    const resolvedPlan = planTier === "business" || planTier === "enterprise" ? planTier : "starter";
    const phone = tenant.settings?.phonePrimary ?? "+254740470381";
    return {
      id: tenant.id,
      slug: tenant.slug,
      businessName: tenant.businessName,
      shortDescription: "A salon storefront shaped around your services, clients, and signature work.",
      locationLabel: [tenant.city, tenant.country].filter(Boolean).join(", "),
      planTier: resolvedPlan,
      theme: {
        preset: tenant.settings?.themePreset ?? "gold",
        mode: tenant.settings?.themeMode === "light" ? "light" : "dark",
        primaryColor: "#d7a84f",
      },
      actionLinks: {
        bookingPath: "#booking",
        whatsappUrl: tenant.settings?.whatsappUrl ?? "https://wa.me/254740470381",
        phoneUrl: `tel:${phone}`,
        directionsUrl: "#visit",
      },
      services: tenant.services.map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        durationMinutes: Number.parseInt(service.durationLabel, 10) || 0,
        priceLabel: service.orderOnly ? "Order on WhatsApp" : service.priceLabel,
        category: service.category.label,
        isCosmeticProduct: service.orderOnly,
      })),
      gallery: tenant.galleryStyles.map((item, index) => ({
        id: item.id,
        title: item.styleName,
        category: item.category?.label ?? "Gallery",
        tone: `gallery-tone--${["gold", "rose", "plum", "sand"][index % 4]}`,
        imageUrl: item.imageUrl,
      })),
      reviews: tenant.reviews.map((review) => ({ author: review.name, rating: review.rating, text: review.text })),
      blogPosts: tenant.blogPosts.map((post) => ({ slug: post.slug, title: post.title, excerpt: post.excerpt, category: "Journal" })),
    };
  } catch {
    return fixture ?? null;
  }
}
