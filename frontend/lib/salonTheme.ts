import type { CSSProperties } from "react"
import {
	DEFAULT_THEME_PRESET,
	SALON_THEME_PALETTES,
	isThemePreset,
} from "@shared/constants/themePresets"

export function salonThemeStyle(value: string | null | undefined): CSSProperties {
	const preset = value && isThemePreset(value) ? value : DEFAULT_THEME_PRESET
	const palette = SALON_THEME_PALETTES[preset]
	return {
		"--primary": palette.primary,
		"--primary-dark": palette.primaryDark,
		"--primary-light": palette.primaryLight,
		"--focus-gold": palette.primary,
		"--focus-gold-soft": `color-mix(in srgb, ${palette.primary} 28%, transparent)`,
		"--primary-contrast": "#0a0a0a",
		"--primary-soft": `color-mix(in srgb, ${palette.primary} 12%, transparent)`,
		"--primary-soft-strong": `color-mix(in srgb, ${palette.primary} 22%, transparent)`,
		"--primary-border": `color-mix(in srgb, ${palette.primary} 34%, transparent)`,
		"--primary-border-strong": `color-mix(in srgb, ${palette.primary} 58%, transparent)`,
		"--bg-primary": palette.background,
		"--background": palette.background,
		"--bg-secondary": `color-mix(in srgb, ${palette.background} 55%, ${palette.surface})`,
		"--bg-card": palette.surface,
		"--surface": palette.surface,
		"--bg-card-hover": `color-mix(in srgb, ${palette.surface} 78%, ${palette.foreground})`,
		"--text-primary": palette.foreground,
		"--foreground": palette.foreground,
		"--text-secondary": palette.muted,
		"--muted": palette.muted,
		"--text-muted": palette.muted,
		"--border": palette.line,
		"--line": palette.line,
		"--scrollbar-thumb": palette.primaryLight,
		"--gradient-gold": `linear-gradient(135deg, ${palette.primaryDark}, ${palette.primaryLight}, ${palette.primary})`,
	} as CSSProperties
}
