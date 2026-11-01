import "server-only";

import { BookingStatus, Prisma } from "@prisma/client";

import { prisma } from "@backend/db/prisma";
import {
	notifyBookingCustomer,
	notifyNextWaitlistedCustomer,
} from "@backend/services/notificationService";
import { assertTenantMembership, assertTenantPermission, type TenantMembershipContext } from "@backend/services/authorization";
import { expireBookingPayment } from "@backend/services/bookingPaymentService";
import type { BookingStatusUpdateInput } from "@shared/validation/merchant";

const ALLOWED_TRANSITIONS: Readonly<Record<BookingStatus, readonly BookingStatus[]>> = {
  PENDING: [BookingStatus.CONFIRMED, BookingStatus.WAITLISTED, BookingStatus.CANCELLED],
  CONFIRMED: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
  // Waitlisted bookings must be converted through the slot-locking waitlist
  // workflow, or cancelled from the linked waitlist request.
  WAITLISTED: [],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
  NO_SHOW: [],
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
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      serviceName: true,
      stylist: { select: { name: true } },
      appointmentDate: true,
      timeLabel: true,
      status: true,
      specialRequests: true,
      inspirationImageUrl: true,
      waitlistEntry: { select: { id: true } },
			payments: {
				orderBy: { createdAt: "desc" },
				take: 1,
				select: {
					id: true,
					status: true,
					paymentMode: true,
					amountMinor: true,
					currency: true,
					collectionMethod: true,
					collectionNumber: true,
					mpesaReceiptNumber: true,
					resultDescription: true,
				},
			},
      createdAt: true,
    },
  });
}

export async function reviewManualBookingPaymentForUser(
	userId: string,
	tenantSlug: string,
	paymentId: string,
	decision: "approve" | "reject",
): Promise<void> {
	const membership = await getBookingMembership(userId, tenantSlug)
	if (membership.role !== "OWNER")
		throw new MerchantBookingError("Only the salon owner can review manual booking payments.")
	const payment = await prisma.bookingPayment.findFirst({
		where: { id: paymentId, tenantId: membership.tenantId },
		select: {
			id: true,
			status: true,
			paymentMode: true,
			amountMinor: true,
			serviceTotalMinor: true,
			currency: true,
			collectionMethod: true,
			collectionNumber: true,
			mpesaReceiptNumber: true,
			expiresAt: true,
			bookingId: true,
			booking: {
				select: {
					status: true,
					email: true,
					phone: true,
					firstName: true,
					lastName: true,
					serviceName: true,
					appointmentDate: true,
					timeLabel: true,
					tenant: { select: { businessName: true } },
				},
			},
		},
	})
	if (!payment || payment.collectionMethod === "platform-stk" || !payment.mpesaReceiptNumber)
		throw new MerchantBookingError("There is no manual receipt awaiting review for this payment.")
	if (payment.status !== "pending")
		throw new MerchantBookingError("This booking payment has already been reviewed or is no longer active.")
	if (payment.expiresAt && payment.expiresAt <= new Date()) {
		await expireBookingPayment(payment.id, "Manual payment review window expired.")
		throw new MerchantBookingError("This manual payment window has expired; the receipt cannot be approved.")
	}
	if (payment.booking.status !== "PENDING")
		throw new MerchantBookingError("This booking is no longer awaiting confirmation.")
	await prisma.$transaction(async (transaction) => {
		const updated = await transaction.bookingPayment.updateMany({
			where: {
				id: payment.id,
				tenantId: membership.tenantId,
				status: "pending",
				mpesaReceiptNumber: payment.mpesaReceiptNumber,
			},
			data: decision === "approve"
				? { status: "succeeded", resultDescription: "Manual M-Pesa receipt approved by salon owner.", completedAt: new Date() }
				: { status: "pending", mpesaReceiptNumber: null, resultDescription: "Receipt declined by salon owner. Client may submit a corrected receipt." },
		})
		if (updated.count !== 1)
			throw new MerchantBookingError("This receipt changed before the review completed.")
		if (decision === "approve") {
			const bookingUpdate = await transaction.booking.updateMany({
				where: { id: payment.bookingId, tenantId: membership.tenantId, status: "PENDING" },
				data: { status: "CONFIRMED" },
			})
			if (bookingUpdate.count !== 1)
				throw new MerchantBookingError("The booking changed before the payment review completed.")
			const balanceMinor = payment.serviceTotalMinor - payment.amountMinor
			if (balanceMinor > 0) {
				await transaction.bookingPayment.create({
					data: {
						tenantId: membership.tenantId,
						bookingId: payment.bookingId,
						paymentMode: "after_service",
						amountMinor: balanceMinor,
						serviceTotalMinor: payment.serviceTotalMinor,
						currency: payment.currency,
						status: "deferred",
						collectionMethod: payment.collectionMethod,
						collectionNumber: payment.collectionNumber,
					},
				})
			}
		}
		await transaction.adminAuditLog.create({
			data: {
				tenantId: membership.tenantId,
				actorUserId: userId,
				action: `booking.payment.manual.${decision}`,
				resourceType: "booking_payment",
				resourceId: payment.id,
				metadata: { bookingId: payment.bookingId, receipt: payment.mpesaReceiptNumber } as Prisma.InputJsonValue,
			},
		})
	})
	if (decision === "approve" && payment.booking.email) {
		await notifyBookingCustomer({
			tenantId: membership.tenantId,
			bookingId: payment.bookingId,
			businessName: payment.booking.tenant.businessName,
			templateKey: "booking.payment_confirmed",
			customer: {
				firstName: payment.booking.firstName,
				lastName: payment.booking.lastName,
				email: payment.booking.email,
				phone: payment.booking.phone,
			},
			serviceName: payment.booking.serviceName,
			appointmentDate: payment.booking.appointmentDate,
			timeLabel: payment.booking.timeLabel,
		})
	}
}

export async function updateBookingStatusForUser(userId: string, input: BookingStatusUpdateInput): Promise<void> {
  const membership = await getBookingMembership(userId, input.tenantSlug);
  assertTenantPermission(membership, "canManageBookings");

  let releasedSlot: {
    readonly appointmentDate: Date;
    readonly timeLabel: string;
    readonly stylistName: string | null;
  } | null = null;
  await prisma.$transaction(async (transaction) => {
    const current = await transaction.booking.findFirst({
      where: { id: input.bookingId, tenantId: membership.tenantId },
      select: {
        status: true,
        appointmentDate: true,
        timeLabel: true,
        stylist: { select: { name: true } },
        bookingSlot: { select: { id: true } },
      },
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

    if (
      (input.status === BookingStatus.CANCELLED ||
        input.status === BookingStatus.COMPLETED) &&
      current.bookingSlot
    ) {
      await transaction.bookingSlot.update({ where: { id: current.bookingSlot.id }, data: { bookingId: null, lockedUntil: null } });
      if (current.status !== BookingStatus.WAITLISTED) {
        releasedSlot = {
          appointmentDate: current.appointmentDate,
          timeLabel: current.timeLabel,
          stylistName: current.stylist?.name ?? null,
        };
      }
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
          stylist: { select: { name: true } },
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
    if (releasedSlot) {
      await notifyNextWaitlistedCustomer(membership.tenantId, releasedSlot);
    }
  }
}
