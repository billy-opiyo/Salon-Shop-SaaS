import { z } from "zod";

export const bookingStatusSchema = z.enum(["PENDING", "CONFIRMED", "WAITLISTED", "COMPLETED", "CANCELLED"]);

export const bookingStatusUpdateSchema = z.object({
  tenantSlug: z.string().trim().min(3).max(48),
  bookingId: z.string().trim().cuid(),
  status: bookingStatusSchema,
});

export type BookingStatusUpdateInput = z.infer<typeof bookingStatusUpdateSchema>;
