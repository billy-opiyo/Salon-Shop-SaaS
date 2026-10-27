import "server-only";

import { prisma } from "@backend/db/prisma";
import type { ClientAccountSnapshot } from "@shared/types/clientAccount";

export type { ClientAccountSnapshot } from "@shared/types/clientAccount";

export class ClientAccountError extends Error {
  readonly code = "CLIENT_ACCOUNT_FAILED" as const;

  constructor(message: string) {
    super(message);
    this.name = "ClientAccountError";
  }
}

function normalizeTenantSlug(value: string): string {
  return value.trim().toLowerCase();
}

export async function getClientAccountSnapshot(
  userId: string,
  tenantSlug?: string,
): Promise<ClientAccountSnapshot> {
  const normalizedSlug = tenantSlug ? normalizeTenantSlug(tenantSlug) : ""
  const tenant = normalizedSlug ? await prisma.tenant.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true, status: true },
  }) : null
  if (normalizedSlug && (!tenant || tenant.status !== "ACTIVE"))
    throw new ClientAccountError("This salon is not currently available.")

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, phone: true, image: true },
  });
  if (!user) throw new ClientAccountError("Your account could not be found.");

  const [preferences, bookings, reviews, favorites, loginHistory] = await Promise.all([
    prisma.userPreferences.findUnique({
      where: { userId },
      select: {
        theme: true,
        fontSize: true,
        highContrast: true,
        reducedMotion: true,
        notifyEmail: true,
        notifySms: true,
        notifyPush: true,
      },
    }),
    prisma.booking.findMany({
      where: {
        ...(tenant ? { tenantId: tenant.id } : {}),
        OR: [{ userId }, { userId: null, email: user.email.toLowerCase() }],
      },
      orderBy: [{ appointmentDate: "asc" }, { timeLabel: "asc" }],
      take: 50,
      select: {
        id: true,
        serviceName: true,
        appointmentDate: true,
        timeLabel: true,
        status: true,
        specialRequests: true,
        stylistId: true,
        stylist: { select: { name: true } },
        tenant: { select: { businessName: true, slug: true } },
      },
    }),
    prisma.review.findMany({
      where: { ...(tenant ? { tenantId: tenant.id } : {}), userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        serviceName: true,
        rating: true,
        text: true,
        status: true,
        createdAt: true,
        tenant: { select: { businessName: true, slug: true } },
      },
    }),
    prisma.favorite.findMany({
      where: { ...(tenant ? { tenantId: tenant.id } : {}), userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        galleryStyleId: true,
        galleryStyle: {
          select: {
            styleName: true,
            imageUrl: true,
            category: { select: { label: true } },
          },
        },
        tenant: { select: { businessName: true, slug: true } },
      },
    }),
    prisma.loginActivity.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        provider: true,
        status: true,
        riskLevel: true,
        userAgent: true,
        country: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    profile: user,
    preferences: preferences && (preferences.theme === "dark" || preferences.theme === "light")
      ? {
          ...preferences,
          theme: preferences.theme,
          fontSize: preferences.fontSize === "small" || preferences.fontSize === "large" ? preferences.fontSize : "medium",
        }
      : null,
    bookings: bookings.map((booking) => ({
      id: booking.id,
      tenantName: booking.tenant.businessName,
      tenantSlug: booking.tenant.slug,
      serviceName: booking.serviceName,
      appointmentDate: booking.appointmentDate.toISOString().slice(0, 10),
      timeLabel: booking.timeLabel,
      status: booking.status.toLowerCase(),
      stylistName: booking.stylist?.name ?? null,
      stylistId: booking.stylistId,
      specialRequests: booking.specialRequests,
    })),
    reviews: reviews.map((review) => ({
      id: review.id,
      tenantName: review.tenant.businessName,
      tenantSlug: review.tenant.slug,
      serviceName: review.serviceName,
      rating: review.rating,
      text: review.text,
      status: review.status.toLowerCase(),
      createdAt: review.createdAt.toISOString(),
    })),
    favorites: favorites.map((favorite) => ({
      id: favorite.id,
      tenantName: favorite.tenant.businessName,
      tenantSlug: favorite.tenant.slug,
      galleryStyleId: favorite.galleryStyleId,
      styleName: favorite.galleryStyle.styleName,
      imageUrl: favorite.galleryStyle.imageUrl,
      category: favorite.galleryStyle.category?.label ?? null,
    })),
    loginHistory: loginHistory.map((item) => ({
      id: item.id,
      provider: item.provider,
      status: item.status,
      riskLevel: item.riskLevel,
      userAgent: item.userAgent,
      country: item.country,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}
