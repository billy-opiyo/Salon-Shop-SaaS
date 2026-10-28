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
	{ key: "storefront-default", label: "Storefront Default", swatch: "#c8963e" },
] as const

export type ThemePresetKey = (typeof THEME_PRESET_OPTIONS)[number]["key"]
export const DEFAULT_THEME_PRESET: ThemePresetKey = "storefront-default"

export function isThemePreset(value: string): value is ThemePresetKey {
	return THEME_PRESET_OPTIONS.some((preset) => preset.key === value)
}

export interface ThemePalette {
	readonly primary: string
	readonly primaryDark: string
	readonly primaryLight: string
	readonly background: string
	readonly surface: string
	readonly foreground: string
	readonly muted: string
	readonly line: string
}

export const SALON_THEME_PALETTES: Readonly<Record<ThemePresetKey, ThemePalette>> = {
	gold: { primary: "#c8963e", primaryDark: "#a6792d", primaryLight: "#e8c27a", background: "#0a0a0a", surface: "#1a1a1a", foreground: "#f5f0eb", muted: "#a09888", line: "#2a2520" },
	champagne: { primary: "#d6b16a", primaryDark: "#a88445", primaryLight: "#f0d89a", background: "#050505", surface: "#171717", foreground: "#f7f2e8", muted: "#a99f8d", line: "#2d261b" },
	"rose-gold": { primary: "#b76e79", primaryDark: "#8f4f59", primaryLight: "#e6b7be", background: "#120a0d", surface: "#24161b", foreground: "#fff4f6", muted: "#c8a7ad", line: "#3a242b" },
	emerald: { primary: "#2f9b7e", primaryDark: "#1f6f5b", primaryLight: "#b7e1c7", background: "#06130f", surface: "#102a21", foreground: "#f4efe3", muted: "#b8aa91", line: "#1f4035" },
	"plum-gold": { primary: "#d4a94f", primaryDark: "#9f7932", primaryLight: "#f0cf7a", background: "#100713", surface: "#231129", foreground: "#fff4e6", muted: "#bfa9b9", line: "#38203f" },
	terracotta: { primary: "#c76b45", primaryDark: "#91462b", primaryLight: "#e8a37f", background: "#1a0f0a", surface: "#2f1b13", foreground: "#fff1e8", muted: "#c7a292", line: "#4a2b1f" },
	teal: { primary: "#2bb3a3", primaryDark: "#168174", primaryLight: "#8fe3da", background: "#061112", surface: "#10292c", foreground: "#f1ffff", muted: "#a7c7c9", line: "#1e3e42" },
	blush: { primary: "#e8a7b6", primaryDark: "#c9788b", primaryLight: "#f7d7de", background: "#160b10", surface: "#2b1720", foreground: "#fff7fa", muted: "#dab7c2", line: "#422632" },
	lavender: { primary: "#a78bfa", primaryDark: "#7c5fd6", primaryLight: "#d8ccff", background: "#0f0b18", surface: "#211832", foreground: "#faf7ff", muted: "#c8bce0", line: "#37294c" },
	"storefront-default": { primary: "#c8963e", primaryDark: "#a6792d", primaryLight: "#e8c27a", background: "#0a0a0a", surface: "#1a1a1a", foreground: "#f5f0eb", muted: "#a09888", line: "#2a2520" },
}

export const PLATFORM_THEME_PRESET_OPTIONS = [
	{ key: "beauty-sphia", label: "Beauty Sphia", swatch: "#d7a84f" },
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

export type PlatformThemePresetKey = (typeof PLATFORM_THEME_PRESET_OPTIONS)[number]["key"]
export const DEFAULT_PLATFORM_THEME_PRESET: PlatformThemePresetKey = "beauty-sphia"

export const PLATFORM_THEME_PALETTES: Readonly<Record<PlatformThemePresetKey, ThemePalette>> = {
	"beauty-sphia": { primary: "#d7a84f", primaryDark: "#a96f23", primaryLight: "#f1d59b", background: "#0c0a07", surface: "#221b11", foreground: "#fff8e8", muted: "#c8bda8", line: "#5b4728" },
	...SALON_THEME_PALETTES,
}
