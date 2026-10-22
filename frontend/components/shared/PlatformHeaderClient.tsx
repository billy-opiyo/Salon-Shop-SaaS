"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { Menu, UserRound, X } from "lucide-react"
import { PlatformBrandMark } from "@/components/shared/PlatformBrandMark"
import { SiteSearch, type SiteSearchEntry } from "@/components/shared/SiteSearch"

interface PlatformHeaderClientProps {
	readonly page: "home" | "stores" | "about" | "support"
	readonly logoUrl: string
	readonly isSignedIn: boolean
}

const platformSearchEntries: readonly SiteSearchEntry[] = [
	{ label: "Home", description: "Beauty Sphia salon platform", href: "/", keywords: "platform salon management" },
	{ label: "Salons", description: "Explore live salon storefronts", href: "/stores", keywords: "salons directory browse" },
	{ label: "About Beauty Sphia", description: "Meet the people behind the platform", href: "/about", keywords: "team people" },
	{ label: "Salon Owner Support", description: "Setup, bookings, billing, and account help", href: "/support", keywords: "help support" },
	{ label: "Pricings", description: "Compare salon plans and included features", href: "/#plans", keywords: "plans prices pricing subscription" },
	{ label: "Top Salons Available", description: "Discover salons on Beauty Sphia", href: "/#top-stores", keywords: "directory salons" },
	{ label: "How it works", description: "Create, customize, and grow your salon", href: "/#how-it-works", keywords: "create customize grow" },
	{ label: "Contact", description: "Send a message to the Beauty Sphia team", href: "/#contact", keywords: "email message" },
]

export function PlatformHeaderClient({ page, logoUrl, isSignedIn }: PlatformHeaderClientProps) {
	const [menuOpen, setMenuOpen] = useState(false)
	const [accountMenuOpen, setAccountMenuOpen] = useState(false)
	const router = useRouter()
	const accountMenuRef = useRef<HTMLDivElement>(null)
	const accountTriggerRef = useRef<HTMLButtonElement>(null)
	const isHome = page === "home"
	const homeHref = isHome ? "#home" : "/"
	const plansHref = isHome ? "#plans" : "/#plans"
	const brand = <>
		<Image className="brand-mark__image" src={logoUrl} alt="Beauty Sphia logo" unoptimized width={48} height={48} />
		<span className="brand-mark__copy">
			<strong className="brand-mark__title">Beauty <span className="brand-mark__s">S<svg viewBox="0 0 24 16" aria-hidden="true" focusable="false"><path d="m3 5 4 4 5-6 5 6 4-4-2 10H5L3 5Z" /><path d="M5 18h14" /></svg></span>phia</strong>
			<span className="brand-mark__tagline">Manage | Book | Grow</span>
		</span>
	</>

	useEffect(() => {
		if (!accountMenuOpen) return

		const closeOnOutsideClick = (event: PointerEvent) => {
			if (event.target instanceof Node && !accountMenuRef.current?.contains(event.target)) setAccountMenuOpen(false)
		}
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setAccountMenuOpen(false)
				accountTriggerRef.current?.focus()
			}
		}
		document.addEventListener("pointerdown", closeOnOutsideClick)
		document.addEventListener("keydown", closeOnEscape)
		return () => {
			document.removeEventListener("pointerdown", closeOnOutsideClick)
			document.removeEventListener("keydown", closeOnEscape)
		}
	}, [accountMenuOpen])

	const handleSignOut = async () => {
		setAccountMenuOpen(false)
		await signOut({ redirect: false })
		router.replace("/")
		router.refresh()
	}

	return <header className="platform-header">
		{isHome ? <PlatformBrandMark>{brand}</PlatformBrandMark> : <Link className="brand-mark" href="/" aria-label="Beauty Sphia homepage">{brand}</Link>}
		<nav id="platform-navigation" className={"platform-nav" + (menuOpen ? " is-open" : "")} aria-label="Platform navigation">
			<Link href={homeHref} onClick={() => setMenuOpen(false)}>Home</Link>
			<Link href="/stores" onClick={() => setMenuOpen(false)}>Salons</Link>
			<Link href={plansHref} onClick={() => setMenuOpen(false)}>Pricings</Link>
			<Link href="/about" onClick={() => setMenuOpen(false)}>About</Link>
			<Link href="/support" onClick={() => setMenuOpen(false)}>Support</Link>
		</nav>
		<div className="platform-header__actions">
			<SiteSearch entries={platformSearchEntries} label="Beauty Sphia" />
			<div className="platform-account" ref={accountMenuRef}>
				<button
					ref={accountTriggerRef}
					className="platform-account__trigger"
					type="button"
					aria-label={isSignedIn ? "Open account menu" : "Open login and signup menu"}
					aria-haspopup="menu"
					aria-expanded={accountMenuOpen}
					aria-controls="platform-account-menu"
					onClick={() => setAccountMenuOpen((open) => !open)}
				>
					<UserRound size={21} strokeWidth={1.8} aria-hidden="true" />
					<span>{isSignedIn ? "Account" : "Log in"}</span>
				</button>
				{accountMenuOpen && <div className="platform-account__menu" id="platform-account-menu" role="menu" aria-label="Account options">
					{isSignedIn ? <>
						<Link href="/manage" role="menuitem" onClick={() => setAccountMenuOpen(false)}>Accounts</Link>
						<button type="button" role="menuitem" onClick={handleSignOut}>Log out</button>
					</> : <>
						<Link href="/login" role="menuitem" onClick={() => setAccountMenuOpen(false)}>Log in</Link>
						<Link href="/signup" role="menuitem" onClick={() => setAccountMenuOpen(false)}>Sign up</Link>
					</>}
				</div>}
			</div>
			<button className={"platform-menu-toggle" + (menuOpen ? " is-open" : "")} type="button" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} aria-controls="platform-navigation" onClick={() => setMenuOpen((value) => !value)}>
				{menuOpen ? <X size={21} strokeWidth={1.8} aria-hidden="true" /> : <Menu size={21} strokeWidth={1.8} aria-hidden="true" />}
			</button>
		</div>
	</header>
}
