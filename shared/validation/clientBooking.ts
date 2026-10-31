import { z } from "zod"
import { BOOKING_TIME_SLOTS } from "@shared/constants/bookingAvailability"

export const clientBookingActionSchema = z.object({
	tenantSlug: z.string().trim().min(3).max(48),
	bookingId: z.string().trim().cuid(),
})

export type ClientBookingActionInput = z.infer<typeof clientBookingActionSchema>

export const clientRescheduleSchema = clientBookingActionSchema.extend({
	appointmentDate: z.string().date(),
	timeLabel: z.string().trim().refine((value) => BOOKING_TIME_SLOTS.includes(value), "Choose an available appointment time."),
	stylistId: z.string().trim().cuid().optional(),
})

export type ClientRescheduleInput = z.infer<typeof clientRescheduleSchema>
