export function normalizeKenyanMpesaPhone(value: string): string {
	const digits = value.replace(/\D/g, "")
	if (
		(digits.startsWith("01") || digits.startsWith("07")) &&
		digits.length === 10
	)
		return `254${digits.slice(1)}`
	if ((digits.startsWith("1") || digits.startsWith("7")) && digits.length === 9)
		return `254${digits}`
	if (
		digits.startsWith("254") &&
		(digits[3] === "1" || digits[3] === "7") &&
		digits.length === 12
	)
		return digits
	throw new Error("Enter a valid Kenyan M-Pesa phone number.")
}
