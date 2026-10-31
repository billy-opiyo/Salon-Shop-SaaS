import "server-only";

import { prisma } from "@backend/db/prisma";
import { tenantAllowsPublicActions } from "@backend/services/publicTenantAccess";
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

function timeLabelMinutes(value: string): number {
  const text = value.trim().toUpperCase().replace(/\./g, "").replace(/\s+/g, "");
  const match = /^(\d{1,2})(?::?(\d{2}))?(AM|PM)?$/.exec(text);
  if (!match) return Number.MAX_SAFE_INTEGER;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  if (minute > 59 || (match[3] ? hour < 1 || hour > 12 : hour > 23))
    return Number.MAX_SAFE_INTEGER;
  if (match[3] === "PM" && hour < 12) hour += 12;
  if (match[3] === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function getNairobiDateStart(): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) throw new ClientAccountError("The current date could not be determined.");
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
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
  if (
    normalizedSlug &&
    (!tenant || !(await tenantAllowsPublicActions(normalizedSlug, tenant.status)))
  )
    throw new ClientAccountError("This salon is not currently available.")

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, phone: true, image: true },
  });
  if (!user) throw new ClientAccountError("Your account could not be found.");

  const bookingWhere = {
    ...(tenant ? { tenantId: tenant.id } : {}),
    OR: [{ userId }, { userId: null, email: user.email.toLowerCase() }],
  };
  const bookingSelect = {
    id: true,
    serviceName: true,
    appointmentDate: true,
    timeLabel: true,
    status: true,
    specialRequests: true,
    stylistId: true,
    stylist: { select: { name: true } },
    tenant: { select: { businessName: true, slug: true } },
  };
  const todayStart = getNairobiDateStart();

  const [preferences, upcomingBookings, recentPastBookings, reviews, favorites, loginHistory] = await Promise.all([
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
      where: { ...bookingWhere, appointmentDate: { gte: todayStart } },
      orderBy: { appointmentDate: "asc" },
      take: 50,
      select: bookingSelect,
    }),
    prisma.booking.findMany({
      where: { ...bookingWhere, appointmentDate: { lt: todayStart } },
      orderBy: { appointmentDate: "desc" },
      take: 20,
      select: bookingSelect,
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
    bookings: [
      ...[...upcomingBookings].sort((left, right) =>
        left.appointmentDate.getTime() - right.appointmentDate.getTime() ||
        timeLabelMinutes(left.timeLabel) - timeLabelMinutes(right.timeLabel) ||
        left.timeLabel.localeCompare(right.timeLabel),
      ),
      ...[...recentPastBookings].sort((left, right) =>
        right.appointmentDate.getTime() - left.appointmentDate.getTime() ||
        timeLabelMinutes(right.timeLabel) - timeLabelMinutes(left.timeLabel) ||
        right.timeLabel.localeCompare(left.timeLabel),
      ),
    ]
      .map((booking) => ({
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
