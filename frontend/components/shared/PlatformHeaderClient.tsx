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
	readonly page: "home" | "stores" | "about" | "support" | "account" | "onboarding"
	readonly logoUrl: string
	readonly brandName: string
	readonly brandTagline: string
	readonly isSignedIn: boolean
	readonly userEmail?: string | null
	readonly userImage?: string | null
	readonly canAccessPlatformAdmin: boolean
}

const getPlatformSearchEntries = (brandName: string): readonly SiteSearchEntry[] => [
	{ label: "Home", description: `${brandName} salon platform`, href: "/", keywords: "platform salon management" },
	{ label: "Salons", description: "Explore live salon storefronts", href: "/stores", keywords: "salons directory browse" },
	{ label: `About ${brandName}`, description: "Meet the people behind the platform", href: "/about", keywords: "team people" },
	{ label: "Salon Owner Support", description: "Setup, bookings, billing, and account help", href: "/support", keywords: "help support" },
	{ label: "Pricings", description: "Compare salon plans and included features", href: "/#plans", keywords: "plans prices pricing subscription" },
	{ label: "Top Salons Available", description: `Discover salons on ${brandName}`, href: "/#top-stores", keywords: "directory salons" },
	{ label: "How it works", description: "Create, customize, and grow your salon", href: "/#how-it-works", keywords: "create customize grow" },
	{ label: "Contact", description: `Send a message to the ${brandName} team`, href: "/#contact", keywords: "email message" },
]

export function PlatformHeaderClient({ page, logoUrl, brandName, brandTagline, isSignedIn, userEmail, userImage, canAccessPlatformAdmin }: PlatformHeaderClientProps) {
	const [menuOpen, setMenuOpen] = useState(false)
	const [accountMenuOpen, setAccountMenuOpen] = useState(false)
	const [accountImage, setAccountImage] = useState(userImage ?? "")
	const router = useRouter()
	const accountMenuRef = useRef<HTMLDivElement>(null)
	const accountTriggerRef = useRef<HTMLButtonElement>(null)
	const isHome = page === "home"
	const homeHref = isHome ? "#home" : "/"
	const plansHref = isHome ? "#plans" : "/#plans"
	const brand = <>
		<Image className="brand-mark__image" src={logoUrl} alt={`${brandName} logo`} unoptimized={/^https?:\/\//i.test(logoUrl)} width={48} height={48} />
		<span className="brand-mark__copy">
			<strong className="brand-mark__title">{brandName}</strong>
			<span className="brand-mark__tagline">{brandTagline}</span>
		</span>
	</>
	const searchEntries = canAccessPlatformAdmin
		? [...getPlatformSearchEntries(brandName), { label: "Platform Admin", description: `Manage ${brandName} platform operations and CMS`, href: "/platform-admin", keywords: "admin dashboard cms operations" }]
		: getPlatformSearchEntries(brandName)

	useEffect(() => {
		const updateAccountImage = (event: Event) => {
			if (event instanceof CustomEvent && typeof event.detail?.image === "string")
				setAccountImage(event.detail.image)
		}
		window.addEventListener("beauty-sphia:profile-image-updated", updateAccountImage)
		return () => window.removeEventListener("beauty-sphia:profile-image-updated", updateAccountImage)
	}, [])

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
		{isHome ? <PlatformBrandMark brandName={brandName}>{brand}</PlatformBrandMark> : <Link className="brand-mark" href="/" aria-label={`${brandName} homepage`}>{brand}</Link>}
		<nav id="platform-navigation" className={"platform-nav" + (menuOpen ? " is-open" : "")} aria-label="Platform navigation">
			<Link href={homeHref} prefetch={!isHome} onClick={() => setMenuOpen(false)}>Home</Link>
			<Link href="/stores" prefetch onClick={() => setMenuOpen(false)}>Salons</Link>
			<Link href={plansHref} prefetch={!isHome} onClick={() => setMenuOpen(false)}>Pricings</Link>
			<Link href="/about" prefetch onClick={() => setMenuOpen(false)}>About</Link>
			<Link href="/support" prefetch onClick={() => setMenuOpen(false)}>Support</Link>
		</nav>
		<div className="platform-header__actions">
			<SiteSearch
			entries={searchEntries}
				label={brandName}
			/>
			<div className="platform-account" ref={accountMenuRef}>
				<button
					ref={accountTriggerRef}
					className={`platform-account__trigger${!isSignedIn ? " platform-account__trigger--login" : ""}`}
					type="button"
					aria-label={isSignedIn ? "Open account menu" : "Open login and signup menu"}
					aria-haspopup="menu"
					aria-expanded={accountMenuOpen}
					aria-controls="platform-account-menu"
					onClick={() => setAccountMenuOpen((open) => !open)}
				>
					{isSignedIn ? accountImage ? <Image className="platform-account__avatar" src={accountImage} alt="" width={30} height={30} unoptimized onError={() => setAccountImage("")} /> : <span className="platform-account__initial" aria-hidden="true">{userEmail?.trim().charAt(0).toUpperCase() || <UserRound size={18} aria-hidden="true" />}</span> : <UserRound size={21} strokeWidth={1.8} aria-hidden="true" />}
					{!isSignedIn && <span>Log in</span>}
				</button>
				{accountMenuOpen && <div className="platform-account__menu" id="platform-account-menu" role="menu" aria-label="Account options">
					{isSignedIn ? <>
						<Link href="/account" prefetch role="menuitem" onClick={() => setAccountMenuOpen(false)}>My account</Link>
						<button type="button" role="menuitem" onClick={handleSignOut}>Log out</button>
					</> : <>
						<Link href="/login" prefetch role="menuitem" onClick={() => setAccountMenuOpen(false)}>Log in</Link>
						<Link href="/signup" prefetch role="menuitem" onClick={() => setAccountMenuOpen(false)}>Sign up</Link>
					</>}
				</div>}
			</div>
			<button className={"platform-menu-toggle" + (menuOpen ? " is-open" : "")} type="button" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} aria-controls="platform-navigation" onClick={() => setMenuOpen((value) => !value)}>
				{menuOpen ? <X size={21} strokeWidth={1.8} aria-hidden="true" /> : <Menu size={21} strokeWidth={1.8} aria-hidden="true" />}
			</button>
		</div>
	</header>
}
