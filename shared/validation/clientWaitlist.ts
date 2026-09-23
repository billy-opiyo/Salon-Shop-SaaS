import { z } from "zod"

export const clientWaitlistQueueSchema = z
	.object({
		tenantSlug: z.string().trim().min(3).max(48),
		bookingId: z.string().trim().cuid().optional(),
		waitlistId: z.string().trim().cuid().optional(),
	})
	.refine((value) => Boolean(value.bookingId || value.waitlistId), {
		message: "Booking ID or waitlist ID is required.",
	})

export type ClientWaitlistQueueInput = z.infer<
	typeof clientWaitlistQueueSchema
>
