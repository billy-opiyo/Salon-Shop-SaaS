"use client"

import { createContext, useContext, type CSSProperties, type ReactNode } from "react"
import Image from "next/image"

export interface TenantNotFoundBrand {
	readonly slug: string
	readonly businessName: string
	readonly logoUrl?: string
	readonly theme: {
		readonly preset: string
		readonly mode: "light" | "dark"
	}
}

const TenantNotFoundContext = createContext<TenantNotFoundBrand | null>(null)

const themeColors: Record<string, string> = {
	gold: "#c8963e",
	champagne: "#d6b16a",
	"rose-gold": "#b76e79",
	emerald: "#2f9b7e",
	"plum-gold": "#d4a94f",
	terracotta: "#c76b45",
	teal: "#2bb3a3",
	blush: "#e8a7b6",
	lavender: "#a78bfa",
}

export function TenantNotFoundProvider({
	brand,
	children,
}: Readonly<{
	brand: TenantNotFoundBrand | null
	children: ReactNode
}>) {
	return (
		<TenantNotFoundContext.Provider value={brand}>
			{children}
		</TenantNotFoundContext.Provider>
	)
}

function getInitials(name: string): string {
	return name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part.charAt(0))
		.join("")
		.toUpperCase()
}

export function NotFoundMarkup(): ReactNode {
	const brand = useContext(TenantNotFoundContext)
	const isAvailable = brand !== null
	const isLight = brand?.theme.mode === "light"
	const primary = themeColors[brand?.theme.preset ?? ""] ?? "#c8963e"
	const brandHome = isAvailable ? `/${brand.slug}#home` : "/stores"
	const brandLink = (section: string) => `/${brand?.slug}#${section}`
	const themeStyle = {
		"--primary": primary,
		"--primary-dark": `color-mix(in srgb, ${primary} 72%, #111)`,
		"--primary-light": `color-mix(in srgb, ${primary} 58%, white)`,
		"--primary-contrast": "#0a0a0a",
		"--primary-soft": `color-mix(in srgb, ${primary} 12%, transparent)`,
		"--primary-soft-strong": `color-mix(in srgb, ${primary} 22%, transparent)`,
		"--primary-border": `color-mix(in srgb, ${primary} 34%, transparent)`,
		"--primary-border-strong": `color-mix(in srgb, ${primary} 58%, transparent)`,
		"--border-gold": `color-mix(in srgb, ${primary} 34%, transparent)`,
		"--gold-soft": `color-mix(in srgb, ${primary} 22%, transparent)`,
		"--gold-glow": `color-mix(in srgb, ${primary} 22%, transparent)`,
		"--gradient-gold": `linear-gradient(135deg, ${primary}, color-mix(in srgb, ${primary} 55%, white), ${primary})`,
		"--bg-primary": isLight ? "#f8f5f0" : "#0a0a0a",
		"--bg-secondary": isLight ? "#f0ebe4" : "#111111",
		"--bg-card": isLight ? "#fffdf9" : "#1a1a1a",
		"--bg-card-hover": isLight ? "#f5efe6" : "#222222",
		"--text-primary": isLight ? "#201b16" : "#f5f0eb",
		"--text-secondary": isLight ? "#554a3e" : "#c8bba9",
		"--text-muted": isLight ? "#75695c" : "#8d8375",
		"--border": isLight ? "#ded5c9" : "#2a2520",
		"--glass-black": isLight ? "rgba(255, 253, 249, 0.86)" : "rgba(0, 0, 0, 0.62)",
		"--glass-black-strong": isLight ? "rgba(255, 253, 249, 0.96)" : "rgba(10, 10, 10, 0.84)",
	} as CSSProperties

	return (
		<div
			className="tenant-storefront-not-found"
			data-theme-preset={brand?.theme.preset ?? "gold"}
			style={themeStyle}
		>
			<main className="page-shell" aria-labelledby="tenant-not-found-title">
				<section className="not-found-card" aria-label="Storefront page not found">
					<header className="brand-row">
						<a className="brand-mark" href={brandHome} aria-label={isAvailable ? `Return to ${brand.businessName} home page` : "Explore salons"}>
							<span className="logo-frame" aria-hidden="true">
								{brand?.logoUrl ? (
									<Image src={brand.logoUrl} alt="" width={58} height={58} unoptimized />
								) : (
									<span className="tenant-not-found__initials">{brand ? getInitials(brand.businessName) : "BS"}</span>
								)}
							</span>
							<span className="brand-copy">
								<span className="brand-name">{brand?.businessName ?? "Beauty Sphia Salons"}</span>
								<span className="brand-tagline">{isAvailable ? "Your salon, your style" : "Salon directory"}</span>
							</span>
						</a>
						<span className="hosting-pill">{isAvailable ? "Salon storefront" : "Salon directory"}</span>
					</header>

					<div className="content-grid">
						<div className="message-copy">
							<p className="kicker">{isAvailable ? "Broken link or missing page" : "Storefront unavailable"}</p>
							<h1 id="tenant-not-found-title"><span>Page</span><br />not found</h1>
							<p className="script-line">Let’s get you back to beauty.</p>
							<p className="lead">
								{isAvailable
									? <>This page is unavailable or may have moved. Continue exploring <strong>{brand.businessName}</strong> using the links below.</>
									: "We couldn’t find a salon storefront at this address. Browse the directory to discover available salons."}
							</p>
							<nav className="actions" aria-label="Storefront recovery actions">
								<a className="btn btn-primary" href={brandHome}>{isAvailable ? "Back to salon home" : "Explore salons"}</a>
								{isAvailable && <a className="btn btn-outline" href={brandLink("booking")}>Book an appointment</a>}
								{isAvailable && <a className="btn btn-outline" href={brandLink("contact")}>Contact the salon</a>}
							</nav>
						</div>

						<aside className="status-panel" aria-label="404 status details">
							<p className="status-code" aria-hidden="true">404</p>
							<h2>{isAvailable ? "Route unavailable" : "Salon not found"}</h2>
							<p>{isAvailable ? "Check the web address, then use a quick link to keep browsing this salon." : "The address may be incorrect or the storefront may no longer be available."}</p>
							<div className="quick-links" aria-label="Quick links">
								{isAvailable ? (
									<>
										<a href={brandLink("services")}><span>View services</span><span aria-hidden="true">→</span></a>
										<a href={brandLink("gallery")}><span>Explore gallery</span><span aria-hidden="true">→</span></a>
										<a href={brandLink("visit")}><span>Visit the salon</span><span aria-hidden="true">→</span></a>
									</>
								) : (
									<a href="/stores"><span>Browse salons</span><span aria-hidden="true">→</span></a>
								)}
							</div>
						</aside>
					</div>
					<p className="footer-note">{isAvailable ? `© ${brand.businessName}. All rights reserved.` : "Discover salons and beauty services on Beauty Sphia."}</p>
				</section>
			</main>
		</div>
	)
}
