import type { CSSProperties } from "react"
import type { PlatformTheme } from "@shared/constants/platformStorefront"

export function platformThemeStyle(theme: PlatformTheme): CSSProperties {
	return {
		"--platform-theme-preset": theme.preset,
		"--gold": theme.primary,
		"--primary": theme.primary,
		"--gold-dark": theme.primaryDark,
		"--primary-dark": theme.primaryDark,
		"--gold-soft": theme.primaryLight,
		"--primary-light": theme.primaryLight,
		"--background": theme.background,
		"--bg-primary": theme.background,
		"--surface": theme.surface,
		"--bg-card": theme.surface,
		"--foreground": theme.foreground,
		"--text-primary": theme.foreground,
		"--muted": theme.muted,
		"--text-secondary": theme.muted,
		"--line": theme.line,
		"--platform-line": theme.line,
		"--glass-border": theme.line,
	} as CSSProperties
}
