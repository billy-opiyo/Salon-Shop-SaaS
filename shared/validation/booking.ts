import { z } from "zod";

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
  timeLabel: z.string().trim().min(1).max(40),
  stylistId: z.string().trim().cuid().optional(),
  specialRequests: z.string().trim().max(2000).optional(),
  turnstileToken: z.string().trim().min(1).max(2048),
});

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;
