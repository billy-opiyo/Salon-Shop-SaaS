"use client"

import type { ReactNode } from "react"
import type React from "react"

export interface SalonStorefrontMarkupProps {
	readonly showSplash?: boolean
	readonly verifyEmailHref?: string
	readonly galleryContent?: ReactNode
	readonly servicesContent?: ReactNode
	readonly testimonialsContent?: ReactNode
	readonly blogContent?: ReactNode
	readonly serviceOptions?: ReactNode
	readonly bookingPaymentContent?: ReactNode
	readonly reviewServiceOptions?: ReactNode
}

export function SalonStorefrontMarkup({
	showSplash = false,
	verifyEmailHref = "/verify-email",
	galleryContent,
	servicesContent,
	testimonialsContent,
	blogContent,
	serviceOptions,
	bookingPaymentContent,
	reviewServiceOptions,
}: SalonStorefrontMarkupProps): ReactNode {
	return (
		<>

		
		{showSplash ? <div
			className="splash-screen"
			id="siteSplash"
			data-splash-duration="3200"
			role="status"
			aria-live="polite"
			aria-label="Royal Braids website loading"
		>
			<div className="splash-bg" aria-hidden="true">
				<img
					src="/assets/salon/1000_F_595420115_RZi6MAsq90qVRMfFz37ZKBianocAltUu.jpg"
					alt=""
					loading="eager"
					decoding="async"
					fetchPriority="high"
				/>
			</div>
			<div className="splash-content">
				<p className="splash-kicker">Welcome to</p>
				<h1 className="splash-title" aria-label="Royal Braids">
					<svg
						className="splash-handwriting"
						viewBox="0 0 940 230"
						preserveAspectRatio="xMidYMid meet"
						aria-hidden="true"
					>
						<defs>
							<linearGradient id="splashTitleGradient" x1="0" x2="1" y1="0" y2="0">
								<stop offset="0%" stopColor="#f8e5b4" />
								<stop offset="42%" stopColor="#e8c27a" />
								<stop offset="72%" stopColor="#c8963e" />
								<stop offset="100%" stopColor="#fff3cf" />
							</linearGradient>
						</defs>
						<text className="splash-handwriting-shadow" x="470" y="128" textAnchor="middle">
							Royal Braids
						</text>
						<text className="splash-handwriting-fill" x="470" y="128" textAnchor="middle">
							Royal Braids
						</text>
						<text className="splash-handwriting-strokes" x="470" y="128" textAnchor="middle"><tspan className="splash-handwriting-letter" style={{"--letter-index": "0"} as React.CSSProperties}>R</tspan><tspan className="splash-handwriting-letter" style={{"--letter-index": "1"} as React.CSSProperties}>o</tspan><tspan className="splash-handwriting-letter" style={{"--letter-index": "2"} as React.CSSProperties}>y</tspan><tspan className="splash-handwriting-letter" style={{"--letter-index": "3"} as React.CSSProperties}>a</tspan><tspan className="splash-handwriting-letter" style={{"--letter-index": "4"} as React.CSSProperties}>l</tspan><tspan className="splash-handwriting-letter" style={{"--letter-index": "5"} as React.CSSProperties} dx="24">B</tspan><tspan className="splash-handwriting-letter" style={{"--letter-index": "6"} as React.CSSProperties}>r</tspan><tspan className="splash-handwriting-letter" style={{"--letter-index": "7"} as React.CSSProperties}>a</tspan><tspan className="splash-handwriting-letter" style={{"--letter-index": "8"} as React.CSSProperties}>i</tspan><tspan className="splash-handwriting-letter" style={{"--letter-index": "9"} as React.CSSProperties}>d</tspan><tspan className="splash-handwriting-letter" style={{"--letter-index": "10"} as React.CSSProperties}>s</tspan></text>
					</svg>
				</h1>
				<div
					className="splash-progress"
					role="progressbar"
					aria-label="Loading Royal Braids"
					aria-valuemin={1}
					aria-valuemax={100}
					aria-valuenow={1}
				>
					<div className="splash-progress-header">
						<span className="splash-progress-label">Loading</span>
						<span className="splash-progress-percent" id="splashProgressPercent">1%</span>
					</div>
					<div className="splash-progress-track">
						<div className="splash-progress-fill" id="splashProgressFill"></div>
					</div>
				</div>
				<p className="splash-loading-text" id="splashLoadingText">
					Preparing Your Luxury Salon Experience<span
						className="splash-loading-dots"
						aria-hidden="true"
						><span>.</span><span>.</span><span>.</span></span
					>
				</p>
			</div>
		</div> : null}

		<div className={`site-shell${showSplash ? "" : " no-storefront-splash"}`} id="siteMain">
			
		<header className="header" id="header">
			<div className="container header-inner">
				<a href="#home" className="logo">
					<span
						className="logo-icon logo-cube"
						aria-label="Royal Braids rotating logo"
						data-client-attr="aria-label:brand.logoAlt"
					>
						<span className="logo-cube-track" id="logoCubeTrack">
							<img
								id="logoCubeImage"
								src="/assets/salon/RoyalBraidsnewlogo.png"
								alt="Royal Braids rotating logo"
								loading="eager"
								decoding="async"
								width="72"
								height="72"
								data-client-attr="src:brand.logoSrc; alt:brand.logoAlt"
							/>
						</span>
					</span>
					<span className="logo-text" data-client-html="brand.shortNameHtml"
						>ROYAL<br />BRAIDS</span
					>
				</a>

				<br />
				<nav className="nav" id="nav">
					<a href="#home" className="active">Home</a>
					<a href="#gallery">Gallery</a>
					<a href="#services">Services</a>
					<a href="#booking">Booking</a>
					<a href="#clientDashboard" id="navDashboardLink" className="hidden"
						>Dashboard</a
					>
					<a href="#testimonials">Reviews</a>
					<a href="#blog">Blog</a>
					<a href="#visit">Visit Us</a>
					<a href="#contact">Contact</a>
				</nav>

				<div className="header-actions">
					<button
						type="button"
						className="dark-mode-toggle"
						id="darkModeToggle"
						aria-label="Toggle dark mode"
						aria-pressed="false"
					>
						<svg className="sun" viewBox="0 0 24 24">
							<path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4-6.5 4 2-7L2 9h7z" />
						</svg>
						<svg className="moon" viewBox="0 0 24 24">
							<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
						</svg>
					</button>
					<a href="#booking" className="book-btn">Book Now</a>
					<button className="auth-btn" id="openAuthModalBtn" type="button">
						Log In
					</button>
					<div className="auth-profile hidden" id="authProfileMenu">
						<button
							type="button"
							className="auth-profile-trigger"
							id="authProfileTrigger"
							aria-label="Open profile menu"
							aria-expanded="false"
						>
							<span id="authProfileInitial">R</span>
						</button>
						<div className="auth-profile-dropdown" id="authProfileDropdown">
							<p id="authProfileName">Welcome back</p>
							<a href="#clientDashboard">My Dashboard</a>
							<button type="button" id="logoutBtn">Log Out</button>
						</div>
					</div>
					<button className="nav-toggle" id="navToggle" aria-label="Menu">
						<span></span><span></span><span></span>
					</button>
				</div>
			</div>
		</header>

		
		<section className="hero" id="home">
			<div className="hero-bg">
				<img
					src="/assets/salon/1000_F_595420115_RZi6MAsq90qVRMfFz37ZKBianocAltUu.jpg"
					alt="African Hair Braiding Salon"
					loading="eager"
					decoding="async"
					fetchPriority="high"
					data-client-attr="src:brand.heroImage; alt:brand.heroImageAlt"
				/>
			</div>
			<div className="container">
				<div className="hero-content">
					<div className="hero-text animate-on-scroll">
						<div className="section-subtitle" data-client-text="brand.heroSubtitle">
							Premium African Hair Braiding & Beauty
						</div>
						<h1 data-client-html="brand.heroTitleHtml">
							Celebrate Your Crown with <span>Beautiful Braids</span>
						</h1>
						<p data-client-text="brand.heroDescription">
							From signature braids, hair services and flawless twists to
							glowing beauty spa rituals, precision nails, radiant makeup,
							barber grooming, eyebrows & lash enhancements, and bridal-ready
							glam—step into a full beauty experience crafted to make you shine.
						</p>
						<div className="hero-buttons">
							<a href="#booking" className="btn btn-primary btn-lg">
								<svg
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
									<line x1="16" y1="2" x2="16" y2="6"></line>
									<line x1="8" y1="2" x2="8" y2="6"></line>
									<line x1="3" y1="10" x2="21" y2="10"></line>
								</svg>
								Book Appointment
							</a>
							<a href="#services" className="btn btn-outline btn-lg">
								<svg
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<circle cx="12" cy="12" r="10"></circle>
									<polygon points="10 8 16 12 10 16 10 8"></polygon>
								</svg>
								Explore Services
							</a>
						</div>
						<div className="hero-info">
							<div className="hero-info-item">
								<svg
									viewBox="0 0 24 24"
									fill="none"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path
										d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
									></path>
								</svg>
								<span data-client-text="contact.phonePrimary"
									>+254 740 470 381</span
								>
							</div>
							<div className="hero-info-item">
								<svg
									viewBox="0 0 24 24"
									fill="none"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path
										d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
									></path>
									<polyline points="22,6 12,13 2,6"></polyline>
								</svg>
								<span data-client-text="contact.emailPrimary"
									>info@royalbraids.ke</span
								>
							</div>
							<div className="hero-info-item">
								<svg
									viewBox="0 0 24 24"
									fill="none"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"></path>
									<circle cx="12" cy="10" r="3"></circle>
								</svg>
								<span data-client-text="contact.locationShort"
									>Westlands, Nairobi</span
								>
							</div>
						</div>
					</div>

					<div className="hero-image animate-on-scroll delay-2">
						<div className="hero-image-main">
							<img
								src="/assets/salon/4-african-knotless-braids-with-beads.webp"
								alt="African Braids"
								loading="eager"
								decoding="async"
								fetchPriority="high"
							/>
						</div>
						<div className="hero-badge">
							<div className="number">10+</div>
							<div className="text">Years Experience</div>
						</div>
						<div className="hero-float">
							<span>⭐ 4.9/5</span>
							<p>500+ Reviews</p>
						</div>
					</div>
				</div>

				<div
					className="hero-stats animate-on-scroll delay-3"
				 style={{marginTop: "60px"}}
				>
					<div className="hero-stat">
						<div className="number" data-count="500">0</div>
						<div className="label">Happy Clients</div>
					</div>
					<div className="hero-stat">
						<div className="number" data-count="5">0</div>
						<div className="label">Expert Braiders</div>
					</div>
					<div className="hero-stat">
						<div className="number" data-count="50">0</div>
						<div className="label">Services Rendered</div>
					</div>
					<div className="hero-stat">
						<div className="number" data-count="98">0</div>
						<div className="label">% Satisfaction</div>
					</div>
				</div>
			</div>
		</section>

		
		<section className="gallery" id="gallery" data-config-section="gallery">
			<div className="container">
				<div className="gallery-header main-section-heading animate-on-scroll">
					<div className="section-subtitle" data-client-text="storefront.sectionCopy.gallerySubtitle">Our Work</div>
					<h2 className="section-title" data-client-text="storefront.sectionCopy.galleryTitle">Services Gallery</h2>
				</div>
				<p className="section-desc section-heading-copy" data-client-text="storefront.sectionCopy.galleryDescription">
					Discover our stunning transformations across braids, hair services,
					spa glow-ups, nail artistry, makeup finishes, barber cuts, eyebrows &
					lash details, and bridal/event beauty moments—beautifully updated in
					realtime.
				</p>

				<div
					className="gallery-filters animate-on-scroll delay-1"
					id="galleryFilters"
				>
					<div className="gallery-sort-row">
						<div className="gallery-service-filter-wrap" id="galleryServiceFilters">
							<button
								className="gallery-filter-chip active"
								data-filter-group="service"
								data-filter-value="all"
							>
								All
							</button>
							<button
								className="gallery-filter-chip"
								data-filter-group="service"
								data-filter-value="braids-services"
							>
								Braids
							</button>
							<button
								className="gallery-filter-chip"
								data-filter-group="service"
								data-filter-value="hair-services"
							>
								Hair
							</button>
							<button
								className="gallery-filter-chip"
								data-filter-group="service"
								data-filter-value="beauty-spa-services"
							>
								Beauty Spa
							</button>
							<button
								className="gallery-filter-chip"
								data-filter-group="service"
								data-filter-value="nail-services"
							>
								Nails
							</button>
							<button
								className="gallery-filter-chip"
								data-filter-group="service"
								data-filter-value="makeup-services"
							>
								Makeup
							</button>
							<button
								className="gallery-filter-chip"
								data-filter-group="service"
								data-filter-value="barber-services"
							>
								Barber
							</button>
							<button
								className="gallery-filter-chip"
								data-filter-group="service"
								data-filter-value="eyebrow-lash-services"
							>
								Eyebrows &amp; Lash
							</button>
							<button
								className="gallery-filter-chip"
								data-filter-group="service"
								data-filter-value="bridal-event-packages"
							>
								Bridal / Event Packages
							</button>
						</div>
						<div className="gallery-sort-control">
							<label className="gallery-sort-label" htmlFor="gallerySortSelect"
								>Sort By:</label
							>
							<select id="gallerySortSelect" className="gallery-sort-select">
								<option value="recommended">Recommended</option>
								<option value="name-asc">Name A-Z</option>
								<option value="name-desc">Name Z-A</option>
								<option value="date-modified-desc">
									Date Modified (Newest)
								</option>
								<option value="date-modified-asc">
									Date Modified (Oldest)
								</option>
								<option value="date-created-desc">Date Created (Newest)</option>
								<option value="date-created-asc">Date Created (Oldest)</option>
								<option value="new">New</option>
								<option value="old">Old</option>
							</select>
						</div>
					</div>

					<div className="gallery-filter-group" id="galleryLengthFilters">
						<button
							className="gallery-filter-chip active"
							data-filter-group="length"
							data-filter-value="all"
						>
							All Lengths
						</button>
					</div>
					<div className="gallery-filter-group" id="gallerySizeFilters">
						<button
							className="gallery-filter-chip active"
							data-filter-group="size"
							data-filter-value="all"
						>
							All Sizes
						</button>
					</div>
					<div className="gallery-filter-group" id="galleryStyleTypeFilters">
						<button
							className="gallery-filter-chip active"
							data-filter-group="styleType"
							data-filter-value="all"
						>
							All Style Types
						</button>
					</div>
					<div className="gallery-braids-only-note" id="galleryBraidsOnlyNote">
						Braids-only filters (Length, Size, Style Type)
					</div>
				</div>

				<div className="gallery-featured-wrap animate-on-scroll delay-1">
					<div className="gallery-featured-block" id="trendingBraidsBlock">
						<h3 id="trendingStylesHeading">🔥 Trending Braids</h3>
						<div className="gallery-featured-list" id="trendingBraidsList"></div>
					</div>
					<div className="gallery-featured-block" id="mostBookedStylesBlock">
						<h3 id="mostBookedStylesHeading">⭐ Most Booked Braids</h3>
						<div className="gallery-featured-list" id="mostBookedStylesList"></div>
					</div>
				</div>

				<div className="gallery-grid animate-on-scroll delay-1" id="galleryGrid">
					{galleryContent}
				</div>
				<div className="gallery-actions" id="galleryActions">
					<button className="btn btn-primary" id="viewAllGallery">
						View All Gallery
					</button>
				</div>
				<div className="gallery-empty" id="galleryEmptyState" style={{display: "none"}}>
					No styles match your current filters.
				</div>
			</div>
		</section>

		
		<section className="services" id="services" data-config-section="services">
			<div className="container">
				<div className="services-header main-section-heading animate-on-scroll">
					<div className="section-subtitle" data-client-text="storefront.sectionCopy.servicesSubtitle">What We Offer</div>
					<h2 className="section-title" data-client-text="storefront.sectionCopy.servicesTitle">Our Full Salon Services</h2>
				</div>
				<p className="section-desc section-heading-copy" data-client-text="storefront.sectionCopy.servicesDescription">
					Explore our complete salon experience, from Braids and Hair services,
					Nails to Spa, Makeup, Barbering, Massage & Wellness, Eyebrows &
					Lashes, Bridal packages, and salon-picked Cosmetics Products.
				</p>

				<div className="services-tabs animate-on-scroll delay-1">
					<button className="services-tab active" data-filter="all">
						All Services
					</button>
					<button className="services-tab" data-filter="braids-services">
						Braids Services
					</button>
					<button className="services-tab" data-filter="hair-services">
						Hair Services
					</button>
					<button className="services-tab" data-filter="beauty-spa-services">
						Beauty Spa Services
					</button>
					<button className="services-tab" data-filter="nail-services">
						Nail Services
					</button>
					<button className="services-tab" data-filter="makeup-services">
						Makeup Services
					</button>
					<button className="services-tab" data-filter="barber-services">
						Barber Services
					</button>
					<button className="services-tab" data-filter="massage-wellness">
						Massage & Wellness
					</button>
					<button className="services-tab" data-filter="eyebrow-lash-services">
						Eyebrow & Lash Services
					</button>
					<button className="services-tab" data-filter="bridal-event-packages">
						Bridal / Event Packages
					</button>
				<button className="services-tab" data-filter="cosmetics-products">
					Cosmetics Products
				</button>
					</div>

				<div className="services-grid" id="servicesGrid">
					{servicesContent}
				</div>
			</div>
		</section>

		
		<section className="booking" id="booking" data-config-section="booking">
			<div className="container">
				<div className="booking-inner">
					<div className="booking-info animate-on-scroll">
						<div className="booking-section-heading main-section-heading">
							<div className="section-subtitle" data-client-text="storefront.sectionCopy.bookingSubtitle">Easy Online Booking</div>
							<h2 className="section-title" data-client-text="storefront.sectionCopy.bookingTitle">Book Your Service Session</h2>
						</div>
					<p className="section-desc section-heading-copy" data-client-text="storefront.sectionCopy.bookingDescription">
						Secure your ideal appointment in minutes—whether you’re coming for
						premium braids, hair styling, spa care, nails, makeup, barber
						services, lashes, wellness, cosmetics, or a complete bridal/event
						package.
					</p>
						<div className="booking-benefits">
							<div className="benefit-item">
								<div className="benefit-icon">
									<svg
										viewBox="0 0 24 24"
										fill="none"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<circle cx="12" cy="12" r="10"></circle>
										<polyline points="12 6 12 12 16 14"></polyline>
									</svg>
								</div>
								<div>
									<h4 style={{fontSize: "1rem"}}>Quick & Easy Scheduling</h4>
									<p style={{color: "var(--text-secondary)", fontSize: "0.9rem"}}>
										Book in under 30 seconds
									</p>
								</div>
							</div>
							<div className="benefit-item">
								<div className="benefit-icon">
									<svg
										viewBox="0 0 24 24"
										fill="none"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<path
											d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
										></path>
									</svg>
								</div>
								<div>
									<h4 style={{fontSize: "1rem"}}>Whatsapp & Email Reminders</h4>
									<p style={{color: "var(--text-secondary)", fontSize: "0.9rem"}}>
										Never miss your appointment
									</p>
								</div>
							</div>
							<div className="benefit-item">
								<div className="benefit-icon">
									<svg
										viewBox="0 0 24 24"
										fill="none"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<path
											d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
										></path>
									</svg>
								</div>
								<div>
									<h4 style={{fontSize: "1rem"}}>Secure & Private</h4>
									<p style={{color: "var(--text-secondary)", fontSize: "0.9rem"}}>
										Your data is always protected
									</p>
								</div>
							</div>
						</div>
							<div
							 style={{background: "var(--bg-card)", padding: "20px", borderRadius: "var(--radius)", border: "1px solid var(--border)"}}
							>
								<h4 style={{fontSize: "1rem", marginBottom: "10px"}}>
								📞 Need Help Booking?
							</h4>
							<p style={{color: "var(--text-secondary)", fontSize: "0.9rem"}}>
								Call us directly at
								<a
									href="tel:+254740470381"
								 style={{color: "var(--primary)", fontWeight: "600"}}
									>+254 740 470 381</a
								>
								and our team will assist you.
							</p>
						</div>
					</div>

					<div className="animate-on-scroll delay-2">
						<form className="booking-form" id="bookingForm">
							<h3>Schedule Appointment</h3>
								<p className="booking-order-note">
									This product is ordered through WhatsApp. We will confirm
									stock, final price, and collection or delivery details in the
									chat.
								</p>
								<div className="form-message" id="bookingMessage"></div>
							<div className="form-grid">
								<div className="form-group">
									<label>First Name *</label>
									<input
										type="text"
										name="firstName"
										placeholder="Amina"
										required
									/>
								</div>
								<div className="form-group">
									<label>Last Name *</label>
									<input
										type="text"
										name="lastName"
										placeholder="Ochieng"
										required
									/>
								</div>
								<div className="form-group">
									<label>Email *</label>
									<input
										type="email"
										name="email"
										placeholder="amina@email.com"
										required
									/>
								</div>
								<div className="form-group">
									<label>Phone *</label>
									<input
										type="tel"
										name="phone"
										placeholder="+254 740 470 381"
										required
									/>
								</div>
								<div className="form-group">
									<label>Service *</label>
					<select name="service" required id="serviceSelect">
						<option value="">Select Service</option>
						{serviceOptions}
					</select>
								</div>
								{bookingPaymentContent}
								<div className="form-group full hidden" id="customServiceGroup">
									<label htmlFor="customServiceInput">Type Your Service *</label>
									<input
										type="text"
										id="customServiceInput"
										name="customService"
										placeholder="e.g. Tribal braids with curls"
									/>
										<small
										 style={{color: "var(--text-secondary)", display: "block", marginTop: "6px"}}
										>
							Tip: include style + size/length (e.g., &quot;Boho knotless,
							medium, waist length&quot;).
									</small>
								</div>
									<div className="form-group appointment-only">
										<label>Preferred Stylist</label>
									<select name="stylist" id="stylistSelect">
										<option value="">Any Available</option>
										<option value="fatima">
											Fatima Hassan - Master Braider
										</option>
										<option value="zainab">
											Zainab Mohamed - Senior Stylist
										</option>
										<option value="grace">
											Grace Wanjiku - Natural Hair Expert
										</option>
										<option value="amina">
											Amina Diallo - Braiding Specialist
										</option>
										<option value="sarah">
											Sarah Omondi - Kids Specialist
										</option>
									</select>
								</div>
									<div className="form-group appointment-only">
										<label>Date *</label>
									<input type="date" name="date" required id="datePicker" />
								</div>
									<div className="form-group appointment-only">
										<label>Time Slot *</label>
									<div className="time-picker-field" data-time-picker="booking">
										<input
											type="text"
											name="time"
											required
											id="timeSelect"
											list="bookingTimeOptions"
											placeholder="Select or type time"
											autoComplete="off"
										inputMode="text"
											aria-controls="bookingTimeDropdown"
											aria-expanded="false"
										/>
										<button
											type="button"
											className="time-picker-trigger"
											id="timePickerTrigger"
											aria-label="Show available times"
											aria-controls="bookingTimeDropdown"
											aria-expanded="false"
										>
											<i className="fa-regular fa-clock" aria-hidden="true"></i>
										</button>
										<datalist id="bookingTimeOptions"></datalist>
										<div
											className="time-picker-dropdown"
											id="bookingTimeDropdown"
											role="listbox"
											hidden
										></div>
									</div>
								</div>
									<div
										className="form-group full waitlist-panel hidden appointment-only"
										id="waitlistPanel"
									>
										<div className="waitlist-panel__header">
										<div>
											<strong>Want a booked time?</strong>
											<small id="waitlistHint">
												Booked slots are shown as disabled above. Choose one
												below to join the waitlist.
											</small>
										</div>
										<span className="waitlist-panel__badge">Waitlist</span>
									</div>
									<div className="waitlist-panel__controls">
										<select
											id="waitlistTimeSelect"
											aria-label="Booked time to join waitlist"
										>
											<option value="">Select booked time</option>
										</select>
										<button
											type="button"
											className="btn btn-outline"
											id="joinWaitlistBtn"
										>
											Join Waitlist
										</button>
									</div>
								</div>
									<div className="form-group full appointment-only">
										<label>Inspiration Photo (Optional)</label>
									<input
										type="file"
										name="inspirationImage"
										id="inspirationImage"
										accept="image/*"
									/>
								</div>
								<div className="form-group full">
									<label>Special Requests</label>
									<textarea
										name="notes"
									rows={3}
										placeholder="Any specific requirements or notes..."
									></textarea>
								</div>
							</div>
							<button type="submit" className="submit-booking" id="submitBtn">
								<svg
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
									<line x1="16" y1="2" x2="16" y2="6"></line>
									<line x1="8" y1="2" x2="8" y2="6"></line>
									<line x1="3" y1="10" x2="21" y2="10"></line>
								</svg>
								Confirm Booking
							</button>
						</form>

						<div className="booking-success" id="bookingSuccess">
							<svg
								viewBox="0 0 24 24"
								fill="none"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
								<polyline points="22 4 12 14.01 9 11.01"></polyline>
							</svg>
							<h3>Booking Confirmed!</h3>
							<p style={{color: "var(--text-secondary)"}}>
								Check your email for confirmation details. We&apos;ll send a reminder
								on Whatsapp 2 Hours before your appointment.
							</p>
							<div
								className="post-booking-auth-prompt hidden"
								id="postBookingAuthPrompt"
							>
								<h4>Save your booking and track updates?</h4>
								<p>
									Log in now so you can manage appointments, reviews, and faster
									rebooking.
								</p>
								<div className="post-booking-auth-actions">
									<button
										type="button"
										className="btn btn-primary"
										id="postBookingGoogleBtn"
									>
										Log In Now
									</button>
									<button
										type="button"
										className="btn btn-outline"
										id="postBookingLaterBtn"
									>
										Maybe Later
									</button>
								</div>
							</div>
							<button
								className="btn btn-primary"
								data-action="reset-booking"
							 style={{marginTop: "20px"}}
							>
								Book Another
							</button>
						</div>
					</div>
				</div>
			</div>
		</section>

		
		<section className="client-dashboard hidden" id="clientDashboard">
			<div className="container">
				<div className="dashboard-shell animate-on-scroll">
					<div className="dashboard-heading main-section-heading">
						<div className="section-subtitle">Your Account</div>
						<h2 className="section-title">My Dashboard</h2>
					</div>
					<p className="section-desc section-heading-copy">
						Track appointments, manage your reviews, and keep your profile up to
						date for faster rebooking.
					</p>
					<div
						className="form-message dashboard-message"
						id="dashboardMessage"
					></div>

					<div className="dashboard-grid">
						<div className="dashboard-card">
							<h3>My Appointments</h3>
							<ul id="dashboardBookingsList" className="dashboard-list">
								<li>No appointments yet.</li>
							</ul>
							<div className="dashboard-inline-note">
								You can reschedule or cancel active bookings before appointment
								time.
							</div>
						</div>

						<div className="dashboard-card">
							<h3>My Reviews</h3>
							<ul id="dashboardReviewsList" className="dashboard-list">
								<li>No reviews submitted yet.</li>
							</ul>
						</div>

						<div className="dashboard-card" id="dashboardFavoritesCard">
							<h3>
								Favorite Styles
								<span className="dashboard-count-badge" id="dashboardFavoritesCount"
									>0</span
								>
							</h3>
							<ul id="dashboardFavoritesList" className="dashboard-favorites-list">
								<li>Log in to save favorite gallery styles.</li>
							</ul>
						</div>

						<div className="dashboard-card" id="dashboardProfileCard">
							<h3>Profile Settings</h3>
							<div className="dashboard-profile-item">
								<span>Name</span>
								<strong id="dashboardProfileName">Guest User</strong>
							</div>
							<div className="dashboard-profile-item">
								<span>Email</span>
								<strong id="dashboardProfileEmail">Not signed in</strong>
							</div>
							<div className="dashboard-profile-item">
								<span>Phone</span>
								<strong id="dashboardProfilePhone"
									>Add phone during booking</strong
								>
							</div>
							<div className="dashboard-actions">
								<button
									type="button"
									className="btn btn-outline"
									id="dashboardAuthBtn"
								>
									Log In to Sync Data
								</button>
							</div>
						</div>

						<div className="dashboard-card dashboard-security-card">
							<h3>
								Security &amp; Privacy
								<span
									className="dashboard-count-badge"
									id="dashboardLoginHistoryCount"
									>0</span
								>
							</h3>
							<p className="dashboard-inline-note" style={{marginBottom: "10px"}}>
								We collect login activity for account security and fraud
								prevention.
							</p>
							<ul id="dashboardLoginHistoryList" className="dashboard-list">
								<li>Log in to view your recent login history.</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</section>

		<div className="auth-modal" id="dashboardRescheduleModal" aria-hidden="true">
			<div className="auth-modal-backdrop" id="dashboardRescheduleBackdrop"></div>
			<div
				className="auth-modal-dialog"
				role="dialog"
				aria-modal="true"
				aria-labelledby="dashboardRescheduleTitle"
			>
				<div className="auth-modal-header">
					<h3 id="dashboardRescheduleTitle">Reschedule Booking</h3>
					<button
						type="button"
						className="auth-modal-close"
						id="dashboardRescheduleCloseBtn"
						aria-label="Close"
					>
						×
					</button>
				</div>
				<div className="auth-modal-body">
					<div
						className="form-message"
						id="dashboardRescheduleMessage"
					 style={{display: "none"}}
					></div>
					<div className="form-grid">
						<div className="form-group">
							<label htmlFor="dashboardRescheduleDate">New Date *</label>
							<input type="date" id="dashboardRescheduleDate" />
						</div>
						<div className="form-group">
							<label htmlFor="dashboardRescheduleStylist">Stylist</label>
							<select id="dashboardRescheduleStylist">
								<option value="any">Any Available</option>
								<option value="fatima">Fatima Hassan - Master Braider</option>
								<option value="zainab">Zainab Mohamed - Senior Stylist</option>
								<option value="grace">
									Grace Wanjiku - Natural Hair Expert
								</option>
								<option value="amina">
									Amina Diallo - Braiding Specialist
								</option>
								<option value="sarah">Sarah Omondi - Kids Specialist</option>
							</select>
						</div>
						<div className="form-group full">
							<label htmlFor="dashboardRescheduleTime">New Time *</label>
							<select id="dashboardRescheduleTime">
								<option value="">Select Time</option>
							</select>
						</div>
					</div>
					<div className="dashboard-actions" style={{marginTop: "12px"}}>
						<button
							type="button"
							className="btn btn-outline"
							id="dashboardRescheduleCancelBtn"
						>
							Cancel
						</button>
						<button
							type="button"
							className="btn btn-primary"
							id="dashboardRescheduleSaveBtn"
						>
							Save Changes
						</button>
					</div>
				</div>
			</div>
		</div>

		
		<section className="testimonials" id="testimonials" data-config-section="testimonials">
			<div className="container">
				<div className="testimonials-header main-section-heading animate-on-scroll">
					<div className="section-subtitle" data-client-text="storefront.sectionCopy.testimonialsSubtitle">Client Love</div>
					<h2 className="section-title" data-client-text="storefront.sectionCopy.testimonialsTitle">What Our Queens Say</h2>
				</div>
				<p className="section-desc section-heading-copy" id="reviewsSummary" data-client-text="storefront.sectionCopy.testimonialsDescription">
					★ 5.0 average from 6 reviews
				</p>
				<div className="review-auth-hint hidden" id="reviewAuthHint" role="status">
					<div className="review-auth-badges">
						<span className="review-auth-badge">🔐 Log in to submit reviews.</span>
						<span className="review-auth-badge"
							>🚩 Log in to report abusive reviews.</span
						>
					</div>
					<button type="button" className="btn btn-outline" id="reviewAuthHintBtn">
						Log In
					</button>
				</div>
				<div className="reviews-sort-row animate-on-scroll delay-1">
					<label className="reviews-sort-label" htmlFor="reviewsSortSelect"
						>Sort Reviews:</label
					>
					<select id="reviewsSortSelect" className="reviews-sort-select">
						<option value="featured">Featured</option>
						<option value="newest">Newest</option>
						<option value="highest-rated">Highest Rated</option>
					</select>
				</div>
				<div
					className="testimonials-grid animate-on-scroll delay-1"
					id="testimonialsGrid"
				>
					{testimonialsContent}
				</div>

				<div
					className="reviews-toggle-controls animate-on-scroll delay-1"
					id="reviewsToggleControls"
				>
					<button type="button" className="btn btn-outline" id="viewAllReviewsBtn">
						View All Reviews
					</button>
					<button
						type="button"
						className="btn btn-outline hidden"
						id="viewLessReviewsBtn"
					>
						View Less Reviews
					</button>
				</div>

				<div
					className="review-submit-auth-gate hidden animate-on-scroll delay-2"
					id="reviewSubmitAuthGate"
				>
					<div className="review-submit-auth-badge">🔐 Members only</div>
					<h3>Log in to submit a review</h3>
					<p>
						Guests can still read all approved reviews, but only registered
						logged-in users can post new reviews.
					</p>
					<button
						type="button"
						className="btn btn-primary"
						id="reviewSubmitAuthGateBtn"
					>
						Log In to Submit Review
					</button>
				</div>

				<div
					className="reviews-submit-wrap animate-on-scroll delay-2"
					id="reviewSubmitWrap"
				>
					<form className="reviews-submit-form" id="reviewForm">
						<input type="hidden" id="reviewEditId" value="" />
						<h3>Share Your Experience</h3>
						<p>
							Loved your braids? Tell us about your visit. New reviews are
							submitted for approval before they appear live.
						</p>
						<div
							className="form-message"
							id="reviewMessage"
						 style={{display: "none"}}
						></div>
						<div className="form-grid">
							<div className="form-group">
								<label htmlFor="reviewName">Your Name *</label>
								<input
									type="text"
									id="reviewName"
									placeholder="Amina Ochieng"
									required
								/>
							</div>
							<div className="form-group">
								<label htmlFor="reviewRating">Rating *</label>
								<select id="reviewRating" required>
									<option value="">Select rating</option>
									<option value="5">★★★★★ (5)</option>
									<option value="4">★★★★☆ (4)</option>
									<option value="3">★★★☆☆ (3)</option>
									<option value="2">★★☆☆☆ (2)</option>
									<option value="1">★☆☆☆☆ (1)</option>
								</select>
							</div>
							<div className="form-group full">
								<label htmlFor="reviewService">Service (Optional)</label>
					<select id="reviewService">
						<option value="">Select Service (Optional)</option>
						{reviewServiceOptions}
					</select>
							</div>
							<div className="form-group full">
								<label htmlFor="reviewPhoto">Photo (Optional)</label>
								<input type="file" id="reviewPhoto" accept="image/*" />
							</div>
							<div className="form-group full">
								<label htmlFor="reviewText">Your Review *</label>
								<textarea
									id="reviewText"
									rows={4}
									placeholder="Tell us what you loved about your appointment..."
									required
								></textarea>
							</div>
						</div>
						<div className="admin-booking-actions" style={{marginTop: "4px"}}>
							<button
								type="submit"
								className="btn btn-primary"
								id="submitReviewBtn"
							>
								Submit Review
							</button>
							<button
								type="button"
								className="btn btn-outline"
								id="cancelReviewEditBtn"
							 style={{display: "none"}}
							>
								Cancel Edit
							</button>
						</div>
					</form>
				</div>
			</div>
		</section>

		
		<section className="blog" id="blog" data-config-section="blog">
			<div className="container">
				<div className="blog-header main-section-heading animate-on-scroll">
					<div className="section-subtitle" data-client-text="storefront.sectionCopy.blogSubtitle">Hair Care Tips & Guides</div>
					<h2 className="section-title" data-client-text="storefront.sectionCopy.blogTitle">From Our Blog</h2>
				</div>
				<p className="section-desc section-heading-copy" data-client-text="storefront.sectionCopy.blogDescription">
					Get insider tips on braids, natural hair care, skincare, nail health,
					makeup longevity, grooming routines, lash care, wellness, and bridal
					beauty planning from our expert team.
				</p>
				<div
					className="blog-scroll-controls animate-on-scroll delay-1"
					id="blogScrollControls"
				>
					<button type="button" className="btn btn-outline" id="blogPrevBtn">
						<i className="fa-solid fa-arrow-left"></i> Prev
					</button>
					<button type="button" className="btn btn-outline" id="blogNextBtn">
						Next <i className="fa-solid fa-arrow-right"></i>
					</button>
				</div>
				<div className="blog-grid animate-on-scroll delay-1" id="blogGrid">
					{blogContent}
				</div>
				<div
					className="reviews-toggle-controls animate-on-scroll delay-1"
					id="blogToggleControls"
				>
					<button type="button" className="btn btn-outline" id="viewAllBlogsBtn">
						View More Blogs
					</button>
					<button
						type="button"
						className="btn btn-outline hidden"
						id="viewLessBlogsBtn"
					>
						View Less Blogs
					</button>
				</div>
			</div>
		</section>

		
		<section className="contact" id="visit" data-config-section="visit">
			<div className="container">
				<div
					className="text-center contact-heading main-section-heading animate-on-scroll"
				>
					<div className="section-subtitle" style={{justifyContent: "center"}} data-client-text="storefront.sectionCopy.visitSubtitle">
						Get In Touch
					</div>
					<h2 className="section-title" data-client-text="storefront.sectionCopy.visitTitle">Visit Our Salon</h2>
				</div>
				<p className="section-desc section-heading-copy mb-lg" data-client-text="storefront.sectionCopy.visitDescription">
					We&apos;d love to hear from you. Visit us or reach out through any of the
					channels below.
				</p>
				<div className="contact-inner">
					<div className="contact-info animate-on-scroll delay-1">
						<div className="contact-item">
							<div className="contact-item-icon">
								<svg
									viewBox="0 0 24 24"
									fill="none"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"></path>
									<circle cx="12" cy="10" r="3"></circle>
								</svg>
							</div>
							<div className="contact-item-text">
								<h4>Location</h4>
								<p data-client-html="contact.addressHtml">
									Westlands Shopping Centre, 2nd Floor<br />Waiyaki Way,
									Nairobi, Kenya
								</p>
							</div>
						</div>
						<div className="contact-item">
							<div className="contact-item-icon">
								<svg
									viewBox="0 0 24 24"
									fill="none"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path
										d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
									></path>
								</svg>
							</div>
							<div className="contact-item-text">
								<h4>Phone</h4>
								<p>
									<a
										href="tel:+254740470381"
										target="_blank"
										data-client-text="contact.phonePrimary"
										data-client-attr="href:contact.phonePrimaryHref"
										>+254 740 470 381</a
									>
								</p>
								<p>
									<a
										href="tel:+254711987654"
										target="_blank"
										data-client-text="contact.phoneSecondary"
										data-client-attr="href:contact.phoneSecondaryHref"
										>+254 711 987 654</a
									>
								</p>
							</div>
						</div>
						<div className="contact-item">
							<div className="contact-item-icon">
								<svg
									viewBox="0 0 24 24"
									fill="none"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path
										d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
									></path>
									<polyline points="22,6 12,13 2,6"></polyline>
								</svg>
							</div>
							<div className="contact-item-text">
								<h4>Email</h4>
								<p>
									<a
										href="mailto:info@royalbraids.ke"
										target="_blank"
										data-client-text="contact.emailPrimary"
										data-client-attr="href:contact.emailPrimaryHref"
										>info@royalbraids.ke</a
									>
								</p>
								<p>
									<a
										href="mailto:bookings@royalbraids.ke"
										target="_blank"
										data-client-text="contact.emailBookings"
										data-client-attr="href:contact.emailBookingsHref"
										>bookings@royalbraids.ke</a
									>
								</p>
							</div>
						</div>
						<div className="contact-item">
							<div className="contact-item-icon">
								<svg
									viewBox="0 0 24 24"
									fill="none"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<circle cx="12" cy="12" r="10"></circle>
									<polyline points="12 6 12 12 16 14"></polyline>
								</svg>
							</div>
							<div className="contact-item-text">
								<h4>Operating Hours</h4>
								<table className="hours-table">
									<tbody>
									<tr>
										<td>Monday - Friday</td>
										<td data-client-text="contact.weekdayHours">
											8:00 AM - 8:00 PM
										</td>
									</tr>
									<tr>
										<td>Saturday</td>
										<td data-client-text="contact.saturdayHours">
											9:00 AM - 7:00 PM
										</td>
									</tr>
									<tr>
										<td>Sunday</td>
										<td data-client-text="contact.sundayHours">
											10:00 AM - 5:00 PM
										</td>
									</tr>
									<tr>
										<td>Public Holidays</td>
										<td data-client-text="contact.publicHolidayHours">
											10:00 AM - 4:00 PM
										</td>
									</tr>
									</tbody>
								</table>
							</div>
						</div>
					</div>
					<div className="map-container animate-on-scroll delay-2">
						<iframe
							src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.8199!2d36.8075!3d-1.2644!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f17390b2f4643%3A0x4b25b087296c88f7!2sWestlands%2C+Nairobi!5e0!3m2!1sen!2ske!4v1"
							data-client-attr="src:contact.mapEmbedUrl"
							allowFullScreen
							loading="lazy"
						></iframe>
					</div>
				</div>
			</div>
		</section>

		
		<section className="newsletter contact-form-section" id="contact" data-config-section="contact">
			<div className="container">
				<div className="contact-heading main-section-heading animate-on-scroll">
					<div className="section-subtitle">Send Us A Message</div>
					<h2 className="section-title" data-client-text="storefront.sectionCopy.contactTitle">Contact Us</h2>
				</div>
				<p className="section-desc section-heading-copy" data-client-text="storefront.sectionCopy.contactDescription">
					Have questions about our services or need assistance? Send us a
					message and we&apos;ll get back to you soon.
				</p>
				<div className="newsletter-inner animate-on-scroll delay-1">
					<form
						className="newsletter-form"
						id="contactForm"
						method="POST"
						data-email-provider="resend-api"
					>
						<div className="contact-form-grid">
							<div className="form-group">
								<label htmlFor="contactName">Name *</label>
								<input
									type="text"
									id="contactName"
									name="name"
									placeholder="Jane Doe"
									required
								/>
							</div>
							<div className="form-group">
								<label htmlFor="contactEmail">Email *</label>
								<input
									type="email"
									id="contactEmail"
									name="email"
									placeholder="janedoe@gmail.com"
									required
								/>
							</div>
							<div className="form-group full">
								<label htmlFor="contactSubject">Subject *</label>
								<input
									type="text"
									id="contactSubject"
									name="subject"
									placeholder="How can we help you?"
									required
								/>
							</div>
							<div className="form-group full">
								<label htmlFor="contactMessage">Message *</label>
								<textarea
									id="contactMessage"
									name="message"
								rows={4}
									placeholder="Tell us more about your inquiry..."
									required
								></textarea>
							</div>
						</div>
						<button type="submit" className="btn btn-primary">Send Message</button>
					</form>
					<div
						className="form-message"
						id="contactFormMessage"
					 style={{marginTop: "16px"}}
					></div>
				</div>
			</div>
		</section>

		
		<footer className="footer">
			<div className="container">
				<div className="footer-grid">
					<div>
						<div className="footer-logo" data-client-html="brand.footerLogoHtml">
							👑 ROYAL BRAIDS
						</div>
						<p className="footer-desc" data-client-text="storefront.sectionCopy.footerDescription">
							Nairobi’s premier beauty destination for braids and
							beyond—offering expert hair styling, spa indulgence, nail
							artistry, makeup, barber grooming, lash enhancement, wellness
							care, and unforgettable bridal/event transformations.
						</p>
						<div className="social-links">
							<a
								href="https://www.instagram.com"
								target="_blank"
								className="social-link"
								aria-label="Instagram"
								data-client-attr="href:social.instagram"
							>
								<i className="fab fa-instagram"></i>
							</a>
							<a
								href="https://www.facebook.com"
								target="_blank"
								className="social-link"
								aria-label="Facebook"
								data-client-attr="href:social.facebook"
							>
								<i className="fab fa-facebook-f"></i>
							</a>
							<a
								href="https://x.com"
								target="_blank"
								className="social-link"
								aria-label="Twitter/X"
								data-client-attr="href:social.twitter"
							>
								<svg
									viewBox="0 0 24 24"
									fill="none"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M4 4l11.733 16h4.267l-11.733 -16z"></path>
									<path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path>
								</svg>
							</a>
							<a
								href="https://www.tiktok.com"
								target="_blank"
								className="social-link"
								aria-label="TikTok"
								data-client-attr="href:social.tiktok"
							>
								<i className="fab fa-tiktok"></i>
							</a>
								<a
									href="https://wa.me/254740470381"
									target="_blank"
									className="social-link"
									aria-label="WhatsApp"
									data-client-attr="href:social.whatsapp"
								>
									<i className="fab fa-whatsapp"></i>
							</a>
						</div>
					</div>
					<div>
						<h4>Quick Links</h4>
						<ul className="footer-links">
							<li><a href="#home">Home</a></li>
							<li><a href="#services">Services</a></li>
							<li><a href="#gallery">Gallery</a></li>
							<li><a href="#booking">Book Now</a></li>
							<li><a href="#visit">Visit Us</a></li>
							<li><a href="#contact">Contact</a></li>
						</ul>
					</div>
					<div>
						<h4>Services</h4>
						<ul className="footer-links">
							<li><a href="#service-hair-braiding">Hair Services</a></li>
							<li><a href="#service-facials">Beauty Spa Services</a></li>
							<li><a href="#service-manicure">Nail Services</a></li>
							<li><a href="#service-bridal-makeup">Makeup Services</a></li>
							<li><a href="#service-bridal-hair-makeup">Bridal Packages</a></li>
						</ul>
					</div>
					<div>
						<h4>Contact Info</h4>
						<ul className="footer-links">
							<li>
								📍
								<span data-client-text="contact.locationShort"
									>Westlands, Nairobi</span
								>
							</li>
							<li>
								<a
									href="tel:+254740470381"
									target="_blank"
									data-client-attr="href:contact.phonePrimaryHref"
									>📞
									<span data-client-text="contact.phonePrimary"
										>+254 740 470 381</span
									></a
								>
							</li>
							<li>
								<a
									href="mailto:info@royalcuts.ke"
									target="_blank"
									data-client-attr="href:contact.emailPrimaryHref"
									>📧
									<span data-client-text="contact.emailPrimary"
										>info@royalbraids.ke</span
									></a
								>
							</li>
							<li>
								🕐
								<span data-client-text="contact.footerWeekdayHours"
									>Mon-Fri: 8AM - 8PM</span
								>
							</li>
							<li>
								🕐
								<span data-client-text="contact.footerWeekendHours"
									>Sat-Sun: 9AM - 7PM</span
								>
							</li>
						</ul>
					</div>
				</div>
				<div className="footer-bottom">
					<p data-client-text="storefront.sectionCopy.copyright">
						&copy; <span id="footerYearFallback">2026</span> Royal Braids. All
						rights reserved.
					</p>
					<p data-client-text="storefront.sectionCopy.craftedBy">
						Crafted with ❤️ in Nairobi, Kenya
					</p>
				</div>
			</div>
		</footer>

		
		<div className="lightbox" id="lightbox">
			<button className="lightbox-nav lightbox-prev" id="lightboxPrev">❮</button>
			<button className="lightbox-nav lightbox-next" id="lightboxNext">❯</button>
			<div className="lightbox-content-wrap">
				<button className="lightbox-close" id="lightboxClose">✕</button>
				<div className="lightbox-image-stack">
					<div
						className="lightbox-before-after"
						id="lightboxBeforeAfter"
					 style={{display: "none"}}
					>
						<div className="lightbox-image-panel">
							<span>Before</span>
							<img
								src={undefined}
								alt="Before style"
								id="lightboxBeforeImg"
								loading="lazy"
								decoding="async"
							/>
						</div>
						<div className="lightbox-image-panel">
							<span>After</span>
							<img
								src={undefined}
								alt="After style"
								id="lightboxAfterImg"
								loading="lazy"
								decoding="async"
							/>
						</div>
					</div>
					<img
						src={undefined}
						alt="Gallery style"
						id="lightboxImg"
						loading="lazy"
						decoding="async"
					/>
				</div>
				<div className="lightbox-details" id="lightboxDetails">
					<h3 id="lightboxStyleName">Style Name</h3>
					<p id="lightboxStyleType">Style type</p>
					<ul>
						<li>
							<strong>Time Taken:</strong> <span id="lightboxTimeTaken">-</span>
						</li>
						<li>
							<strong>Price Range:</strong>
							<span id="lightboxPriceRange">-</span>
						</li>
						<li><strong>Length:</strong> <span id="lightboxLength">-</span></li>
						<li><strong>Size:</strong> <span id="lightboxSize">-</span></li>
						<li>
							<strong>Hair Type:</strong> <span id="lightboxHairType">-</span>
						</li>
						<li>
							<strong>Stylist:</strong> <span id="lightboxStylist">-</span>
						</li>
					</ul>
					<a
						className="btn btn-primary gallery-book-now-btn"
						href="#booking"
						id="lightboxBookNow"
						>Book Now</a
					>
					<button
						type="button"
						className="btn btn-outline gallery-favorite-btn"
						id="lightboxFavoriteBtn"
					>
						♡ Save Style
					</button>
						<button
							type="button"
							className="btn btn-outline gallery-whatsapp-btn"
							id="lightboxWhatsAppBtn"
						>
							<i className="fab fa-whatsapp" aria-hidden="true"></i> Book via
							WhatsApp
						</button>
					</div>
			</div>
		</div>

		
		<div className="auth-modal" id="authModal" aria-hidden="true">
			<div className="auth-modal-backdrop" id="authModalBackdrop"></div>
			<div
				className="auth-card"
				role="dialog"
				aria-modal="true"
				aria-labelledby="authCardTitle"
			>
				<button
					type="button"
					className="auth-close"
					id="closeAuthModalBtn"
					aria-label="Close log in modal"
				>
					✕
				</button>
				<div className="auth-card-head">
					<p className="section-subtitle">Welcome Back</p>
					<h3 id="authCardTitle">Log in to Manage Bookings, Reviews, Favorites styles & Account</h3>
				</div>

				<button
					type="button"
					className="auth-provider-btn auth-provider-btn--google"
					id="continueWithGoogleBtn"
				>
					<svg className="auth-provider-btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
						<path fill="#4285F4" d="M21.35 12.27c0-.71-.06-1.4-.18-2.06H12v3.9h5.24a4.48 4.48 0 0 1-1.94 2.94v2.44h3.14c1.84-1.7 2.91-4.2 2.91-7.22Z" />
						<path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.44c-.87.58-1.98.93-3.31.93-2.54 0-4.69-1.72-5.46-4.03H3.3v2.52A9.75 9.75 0 0 0 12 21.75Z" />
						<path fill="#FBBC05" d="M6.54 13.85A5.86 5.86 0 0 1 6.23 12c0-.64.11-1.26.31-1.85V7.63H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.06 1.05 4.37l3.24-2.52Z" />
						<path fill="#EA4335" d="M12 6.12c1.43 0 2.72.49 3.73 1.46l2.8-2.8C16.83 3.2 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.7 5.38l3.24 2.52c.77-2.31 2.92-4.03 5.46-4.03Z" />
					</svg>
					<span>Continue with Google</span>
				</button>

				<div className="auth-separator"><span>or</span></div>

				<form id="emailAuthForm" className="auth-email-form">
					<div className="form-group" id="authNameGroup" style={{display: "none"}}>
						<label htmlFor="authName">Name</label>
						<input
							type="text"
							id="authName"
							placeholder="Jane Doe"
							autoComplete="name"
						/>
					</div>
					<div className="form-group">
						<label htmlFor="authEmail">Email</label>
						<input
							type="email"
							id="authEmail"
							placeholder="you@email.com"
							autoComplete="email"
							required
						/>
					</div>
					<div className="form-group auth-password-field">
						<label htmlFor="authPassword">Password</label>
						<div className="auth-password-input-wrap">
							<input
								type="password"
								id="authPassword"
								placeholder="••••••••"
								autoComplete="current-password"
								required
							/>
							<button
								type="button"
								className="auth-password-toggle"
								id="authPasswordToggle"
								aria-label="Show password"
								aria-pressed="false"
							>
								<i className="fa-solid fa-eye" aria-hidden="true"></i>
							</button>
						</div>
					</div>
					<button
						type="submit"
						className="btn btn-primary auth-submit-btn"
						id="emailAuthSubmit"
					>
						Log In
					</button>
				</form>

				<div className="auth-links">
					<button type="button" id="switchToSignupBtn">
							Don&apos;t have an account? Register
					</button>
					<button type="button" id="switchToSigninBtn" className="hidden">
						Already have an account? Log In
					</button>
					<button type="button" id="forgotPasswordBtn">Forgot Password?</button>
					<button type="button" id="continueAsGuestBtn">
						Continue as Guest
					</button>
				</div>
				<div className="form-message" id="authMessage"></div>
				<a className="auth-verify-email-link hidden" id="authVerifyEmailLink" href={verifyEmailHref}>
					Open email verification
				</a>
			</div>
		</div>

			
			<div className="auth-modal terms-modal" id="termsModal" aria-hidden="true">
				<div className="auth-modal-backdrop" id="termsModalBackdrop"></div>
				<div
					className="auth-card terms-card"
					role="dialog"
					aria-modal="true"
					aria-labelledby="termsModalTitle"
				>
					<button
						type="button"
						className="auth-close"
						id="termsModalCloseBtn"
						aria-label="Close terms and conditions"
					>
						✕
					</button>
					<div className="auth-card-head">
						<p className="section-subtitle">A clear start</p>
						<h3 id="termsModalTitle">Terms &amp; Conditions</h3>
					</div>
					<div className="terms-copy">
						<p>Welcome to <strong data-client-text="brand.businessName">Royal Braids</strong>. These terms keep online appointments, product orders, and salon communication simple and respectful.</p>
						<h4>Appointments</h4>
						<p>Online bookings request a time with the salon. Your appointment is confirmed only when the website displays confirmation. Please arrive on time and tell us as early as possible if plans change.</p>
						<h4>Cosmetics orders</h4>
						<p>Cosmetics are ordered through WhatsApp and are not appointments. The salon will confirm stock, final price, collection or delivery details, and payment instructions in the chat. Product orders are never saved as website bookings.</p>
						<h4>Pricing and care</h4>
						<p>Prices shown are starting or listed prices and may change when a consultation, product size, hair length, or custom request changes the work involved. Please share allergies, sensitivities, or relevant care needs before a service.</p>
						<h4>Respect and privacy</h4>
						<p>We use the details you submit to respond to enquiries, manage appointments, provide reminders, and improve salon service. We do not ask for passwords or payment card details through this website. Please use official salon contact channels only.</p>
						<h4>Communication</h4>
						<p>WhatsApp, email, and phone reminders are helpful notifications, not a guarantee of delivery. If a reminder does not arrive, contact the salon directly and keep your appointment confirmation.</p>
					</div>
					<label className="terms-consent-row"><input type="checkbox" id="termsConsentCheckbox" /><span>I have read and agree to these Terms &amp; Conditions.</span></label>
					<div className="terms-actions"><button type="button" className="btn btn-primary" id="acceptTermsBtn" disabled>Accept &amp; Continue</button></div>
				</div>
			</div>

			
		<div
			className="auth-modal manage-account-modal"
			id="manageAccountModal"
			aria-hidden="true"
		>
			<div className="auth-modal-backdrop" id="manageAccountBackdrop"></div>
			<div
				className="auth-card manage-account-card"
				role="dialog"
				aria-modal="true"
				aria-labelledby="manageAccountTitle"
			>
				<button
					type="button"
					className="auth-close"
					id="manageAccountCloseBtn"
					aria-label="Close manage account"
				>
					✕
				</button>

				<div className="auth-card-head">
					<p className="section-subtitle">My Dashboard</p>
					<h3 id="manageAccountTitle">Manage Account</h3>
				</div>

				<div className="form-message" id="manageAccountMessage"></div>

				<div className="manage-account-body">
					<section className="manage-account-section">
						<h4>Profile Info (Personalization)</h4>
						<div className="manage-account-avatar-row">
							<div
								className="manage-account-avatar-preview"
								id="manageAccountAvatarPreview"
							>
								<span id="manageAccountAvatarInitial">R</span>
							</div>
							<div className="manage-account-avatar-actions">
								<label
									className="btn btn-outline manage-account-upload-btn"
									htmlFor="manageAccountAvatarInput"
								>
									Add / Change Picture
								</label>
								<input
									type="file"
									id="manageAccountAvatarInput"
									accept="image/*"
								/>
								<small>JPG/PNG up to 5MB</small>
							</div>
						</div>
						<div className="form-grid">
							<div className="form-group">
								<label htmlFor="manageAccountName">Name</label>
								<input
									type="text"
									id="manageAccountName"
									placeholder="Your full name"
								/>
							</div>
							<div className="form-group">
								<label htmlFor="manageAccountEmail">Email</label>
								<input
									type="email"
									id="manageAccountEmail"
									placeholder="you@email.com"
								/>
								<small
									className="manage-account-input-hint"
									id="manageAccountEmailHint"
									>Use a valid email format (e.g. name@example.com).</small
								>
							</div>
							<div className="form-group full">
								<label htmlFor="manageAccountPhone">Phone Number</label>
								<input
									type="tel"
									id="manageAccountPhone"
									placeholder="+254 740 470 381"
								/>
								<small
									className="manage-account-input-hint"
									id="manageAccountPhoneHint"
									>Use digits with optional +, spaces, or dashes.</small
								>
							</div>
						</div>
						<button
							type="button"
							className="btn btn-primary"
							id="manageAccountSaveProfileBtn"
						>
							Save Profile
						</button>
					</section>

					<section className="manage-account-section">
						<h4>Login &amp; Security (Protection)</h4>
						<div className="form-grid">
							<div className="form-group">
								<label htmlFor="manageAccountCurrentPassword"
									>Current Password</label
								>
								<div className="auth-password-input-wrap">
									<input
										type="password"
										id="manageAccountCurrentPassword"
										autoComplete="current-password"
										placeholder="••••••••"
									/>
									<button
										type="button"
										className="auth-password-toggle"
										id="manageAccountCurrentPasswordToggle"
										aria-label="Show current password"
										aria-pressed="false"
									>
										<i className="fa-solid fa-eye" aria-hidden="true"></i>
									</button>
								</div>
							</div>
							<div className="form-group">
								<label htmlFor="manageAccountNewPassword">New Password</label>
								<div className="auth-password-input-wrap">
									<input
										type="password"
										id="manageAccountNewPassword"
										autoComplete="new-password"
										placeholder="At least 6 characters"
									/>
									<button
										type="button"
										className="auth-password-toggle"
										id="manageAccountNewPasswordToggle"
										aria-label="Show new password"
										aria-pressed="false"
									>
										<i className="fa-solid fa-eye" aria-hidden="true"></i>
									</button>
								</div>
								<div className="manage-password-strength" aria-live="polite">
									<div className="manage-password-strength-bar">
										<span id="managePasswordStrengthFill"></span>
									</div>
									<small id="managePasswordStrengthText"
										>Strength: Too weak</small
									>
								</div>
								<ul className="manage-password-checks" id="managePasswordChecks">
									<li data-rule="length">At least 8 characters</li>
									<li data-rule="upper">At least 1 uppercase letter</li>
									<li data-rule="lower">At least 1 lowercase letter</li>
									<li data-rule="number">At least 1 number</li>
								</ul>
							</div>
						</div>
						<div className="manage-account-inline-actions">
							<button
								type="button"
								className="btn btn-primary"
								id="manageAccountChangePasswordBtn"
							>
								Change Password
							</button>
							<button
								type="button"
								className="btn btn-outline"
								id="manageAccountResetPasswordBtn"
							>
								Send Reset Email
							</button>
						</div>
					</section>

					<section className="manage-account-section">
						<h4>Account Settings &amp; Customization</h4>
						<div className="manage-account-subsection">
							<h5>Appearance</h5>
							<div className="form-grid">
								<div className="form-group">
									<label htmlFor="manageAccountThemeSelect">Theme</label>
									<select id="manageAccountThemeSelect">
										<option value="dark">Dark</option>
										<option value="light">Light</option>
									</select>
								</div>
								<div className="form-group">
									<label htmlFor="manageAccountFontSizeSelect">Font Size</label>
									<select id="manageAccountFontSizeSelect">
										<option value="normal">Default</option>
										<option value="large">Large</option>
										<option value="xlarge">Extra Large</option>
									</select>
								</div>
							</div>
							<div className="manage-account-checks">
								<label
									><input type="checkbox" id="manageAccountHighContrast" /> High
									Contrast</label
								>
								<label
									><input type="checkbox" id="manageAccountReducedMotion" />
									Reduced Motion</label
								>
							</div>
						</div>

						<div className="manage-account-subsection">
							<h5>Notifications</h5>
							<div className="manage-account-checks">
								<label
									><input type="checkbox" id="manageAccountNotifEmail" /> Email
									Notifications</label
								>
								<label
									><input type="checkbox" id="manageAccountNotifSms" /> SMS
									Notifications</label
								>
								<label
									><input type="checkbox" id="manageAccountNotifPush" /> Push
									Notifications</label
								>
							</div>
							<button
								type="button"
								className="btn btn-primary"
								id="manageAccountSavePreferencesBtn"
							>
								Save Preferences
							</button>
						</div>

						<div className="manage-account-subsection manage-account-danger-zone">
							<h5>Account Deletion</h5>
							<p>This action is permanent and cannot be undone.</p>
							<button
								type="button"
								className="btn btn-outline dashboard-delete-btn"
								id="manageAccountDeleteBtn"
							>
								Delete Account
							</button>
						</div>
					</section>
				</div>
			</div>
		</div>

		
		<div className="auth-modal" id="deleteAccountConfirmModal" aria-hidden="true">
			<div className="auth-modal-backdrop" id="deleteAccountConfirmBackdrop"></div>
			<div
				className="auth-card delete-account-confirm-card"
				role="dialog"
				aria-modal="true"
				aria-labelledby="deleteAccountConfirmTitle"
			>
				<button
					type="button"
					className="auth-close"
					id="deleteAccountConfirmCloseBtn"
					aria-label="Close delete account confirmation"
				>
					✕
				</button>
				<div className="auth-card-head">
					<p className="section-subtitle">Account Safety</p>
					<h3 id="deleteAccountConfirmTitle">Delete your account?</h3>
				</div>
				<p
					className="delete-account-confirm-message"
					id="deleteAccountConfirmMessage"
				>
					This action is permanent and cannot be undone.
				</p>
				<div className="delete-account-confirm-actions">
					<button
						type="button"
						className="btn btn-outline"
						id="deleteAccountConfirmCancelBtn"
					>
						Cancel
					</button>
					<button
						type="button"
						className="btn btn-primary delete-account-confirm-btn"
						id="deleteAccountConfirmProceedBtn"
					>
						Yes, Delete
					</button>
				</div>
			</div>
		</div>

		
		<div
			className="contact-success-popup"
			id="contactSuccessPopup"
			role="status"
			aria-live="polite"
		>
			<button
				className="contact-success-popup__close"
				id="contactSuccessPopupClose"
				aria-label="Close notification"
			>
				✕
			</button>
			<div className="contact-success-popup__icon" aria-hidden="true">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					strokeWidth="2.4"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
					<polyline points="22 4 12 14.01 9 11.01"></polyline>
				</svg>
			</div>
			<div className="contact-success-popup__content">
				<h4>Message sent successfully.</h4>
				<p>We&apos;ll get back to you soon.</p>
			</div>
		</div>

		
		<div
			className="contact-success-popup account-delete-popup"
			id="accountDeleteSuccessPopup"
			role="status"
			aria-live="polite"
		>
			<div className="contact-success-popup__icon" aria-hidden="true">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					strokeWidth="2.4"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
					<polyline points="22 4 12 14.01 9 11.01"></polyline>
				</svg>
			</div>
			<div className="contact-success-popup__content">
				<h4>Account deleted successfully.</h4>
				<p>You are now continuing as guest.</p>
			</div>
		</div>

		<div
			className="favorites-toast"
			id="favoritesToast"
			role="status"
			aria-live="polite"
		></div>

		
		<a href="#home" className="back-to-top" id="backToTop" aria-label="Back to top">
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<polyline points="18 15 12 9 6 15"></polyline>
			</svg>
		</a>
			<a
				href="https://wa.me/254740470381"
				className="floating-whatsapp"
				id="floatingWhatsAppButton"
				aria-label="Quick WhatsApp booking"
				target="_blank"
				rel="noopener"
			>
				<i className="fab fa-whatsapp" aria-hidden="true"></i>
			</a>
		</div>
	
		</>
	)
}
