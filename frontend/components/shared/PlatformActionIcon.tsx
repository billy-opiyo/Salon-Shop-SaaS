import { Home, Scissors, Sparkles } from "lucide-react"

export type PlatformActionIconName = "home" | "salons" | "start"

const icons = {
	home: Home,
	salons: Scissors,
	start: Sparkles,
}

export function PlatformActionIcon({ name }: { readonly name: PlatformActionIconName }) {
	const Icon = icons[name]
	return <Icon className="mobile-action-icon" size={22} strokeWidth={1.8} aria-hidden="true" focusable="false" />
}
