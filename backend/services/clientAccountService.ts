import "server-only";

import { prisma } from "@backend/db/prisma";

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

export interface ClientAccountSnapshot {
  readonly profile: {
    readonly name: string | null;
    readonly email: string;
    readonly phone: string | null;
    readonly image: string | null;
  };
  readonly bookings: readonly {
    readonly id: string;
    readonly serviceName: string;
    readonly appointmentDate: string;
    readonly timeLabel: string;
    readonly status: string;
    readonly stylistName: string | null;
    readonly specialRequests: string | null;
  }[];
  readonly reviews: readonly {
    readonly id: string;
    readonly serviceName: string | null;
    readonly rating: number;
    readonly text: string;
    readonly status: string;
    readonly createdAt: string;
  }[];
  readonly favorites: readonly {
    readonly id: string;
    readonly styleName: string;
    readonly imageUrl: string;
    readonly category: string | null;
  }[];
  readonly loginHistory: readonly {
    readonly id: string;
    readonly provider: string;
    readonly status: string;
    readonly riskLevel: string | null;
    readonly userAgent: string | null;
    readonly country: string | null;
    readonly createdAt: string;
  }[];
}

export async function getClientAccountSnapshot(
  userId: string,
  tenantSlug: string,
): Promise<ClientAccountSnapshot> {
  const normalizedSlug = normalizeTenantSlug(tenantSlug);
  const tenant = await prisma.tenant.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true, status: true },
  });
  if (!tenant || tenant.status !== "ACTIVE") {
    throw new ClientAccountError("This salon is not currently available.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, phone: true, image: true },
  });
  if (!user) throw new ClientAccountError("Your account could not be found.");

  const [bookings, reviews, favorites, loginHistory] = await Promise.all([
    prisma.booking.findMany({
      where: {
        tenantId: tenant.id,
        OR: [{ userId }, { email: user.email.toLowerCase() }],
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
        stylist: { select: { name: true } },
      },
    }),
    prisma.review.findMany({
      where: { tenantId: tenant.id, userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        serviceName: true,
        rating: true,
        text: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.favorite.findMany({
      where: { tenantId: tenant.id, userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        galleryStyle: {
          select: {
            styleName: true,
            imageUrl: true,
            category: { select: { label: true } },
          },
        },
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
    bookings: bookings.map((booking) => ({
      id: booking.id,
      serviceName: booking.serviceName,
      appointmentDate: booking.appointmentDate.toISOString().slice(0, 10),
      timeLabel: booking.timeLabel,
      status: booking.status.toLowerCase(),
      stylistName: booking.stylist?.name ?? null,
      specialRequests: booking.specialRequests,
    })),
    reviews: reviews.map((review) => ({
      id: review.id,
      serviceName: review.serviceName,
      rating: review.rating,
      text: review.text,
      status: review.status.toLowerCase(),
      createdAt: review.createdAt.toISOString(),
    })),
    favorites: favorites.map((favorite) => ({
      id: favorite.id,
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
