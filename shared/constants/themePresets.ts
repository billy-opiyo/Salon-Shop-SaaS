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
	{ key: "sapphire", label: "Sapphire Satin", swatch: "#68a9e8" },
	{ key: "copper-glow", label: "Copper Glow", swatch: "#c97a56" },
	{ key: "pearl-veil", label: "Pearl Veil", swatch: "#e7d9c4" },
	{ key: "sage-botanica", label: "Sage Botanica", swatch: "#91a88e" },
	{ key: "coral-bloom", label: "Coral Bloom", swatch: "#e77c70" },
	{ key: "berry-velvet", label: "Berry Velvet", swatch: "#c24c76" },
	{ key: "mocha-luxe", label: "Mocha Luxe", swatch: "#b78b68" },
	{ key: "ocean-silk", label: "Ocean Silk", swatch: "#51bcc8" },
	{ key: "ruby-atelier", label: "Ruby Atelier", swatch: "#c74754" },
	{ key: "mint-ritual", label: "Mint Ritual", swatch: "#58bda4" },
	{ key: "sunset-muse", label: "Sunset Muse", swatch: "#e88d53" },
	{ key: "onyx-ivory", label: "Onyx & Ivory", swatch: "#ceb887" },
	{ key: "lilac-reverie", label: "Lilac Reverie", swatch: "#bc9be8" },
	{ key: "cobalt-crown", label: "Cobalt Crown", swatch: "#5678dd" },
	{ key: "apricot-rose", label: "Apricot Rose", swatch: "#f0a875" },
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
	sapphire: { primary: "#68a9e8", primaryDark: "#3379b7", primaryLight: "#c3e2ff", background: "#07111f", surface: "#101f33", foreground: "#f2f7ff", muted: "#a8bcd4", line: "#263d58" },
	"copper-glow": { primary: "#c97a56", primaryDark: "#91492f", primaryLight: "#f0b08f", background: "#170d09", surface: "#2a1811", foreground: "#fff4ed", muted: "#c7a392", line: "#4b3024" },
	"pearl-veil": { primary: "#e7d9c4", primaryDark: "#b99b73", primaryLight: "#fff3df", background: "#17120e", surface: "#2a2119", foreground: "#fff9f0", muted: "#cbbda9", line: "#493b2b" },
	"sage-botanica": { primary: "#91a88e", primaryDark: "#5d765a", primaryLight: "#d3e2c7", background: "#0b120d", surface: "#19251b", foreground: "#f4f8ed", muted: "#b3c2ad", line: "#314735" },
	"coral-bloom": { primary: "#e77c70", primaryDark: "#b94e48", primaryLight: "#ffc0b1", background: "#190c0d", surface: "#2b1719", foreground: "#fff5f1", muted: "#d4aaa1", line: "#4b292b" },
	"berry-velvet": { primary: "#c24c76", primaryDark: "#8d3154", primaryLight: "#f0a6bf", background: "#160912", surface: "#291322", foreground: "#fff4f8", muted: "#d2a8b9", line: "#48253a" },
	"mocha-luxe": { primary: "#b78b68", primaryDark: "#805b40", primaryLight: "#e3c1a0", background: "#130e0a", surface: "#251a13", foreground: "#fff6ec", muted: "#c7b19d", line: "#433124" },
	"ocean-silk": { primary: "#51bcc8", primaryDark: "#287f8b", primaryLight: "#a8edf0", background: "#061216", surface: "#10262b", foreground: "#effbfc", muted: "#a4c7cb", line: "#24434a" },
	"ruby-atelier": { primary: "#c74754", primaryDark: "#8e2938", primaryLight: "#f2a0a4", background: "#16090c", surface: "#291317", foreground: "#fff4f3", muted: "#d1a6a7", line: "#48252b" },
	"mint-ritual": { primary: "#58bda4", primaryDark: "#2d806d", primaryLight: "#a7e8d4", background: "#07130f", surface: "#132720", foreground: "#f1fbf6", muted: "#a9c9bb", line: "#27483c" },
	"sunset-muse": { primary: "#e88d53", primaryDark: "#ad592c", primaryLight: "#ffd0a3", background: "#190d08", surface: "#2d1a11", foreground: "#fff5ea", muted: "#d0ad91", line: "#4d3020" },
	"onyx-ivory": { primary: "#ceb887", primaryDark: "#93805a", primaryLight: "#f3e6c4", background: "#090909", surface: "#1c1b18", foreground: "#fbf8ef", muted: "#b7b1a2", line: "#39352c" },
	"lilac-reverie": { primary: "#bc9be8", primaryDark: "#8767b4", primaryLight: "#e5d2ff", background: "#100c18", surface: "#21182d", foreground: "#faf6ff", muted: "#c1b3d2", line: "#3c2d50" },
	"cobalt-crown": { primary: "#5678dd", primaryDark: "#354da0", primaryLight: "#b1c5ff", background: "#080d1b", surface: "#151d34", foreground: "#f3f5ff", muted: "#acb8d8", line: "#2b385f" },
	"apricot-rose": { primary: "#f0a875", primaryDark: "#b66c42", primaryLight: "#ffdbba", background: "#190e0a", surface: "#2d1b14", foreground: "#fff7f0", muted: "#d2b19d", line: "#4b3025" },
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
