import { z } from "zod";

import { BOOKING_PAYMENT_MODES } from "@shared/constants/bookingPayments"
import { BOOKING_TIME_SLOTS } from "@shared/constants/bookingAvailability"

const bookingPaymentModeSchema = z.enum(BOOKING_PAYMENT_MODES)

export const bookingRequestSchema = z.object({
  tenantSlug: z.string().trim().min(3).max(48),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(7).max(32),
  serviceId: z.string().trim().cuid().optional(),
  serviceName: z.string().trim().min(1).max(160),
  customService: z.string().trim().max(160).optional(),
  appointmentDate: z.string().date(),
  timeLabel: z.string().trim().refine((value) => BOOKING_TIME_SLOTS.includes(value), {
    message: "Choose an available appointment time.",
  }),
  stylistId: z.string().trim().cuid().optional(),
  waitlistId: z.string().trim().cuid().optional(),
  specialRequests: z.string().trim().max(2000).optional(),
  paymentMode: bookingPaymentModeSchema.optional(),
  turnstileToken: z.string().trim().min(1).max(2048),
});

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;

export const waitlistRequestSchema = z.object({
  tenantSlug: z.string().trim().min(3).max(48),
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(7).max(32),
  serviceName: z.string().trim().min(1).max(160),
  preferredDate: z.string().date().optional(),
  preferredTime: z.string().trim().refine((value) => value === undefined || BOOKING_TIME_SLOTS.includes(value), {
    message: "Choose a valid booked appointment time.",
  }).optional(),
  preferredStylist: z.string().trim().max(120).optional(),
  turnstileToken: z.string().trim().min(1).max(2048),
});

export type WaitlistRequestInput = z.infer<typeof waitlistRequestSchema>;
