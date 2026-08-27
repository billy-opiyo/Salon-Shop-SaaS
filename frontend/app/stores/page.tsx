import Link from "next/link"

import { PlatformHeader } from "@/components/shared/PlatformHeader"
import { PlatformFooter } from "@/components/shared/PlatformFooter"
import { TopStoresGrid } from "@/components/shared/TopStoresGrid"
import { ContactForm } from "@/components/shared/ContactForm"

type PlatformIconName = "home" | "store" | "plans" | "create"

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
			{name === "home" && (
				<>
					<path d="m3 10 9-7 9 7" />
					<path d="M5 9.5V21h14V9.5" />
					<path d="M9 21v-6h6v6" />
				</>
			)}
			{name === "store" && (
				<>
					<path d="M4 10h16v10H4z" />
					<path d="M3 10 5 4h14l2 6" />
					<path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
					<path d="M8 20v-5h8v5" />
				</>
			)}
			{name === "plans" && (
				<>
					<rect x="3" y="5" width="18" height="14" rx="2" />
					<path d="M3 10h18" />
					<path d="M7 15h3" />
				</>
			)}
			{name === "create" && (
				<>
					<rect x="4" y="4" width="16" height="16" rx="3" />
					<path d="M12 8v8M8 12h8" />
				</>
			)}
		</svg>
	)
}

export const metadata = {
	title: "Browse Stores | Beauty Sphia",
	description:
		"Explore top salons on Beauty Sphia — discover newly added, high-rated stores and step inside a live salon experience.",
}

export default function StoresDirectoryPage() {
	return (
		<main id="home" className="platform-home-shell stores-directory">
			<PlatformHeader page="stores" />

			<section
				className="platform-section platform-section--directory-hero"
				aria-labelledby="directory-title"
			>
				<div className="section-heading">
					<p className="eyebrow">The Beauty Sphia Directory</p>
					<h1 id="directory-title">Find your next favourite salon.</h1>
					<p>
						Browse independent salons already running on Beauty Sphia.
						Discover freshly launched stores and community favourites,
						then step inside a live salon experience.
					</p>
				</div>
			</section>

			<section
				className="platform-section"
				id="top-stores"
				aria-labelledby="top-stores-title"
			>
				<div className="section-heading">
					<p className="eyebrow">Curated picks</p>
					<h2 id="top-stores-title">Top Stores Available</h2>
					<p>
						Our most-loved and most recently added salons, ranked for
						you. New stores are featured as they open their doors.
					</p>
				</div>
				<TopStoresGrid />
			</section>

			<section className="platform-section platform-section--directory-cta">
				<div className="directory-cta">
					<p className="eyebrow">Own your corner of the platform</p>
					<h2>Ready to open your own store?</h2>
					<p>
						Join Royal Braids and the growing family of independent
						salons bringing their brand online with Beauty Sphia.
					</p>
					<div className="platform-hero__actions">
						<Link className="button button--primary" href="/onboarding">
							Create your store
						</Link>
					</div>
				</div>
			</section>

			<section
				className="platform-section platform-section--contact"
				id="contact"
				aria-labelledby="contact-title"
			>
				<div className="contact-grid">
					<div className="section-heading">
						<p className="eyebrow">Get in touch</p>
						<h2 id="contact-title">Talk to the Beauty Sphia team.</h2>
						<p>
							Questions, partnerships, or store ideas — we would love
							to hear from you. Send us a message and we’ll get back
							to you soon.
						</p>
					</div>
					<ContactForm />
				</div>
			</section>

			<PlatformFooter />

			<nav
				className="platform-mobile-actions"
				aria-label="Mobile platform navigation"
			>
				<Link href="/">
					<PlatformIcon name="home" />
					<span>Home</span>
				</Link>
				<Link href="/stores">
					<PlatformIcon name="store" />
					<span>Browse Stores</span>
				</Link>
				<Link href="/#plans">
					<PlatformIcon name="plans" />
					<span>Plans</span>
				</Link>
				<Link href="/onboarding">
					<PlatformIcon name="create" />
					<span>Create Store</span>
				</Link>
			</nav>
		</main>
	)
}
