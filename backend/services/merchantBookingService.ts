import "server-only";

import { BookingStatus, Prisma } from "@prisma/client";

import { prisma } from "@backend/db/prisma";
import {
	notifyBookingCustomer,
	notifyNextWaitlistedCustomer,
} from "@backend/services/notificationService";
import { assertTenantMembership, assertTenantPermission, type TenantMembershipContext } from "@backend/services/authorization";
import type { BookingStatusUpdateInput } from "@shared/validation/merchant";

const ALLOWED_TRANSITIONS: Readonly<Record<BookingStatus, readonly BookingStatus[]>> = {
  PENDING: [BookingStatus.CONFIRMED, BookingStatus.WAITLISTED, BookingStatus.CANCELLED],
  CONFIRMED: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
  WAITLISTED: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
  COMPLETED: [],
  CANCELLED: [],
};

export class MerchantBookingError extends Error {
  readonly code = "MERCHANT_BOOKING_FAILED" as const;

  constructor(message: string) {
    super(message);
    this.name = "MerchantBookingError";
  }
}

async function getBookingMembership(userId: string, tenantSlug: string): Promise<TenantMembershipContext> {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug.toLowerCase() }, select: { id: true } });
  if (!tenant) throw new MerchantBookingError("Store not found.");
  const membership = await prisma.membership.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId } },
    select: { tenantId: true, userId: true, role: true, status: true, canManageAdmins: true, canManageBookings: true, canManageContent: true, canManageSecurity: true },
  });
  return assertTenantMembership(membership, tenant.id);
}

export async function listBookingsForUser(userId: string, tenantSlug: string) {
  const membership = await getBookingMembership(userId, tenantSlug);
  assertTenantPermission(membership, "canManageBookings");
  return prisma.booking.findMany({
    where: { tenantId: membership.tenantId },
    orderBy: [{ appointmentDate: "asc" }, { timeLabel: "asc" }],
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, serviceName: true, appointmentDate: true, timeLabel: true, status: true, specialRequests: true, createdAt: true },
  });
}

export async function updateBookingStatusForUser(userId: string, input: BookingStatusUpdateInput): Promise<void> {
  const membership = await getBookingMembership(userId, input.tenantSlug);
  assertTenantPermission(membership, "canManageBookings");

  await prisma.$transaction(async (transaction) => {
    const current = await transaction.booking.findFirst({
      where: { id: input.bookingId, tenantId: membership.tenantId },
      select: { status: true, bookingSlot: { select: { id: true } } },
    });
    if (!current) throw new MerchantBookingError("Booking not found.");
    if (!ALLOWED_TRANSITIONS[current.status].includes(input.status)) {
      throw new MerchantBookingError(`Cannot move ${current.status.toLowerCase()} booking to ${input.status.toLowerCase()}.`);
    }

    const result = await transaction.booking.updateMany({
      where: { id: input.bookingId, tenantId: membership.tenantId, status: current.status },
      data: { status: input.status },
    });
    if (result.count !== 1) throw new MerchantBookingError("The booking changed before this action completed.");

    if (input.status === BookingStatus.CANCELLED && current.bookingSlot) {
      await transaction.bookingSlot.update({ where: { id: current.bookingSlot.id }, data: { bookingId: null, lockedUntil: null } });
    }
    await transaction.adminAuditLog.create({
      data: {
        tenantId: membership.tenantId,
        actorUserId: userId,
        action: `booking.status.${input.status.toLowerCase()}`,
        resourceType: "booking",
        resourceId: input.bookingId,
        metadata: { previousStatus: current.status, nextStatus: input.status } as Prisma.InputJsonValue,
      },
    });
  });

  // Legacy parity: confirmations/completions/cancellations reach the customer
  // by email + WhatsApp, and a cancelled slot notifies the waitlist.
  if (
    input.status === BookingStatus.CONFIRMED ||
    input.status === BookingStatus.COMPLETED ||
    input.status === BookingStatus.CANCELLED
  ) {
    const [booking, tenant] = await Promise.all([
      prisma.booking.findUnique({
        where: { id: input.bookingId },
        select: {
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          serviceName: true,
          appointmentDate: true,
          timeLabel: true,
        },
      }),
      prisma.tenant.findUnique({
        where: { id: membership.tenantId },
        select: { businessName: true },
      }),
    ]);
    if (tenant && booking?.email) {
      const templateKey =
        input.status === BookingStatus.CONFIRMED
          ? "booking.confirmed"
          : input.status === BookingStatus.CANCELLED
            ? "booking.cancelled"
            : "booking.completed";
      await notifyBookingCustomer({
        tenantId: membership.tenantId,
        bookingId: input.bookingId,
        businessName: tenant.businessName,
        templateKey,
        customer: {
          firstName: booking.firstName,
          lastName: booking.lastName,
          email: booking.email,
          phone: booking.phone,
        },
        serviceName: booking.serviceName,
        appointmentDate: booking.appointmentDate,
        timeLabel: booking.timeLabel,
      });
    }
    if (input.status === BookingStatus.CANCELLED) {
      await notifyNextWaitlistedCustomer(membership.tenantId);
    }
  }
}
