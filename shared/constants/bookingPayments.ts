export const BOOKING_PAYMENT_MODES = [
	"partial",
	"full",
	"after_service",
] as const

export type BookingPaymentMode = (typeof BOOKING_PAYMENT_MODES)[number]

export const DEFAULT_BOOKING_PAYMENT_MODES: readonly BookingPaymentMode[] = [
	"partial",
	"full",
	"after_service",
]

export const SALON_BOOKING_COLLECTION_METHODS = [
	"paybill",
	"till",
	"registered-phone",
] as const

export type SalonBookingCollectionMethod =
	(typeof SALON_BOOKING_COLLECTION_METHODS)[number]

export function isSalonBookingCollectionConfigured(
	method: unknown,
	destination: string | null | undefined,
): method is SalonBookingCollectionMethod {
	if (!SALON_BOOKING_COLLECTION_METHODS.includes(method as SalonBookingCollectionMethod))
		return false
	const digits = (destination ?? "").replace(/\D/g, "")
	if (method === "registered-phone")
		return (digits.startsWith("254") && digits.length === 12 && /^[17]/.test(digits.slice(3))) ||
			(digits.startsWith("0") && digits.length === 10 && /^[17]/.test(digits.slice(1))) ||
			((digits.startsWith("1") || digits.startsWith("7")) && digits.length === 9)
	return digits.length >= 5 && digits.length <= 8
}

export interface BookingPaymentPolicy {
	readonly enabled: boolean
	readonly modes: readonly BookingPaymentMode[]
	readonly depositPercent: number
}

export interface ResolvedBookingPaymentPlan {
	readonly mode: BookingPaymentMode
	readonly amountMinor: number
	readonly serviceTotalMinor: number
	readonly status: "pending" | "deferred"
	readonly expiresAt: Date | null
}

export function calculateBookingPaymentAmount(
	mode: BookingPaymentMode,
	serviceTotalMinor: number,
	depositPercent: number,
): number {
	if (!Number.isSafeInteger(serviceTotalMinor) || serviceTotalMinor < 0)
		throw new RangeError("The service amount is invalid.")
	if (!Number.isInteger(depositPercent) || depositPercent < 1 || depositPercent > 100)
		throw new RangeError("The deposit percentage is invalid.")
	if (mode === "full") return serviceTotalMinor
	if (mode === "partial")
		return Math.max(1, Math.ceil((serviceTotalMinor * depositPercent) / 100))
	return serviceTotalMinor
}

export function resolveBookingPaymentPlan(input: {
	readonly enabled: boolean
	readonly configuredModes: unknown
	readonly depositPercent: number
	readonly servicePriceMinor: number | null | undefined
	readonly orderOnly: boolean
	readonly requestedMode?: BookingPaymentMode
	readonly now?: Date
}): ResolvedBookingPaymentPlan | null {
	if (!input.enabled || input.orderOnly) return null
	const modes = Array.isArray(input.configuredModes)
		? input.configuredModes.filter((mode): mode is BookingPaymentMode =>
				BOOKING_PAYMENT_MODES.includes(mode as BookingPaymentMode),
			)
		: []
	if (modes.length === 0) return null
	const mode = input.requestedMode ?? modes[0]
	if (!modes.includes(mode))
		throw new Error("That payment option is not currently available for this salon.")
	if (
		input.servicePriceMinor === null ||
		input.servicePriceMinor === undefined ||
		!Number.isSafeInteger(input.servicePriceMinor) ||
		input.servicePriceMinor <= 0
	)
		throw new Error("This service needs a numeric price before online payment can be used.")
	const amountMinor = calculateBookingPaymentAmount(
		mode,
		input.servicePriceMinor,
		input.depositPercent,
	)
	return {
		mode,
		amountMinor,
		serviceTotalMinor: input.servicePriceMinor,
		status: mode === "after_service" ? "deferred" : "pending",
		expiresAt:
			mode === "after_service"
				? null
				: new Date((input.now ?? new Date()).getTime() + 15 * 60 * 1000),
	}
}
