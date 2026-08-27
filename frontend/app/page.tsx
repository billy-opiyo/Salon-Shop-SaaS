import Link from "next/link"
import Image from "next/image"

import { ExperienceSplash } from "@/components/shared/ExperienceSplash"
import { CurrentYear } from "@/components/shared/CurrentYear"

type PlatformIconName = "home" | "store" | "plans" | "create"
type SocialIconName = "whatsapp" | "facebook" | "tiktok" | "instagram"

function PlatformIcon({ name }: { readonly name: PlatformIconName }) {
	return (
		<svg
			className="mobile-action-icon"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			focusable="false"
		>
			{ name === "home" && <><path d="m3 10 9-7 9 7" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-6h6v6" /></> }
			{ name === "store" && <><path d="M4 10h16v10H4z" /><path d="M3 10 5 4h14l2 6" /><path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" /><path d="M8 20v-5h8v5" /></> }
			{ name === "plans" && <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /><path d="M7 15h3" /></> }
			{ name === "create" && <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8v8M8 12h8" /></> }
		</svg>
	)
}

function SocialIcon({ name }: { readonly name: SocialIconName }) {
	return <i className={`platform-social-icon fab fa-${name}`} aria-hidden="true" />
}

const plans = [
	{
		name: "Starter",
		description: "Launch a polished salon storefront with the essentials.",
		features: [
			"One salon store",
			"Core branding",
			"Services and gallery",
			"Booking foundation",
		],
	},
	{
		name: "Business",
		description: "Run daily salon operations with deeper customer workflows.",
		features: [
			"Advanced schedule",
			"Waitlist workflows",
			"Staff permissions",
			"Email and WhatsApp automation",
		],
	},
	{
		name: "Enterprise",
		description:
			"Scale multiple teams, locations, and operational requirements.",
		features: [
			"Advanced security",
			"Custom domains",
			"Expanded usage",
			"Priority onboarding",
		],
	},
] as const

export default function PlatformHome() {
	return (
		<>
			<ExperienceSplash
				eyebrow="The salon operating platform"
				brandName="Beauty Sphia"
				description="Preparing your workspace experience"
			/>
			<main id="home" className="platform-home-shell">
				<header className="platform-header">
					<Link className="brand-mark" href="#home" aria-label="Beauty Sphia home">
						<Image
							className="brand-mark__image"
							src="/platform/Beauty Sphia logo.png"
							alt="Beauty Sphia logo"
							width={48}
							height={48}
						/>
						<span className="brand-mark__copy">
							<strong className="brand-mark__title">
								Beauty <span className="brand-mark__s">
									S
									<svg viewBox="0 0 24 16" aria-hidden="true" focusable="false">
										<path d="m3 5 4 4 5-6 5 6 4-4-2 10H5L3 5Z" />
										<path d="M5 18h14" />
									</svg>
								</span>phia
							</strong>
							<span className="brand-mark__tagline">Manage · Book · Grow</span>
						</span>
					</Link>
					<nav className="platform-nav" aria-label="Platform navigation">
						<Link href="#home">Home</Link>
						<Link href="#browse-stores">Browse Stores</Link>
						<Link href="#plans">Plans</Link>
						<Link href="/onboarding">Create Store</Link>
					</nav>
				</header>

				<section
					className="platform-hero platform-hero--image"
					aria-labelledby="platform-title"
				>
					<picture className="platform-hero__picture">
						<source
							media="(max-width: 1024px)"
							srcSet="/platform/hero-mobile-beauty-sphia-copy.png"
						/>
						<Image
							className="platform-hero__image"
							src="/platform/hero-desktop-beauty-sphia-copy.png"
							alt="Beauty Sphia salon management platform"
							width={1536}
							height={880}
							priority
							sizes="100vw"
						/>
					</picture>
					<h1 id="platform-title" className="sr-only">
						Beauty Sphia salon management platform
					</h1>
				</section>

				<section
					className="platform-section platform-section--browse"
					id="browse-stores"
					aria-labelledby="browse-title"
				>
					<div className="section-heading">
						<p className="eyebrow">Browse Stores</p>
						<h2 id="browse-title">Step inside a live salon experience.</h2>
						<p>
							Royal Braids is an available salon store on Beauty Sphia, showing how
							independent salons can welcome clients online.
						</p>
					</div>
					<div className="browse-store-list">
						<Link className="browse-store" href="/royal-braids">
							<span className="browse-store__image" aria-hidden="true" />
							<span className="browse-store__content">
								<span className="eyebrow">Available Store · Nairobi</span>
								<strong>Royal Braids</strong>
								<span>
									From signature braids, hair services and flawless twists to glowing
									beauty spa rituals, precision nails, radiant makeup, barber grooming,
									eyebrows &amp; lash enhancements, and bridal-ready glam—step into a full
									beauty experience crafted to make you shine.
								</span>
								<span className="browse-store__link">
									Open Royal Braids Store →
								</span>
							</span>
						</Link>
					</div>
				</section>

				<section
					className="platform-section"
					id="how-it-works"
					aria-labelledby="how-title"
				>
					<div className="section-heading">
						<p className="eyebrow">A calmer way to run your business</p>
						<h2 id="how-title">From first click to fully booked.</h2>
					</div>
					<div className="steps-grid">
						<article>
							<span>01</span>
							<h3>Create</h3>
							<p>
								Set up your salon identity, services, team, and public store
								address.
							</p>
						</article>
						<article>
							<span>02</span>
							<h3>Customize</h3>
							<p>
								Bring your brand to life with the preserved salon storefront
								experience.
							</p>
						</article>
						<article>
							<span>03</span>
							<h3>Grow</h3>
							<p>
								Manage bookings, content, customers, and daily operations from
								one workspace.
							</p>
						</article>
					</div>
				</section>

				<section
					className="platform-section platform-section--plans"
					id="plans"
					aria-labelledby="plans-title"
				>
					<div className="section-heading">
						<p className="eyebrow">Choose your operating level</p>
						<h2 id="plans-title">Plans that grow with your salon.</h2>
						<p>
							Pricing and final limits will be confirmed before billing is
							implemented.
						</p>
					</div>
					<div className="plans-grid">
						{plans.map((plan) => (
							<article
								className={`plan-card${plan.name === "Business" ? " plan-card--featured" : ""}`}
								key={plan.name}
							>
								{plan.name === "Business" && (
									<span className="plan-card__badge">Recommended</span>
								)}
								<h3>{plan.name}</h3>
								<p>{plan.description}</p>
								<ul>
									{plan.features.map((feature) => (
										<li key={feature}>
											<span aria-hidden="true">✓</span>
											{feature}
										</li>
									))}
								</ul>
								<Link className="button button--outline" href="/onboarding">
									Start with {plan.name}
								</Link>
							</article>
						))}
					</div>
				</section>

			</main>
			<footer className="platform-footer">
				<div className="platform-footer__grid">
					<div className="platform-footer__brand">
						<Link className="platform-footer__title" href="/" aria-label="Beauty Sphia Homepage">
							Beauty Sphia
						</Link>
						<p>Manage your salon, book clients, and grow your brand in one place.</p>
					</div>
					<nav className="platform-footer__links" aria-label="Platform policies">
						<span className="eyebrow">Policies</span>
						<Link href="/privacy">Privacy Policy</Link>
						<Link href="/cookies">Cookie Policy</Link>
						<Link href="/terms">Terms of Service</Link>
					</nav>
					<div className="platform-footer__social">
						<span className="eyebrow">Connect with us</span>
						<div className="platform-social-links">
							<a href="https://wa.me/254740470381" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
								<SocialIcon name="whatsapp" />
							</a>
							<a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
								<SocialIcon name="facebook" />
							</a>
							<a href="https://www.tiktok.com/" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
								<SocialIcon name="tiktok" />
							</a>
							<a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
								<SocialIcon name="instagram" />
							</a>
						</div>
					</div>
				</div>
				<div className="platform-footer__bottom">
					<span>© <CurrentYear /> Beauty Sphia</span>
					<Link href="/">Beauty Sphia Homepage</Link>
				</div>
			</footer>
			<nav
				className="platform-mobile-actions"
				aria-label="Mobile platform navigation"
			>
				<Link href="#home">
					<PlatformIcon name="home" />
					<span>Home</span>
				</Link>
				<Link href="#browse-stores">
					<PlatformIcon name="store" />
					<span>Browse Stores</span>
				</Link>
				<Link href="#plans">
					<PlatformIcon name="plans" />
					<span>Plans</span>
				</Link>
				<Link href="/onboarding">
					<PlatformIcon name="create" />
					<span>Create Store</span>
				</Link>
			</nav>
		</>
	)
}
