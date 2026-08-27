import Link from "next/link"
import Image from "next/image"

import { PlatformBrandMark } from "@/components/shared/PlatformBrandMark"

interface PlatformHeaderProps {
	/** Which page is currently being viewed, to resolve in-page anchors. */
	readonly page?: "home" | "stores"
}

/**
 * Shared platform masthead. On the home page it keeps the in-page hash links
 * and the scroll-to-top brand mark; on the /stores page links resolve to the
 * full routes so navigation works from the directory page.
 */
export function PlatformHeader({ page = "home" }: PlatformHeaderProps) {
	const isHome = page === "home"

	const homeHref = isHome ? "#home" : "/"
	const plansHref = isHome ? "#plans" : "/#plans"
	const contactHref = isHome ? "#contact" : "/#contact"
	const browseHref = "/stores"

	const brand = (
		<>
			<Image
				className="brand-mark__image"
				src="/platform/Beauty Sphia logo.png"
				alt="Beauty Sphia logo"
				width={48}
				height={48}
			/>
			<span className="brand-mark__copy">
				<strong className="brand-mark__title">
					Beauty{" "}
					<span className="brand-mark__s">
						S
						<svg
							viewBox="0 0 24 16"
							aria-hidden="true"
							focusable="false"
						>
							<path d="m3 5 4 4 5-6 5 6 4-4-2 10H5L3 5Z" />
							<path d="M5 18h14" />
						</svg>
					</span>
					phia
				</strong>
				<span className="brand-mark__tagline">Manage · Book · Grow</span>
			</span>
		</>
	)

	return (
		<header className="platform-header">
			{isHome ? (
				<PlatformBrandMark>{brand}</PlatformBrandMark>
			) : (
				<Link
					className="brand-mark"
					href="/"
					aria-label="Beauty Sphia homepage"
				>
					{brand}
				</Link>
			)}
			<nav className="platform-nav" aria-label="Platform navigation">
				<Link href={homeHref}>Home</Link>
				<Link href={browseHref}>Browse Stores</Link>
				<Link href={plansHref}>Plans</Link>
				<Link href={contactHref}>Contact</Link>
				<Link href="/onboarding">Create Store</Link>
			</nav>
		</header>
	)
}
