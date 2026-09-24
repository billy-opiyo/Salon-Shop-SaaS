"use client"

import type { ReactNode } from "react"
import type React from "react"

export function NotFoundMarkup(): ReactNode {
	return (
		<>

		<main className="page-shell" aria-labelledby="page-title">
			<section className="not-found-card" aria-label="Page not found">
				<header className="brand-row">
					<a className="brand-mark" href="/royal-braids#home" aria-label="Return to Royal Braids home page">
						<span className="logo-frame" aria-hidden="true">
							<img
								src="/assets/salon/RoyalBraidsnewlogo.png"
								alt="Royal Braids logo"
								width="58"
								height="58"
								data-client-attr="alt:brand.logoAlt"
							/>
						</span>
						<span className="brand-copy">
							<span className="brand-name" data-client-text="brand.businessName">Royal Braids</span>
							<span className="brand-tagline">Luxury Salon Experience</span>
						</span>
					</a>

					<span className="hosting-pill" title="Hosted on Vercel">
						<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
							<path d="M4.5 20.5 7.1 3.9c.1-.6.9-.8 1.2-.2l2.4 4.5 1.9-3.6c.3-.6 1.1-.5 1.3.1l1.3 4.1 2.4-2.3c.4-.4 1.1-.1 1 .5l.9 13.5L12 23 4.5 20.5Z" />
							<path d="M10.7 8.2 4.5 20.5 12 23l7.5-2.5-4.3-11.7-3.2 3.1-1.3-3.7Z" opacity="0.45" />
						</svg>
						Vercel Hosting fallback
					</span>
				</header>

				<div className="content-grid">
					<div className="message-copy">
						<p className="kicker">Broken link or missing page</p>
						<h1 id="page-title"><span>Page</span><br />not found</h1>
						<p className="script-line">Let’s get you back glowing.</p>
						<p className="lead">
							The link you opened is unavailable, moved, or typed incorrectly. This page
							keeps the <span data-client-text="brand.businessName">Royal Braids</span>
							Vercel-hosted website graceful whenever a route returns a 404.
						</p>
						<p className="hosting-note">
							<strong>Vercel Hosting custom 404:</strong> if this Vercel-hosted site
							receives a missing link or route error, this branded page is shown instead
							of a blank or default error screen.
						</p>

						<nav className="actions" aria-label="404 recovery actions">
							<a className="btn btn-primary" href="/royal-braids#home">Back to home</a>
							<a className="btn btn-outline" href="/royal-braids#booking">Book an appointment</a>
							<a className="btn btn-outline" href="/royal-braids#contact">Contact us</a>
						</nav>
					</div>

					<aside className="status-panel" aria-label="404 status details">
						<p className="status-code" aria-hidden="true">404</p>
						<h2>Route unavailable</h2>
						<p>
							Check the web address, then use one of the quick links below to continue
							browsing <span data-client-text="brand.businessName">Royal Braids</span>.
						</p>

						<div className="quick-links" aria-label="Quick links">
							<a href="/royal-braids#services"><span>View services</span><span aria-hidden="true">→</span></a>
							<a href="/royal-braids#gallery"><span>Explore gallery</span><span aria-hidden="true">→</span></a>
							<a href="/royal-braids#visit"><span>Visit us</span><span aria-hidden="true">→</span></a>
						</div>
					</aside>
				</div>

				<p className="footer-note">
					<span data-client-text="brand.copyright">© Royal Braids. All rights reserved.</span>
					This custom 404 page is configured as the Vercel Hosting fallback for missing links.
				</p>
			</section>
		</main>
	
		</>
	)
}
