export const WAITLIST_SLOT_OCCUPIED_REASON = "slot-occupied" as const

export const WAITLIST_SLOT_OCCUPIED_MESSAGE =
	"Cannot move this waitlisted client to confirmed because the preferred slot is still occupied by another booking. Cancel or release the existing booking first, then try again."

function cleanDetailValue(value: unknown): string {
	return String(value ?? "").trim()
}

export interface WaitlistSlotOccupiedDetails {
	readonly reason: typeof WAITLIST_SLOT_OCCUPIED_REASON
	readonly slotId: string
	readonly currentBookingId: string
	readonly waitlistBookingId: string
}

export function buildWaitlistSlotOccupiedDetails(input: {
	readonly slotId?: unknown
	readonly currentBookingId?: unknown
	readonly waitlistBookingId?: unknown
} = {}): WaitlistSlotOccupiedDetails {
	return {
		reason: WAITLIST_SLOT_OCCUPIED_REASON,
		slotId: cleanDetailValue(input.slotId),
		currentBookingId: cleanDetailValue(input.currentBookingId),
		waitlistBookingId: cleanDetailValue(input.waitlistBookingId),
	}
}
