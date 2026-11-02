export function normalizeCssColor(value: string): string | null {
	const color = value.trim()
	const hex = color.match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1]
	if (hex) {
		const expanded = hex.length === 3 ? [...hex].map((part) => part + part).join("") : hex
		return `#${expanded.toLowerCase()}`
	}
	const rgb = color.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d*\.?\d+))?\s*\)$/i)
	if (!rgb || (rgb[4] !== undefined && Number(rgb[4]) === 0)) return null
	const channels = rgb.slice(1, 4).map((channel) => Math.max(0, Math.min(255, Math.round(Number(channel)))))
	return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`
}

export function isLightColor(hex: string): boolean {
	const channels = hex.slice(1).match(/.{2}/g)?.map((part) => parseInt(part, 16) / 255) ?? [0, 0, 0]
	const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
	return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2] > 0.48
}
