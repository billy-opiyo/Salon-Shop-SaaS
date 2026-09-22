export const THEME_PRESET_OPTIONS = [
	{ key: "gold", label: "Gold", swatch: "#c8963e" },
	{ key: "champagne", label: "Champagne", swatch: "#d6b16a" },
	{ key: "rose-gold", label: "Rose Gold", swatch: "#b76e79" },
	{ key: "emerald", label: "Emerald", swatch: "#2f9b7e" },
	{ key: "plum-gold", label: "Plum Gold", swatch: "#d4a94f" },
	{ key: "terracotta", label: "Terracotta", swatch: "#c76b45" },
	{ key: "teal", label: "Teal", swatch: "#2bb3a3" },
	{ key: "blush", label: "Blush", swatch: "#e8a7b6" },
	{ key: "lavender", label: "Lavender", swatch: "#a78bfa" },
] as const

export type ThemePresetKey = (typeof THEME_PRESET_OPTIONS)[number]["key"]

export const DEFAULT_THEME_PRESET: ThemePresetKey = "gold"

export function isThemePreset(value: string): value is ThemePresetKey {
	return THEME_PRESET_OPTIONS.some((preset) => preset.key === value)
}
