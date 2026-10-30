import { Home, Scissors, Sparkles } from "lucide-react"
import Link from "next/link"

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

export function PlatformMobileActions({
	active,
}: {
	readonly active?: PlatformActionIconName
}) {
	const links = [
		{ name: "home", label: "Home", href: active === "home" ? "#home" : "/" },
		{ name: "salons", label: "Salons", href: active === "salons" ? "/stores#home" : "/stores" },
		{ name: "start", label: "Start Your Salon", href: active === "start" ? "/onboarding#onboarding-title" : "/onboarding" },
	] as const

	return (
		<nav className="platform-mobile-actions" aria-label="Mobile platform navigation">
			{links.map((item) => (
				<Link
					key={item.name}
					href={item.href}
					prefetch={item.name !== active && item.href !== "#home"}
					aria-current={active === item.name ? "page" : undefined}
				>
					<PlatformActionIcon name={item.name} />
					<span>{item.label}</span>
				</Link>
			))}
		</nav>
	)
}
