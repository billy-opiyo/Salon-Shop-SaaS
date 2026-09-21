import type { ReactNode } from "react"

export interface SalonServiceItem {
	readonly name: string
	readonly desc: string
	readonly price: string
	readonly duration: string
	readonly category: string
	readonly orderOnly?: boolean
}

export interface SalonGalleryItem {
	readonly id?: string
	readonly styleName: string
	readonly serviceCategory: string
	readonly imageUrl: string
	readonly beforeImageUrl?: string
	readonly serviceName?: string
	readonly styleType?: string
	readonly length?: string
	readonly size?: string
	readonly hairType?: string
	readonly stylistName?: string
	readonly timeTaken?: string
	readonly priceRange?: string
	readonly featuredTrending?: boolean
	readonly featuredMostBooked?: boolean
	readonly createdAt?: string
	readonly updatedAt?: string
}

export interface SalonReviewItem {
	readonly id?: string
	readonly name: string
	readonly rating: number
	readonly text: string
	readonly status?: string
	readonly createdAt?: string
}

export interface SalonBlogItem {
	readonly id?: string
	readonly slug?: string
	readonly title: string
	readonly excerpt: string
	readonly category?: string
	readonly imageUrl?: string
	readonly readTime?: string
	readonly publishDate?: string
	readonly readMoreUrl?: string
}

const CATEGORY_LABELS: Readonly<Record<string, string>> = {
	"braids-services": "Braids Services",
	"hair-services": "Hair Services",
	"beauty-spa-services": "Beauty Spa Services",
	"nail-services": "Nail Services",
	"makeup-services": "Makeup Services",
	"barber-services": "Barber Services",
	"massage-wellness": "Massage & Wellness",
	"eyebrow-lash-services": "Eyebrow & Lash Services",
	"bridal-event-packages": "Bridal / Event Packages",
	"cosmetics-products": "Cosmetics Products",
}

const FALLBACK_IMAGE =
	"/assets/salon/1000_F_595420115_RZi6MAsq90qVRMfFz37ZKBianocAltUu.jpg"

function slugify(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
}

function safeImageUrl(value: string | undefined): string {
	if (!value) return FALLBACK_IMAGE
	if (value.startsWith("/") || value.startsWith("https://")) return value
	return FALLBACK_IMAGE
}

function serviceIcon(): ReactNode {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M6 3v12" />
			<path d="M18 3v12" />
			<circle cx="6" cy="18" r="3" />
			<circle cx="18" cy="18" r="3" />
			<path d="M6 6h12" />
		</svg>
	)
}

export function SalonServices({
	items,
}: Readonly<{ items: readonly SalonServiceItem[] }>): ReactNode {
	const groups = new Map<string, SalonServiceItem[]>()
	for (const item of items) {
		const group = groups.get(item.category) ?? []
		group.push(item)
		groups.set(item.category, group)
	}

	return Array.from(groups.entries()).map(([category, services]) => (
		<section
			className="services-category-group"
			data-category={category}
			key={category}
		>
			<header className="services-category-header">
				<h3 className="services-category-title">
					{CATEGORY_LABELS[category] ?? category}
				</h3>
				<p className="services-category-count">
					{services.length} service{services.length === 1 ? "" : "s"}
				</p>
			</header>
			<div className="services-category-grid">
				{services.map((service, index) => {
					const id = slugify(service.name)
					return (
						<div
							className={
								"service-card animate-on-scroll visible delay-" +
								((index % 4) + 1)
							}
							id={"service-" + id}
							key={service.name}
						>
							<div className="service-icon">{serviceIcon()}</div>
							<h3>{service.name}</h3>
							<p>{service.desc}</p>
							<div>
								<span className="service-price">{service.price}</span>
								<span className="service-duration">
									<svg
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<circle cx="12" cy="12" r="10" />
										<polyline points="12 6 12 12 16 14" />
									</svg>
									{service.duration}
								</span>
							</div>
							<div className="service-card-actions">
								<button
									className="service-book-btn"
									type="button"
									data-service-name={service.name}
									data-order-only={String(Boolean(service.orderOnly))}
								>
									{service.orderOnly ? "Order Product" : "Book This Service"}
								</button>
								<button
									className="service-whatsapp-btn"
									type="button"
									data-whatsapp-service={service.name}
									data-whatsapp-price={service.price}
								>
									<i className="fab fa-whatsapp" aria-hidden="true" /> {service.orderOnly ? "Order via WhatsApp" : "Book via WhatsApp"}
								</button>
							</div>
						</div>
					)
				})}
			</div>
		</section>
	))
}

export function SalonGallery({
	items,
}: Readonly<{ items: readonly SalonGalleryItem[] }>): ReactNode {
	return items.map((item, index) => {
		const hasBeforeAfter = Boolean(item.beforeImageUrl && item.imageUrl)
		return (
			<div
				className="gallery-item"
				data-gallery-index={index}
				data-gallery-id={item.id ?? item.styleName}
				data-gallery-service={item.serviceCategory}
				data-gallery-sub-service={item.serviceName ?? item.styleName}
				data-gallery-length={item.length ?? ""}
				data-gallery-size={item.size ?? ""}
				data-gallery-style-type={item.styleType ?? ""}
				data-gallery-technique={item.styleType ?? ""}
				data-gallery-created-at={item.createdAt ?? ""}
				data-gallery-updated-at={item.updatedAt ?? ""}
				data-featured-trending={String(Boolean(item.featuredTrending))}
				data-featured-most-booked={String(Boolean(item.featuredMostBooked))}
				key={item.id ?? item.styleName}
				style={{ animationDelay: `${index * 0.1}s` }}
			>
				{hasBeforeAfter ? (
					<div
						className="gallery-slideshow"
						aria-label={item.styleName + " before and after slideshow"}
					>
						<img
							className="gallery-slideshow-image gallery-slideshow-before"
							src={safeImageUrl(item.beforeImageUrl)}
							alt={item.styleName + " before"}
							loading="lazy"
							decoding="async"
						/>
						<img
							className="gallery-slideshow-image gallery-slideshow-after"
							src={safeImageUrl(item.imageUrl)}
							alt={item.styleName + " after"}
							loading="lazy"
							decoding="async"
						/>
					</div>
				) : (
					<img
						src={safeImageUrl(item.imageUrl)}
						alt={item.styleName}
						loading="lazy"
						decoding="async"
					/>
				)}
				<div className="gallery-overlay">
					<h4>{item.styleName}</h4>
					<p>
						{item.serviceCategory} · {item.styleType ?? "Salon style"} · by {item.stylistName ?? "Salon Team"}
					</p>
					{hasBeforeAfter ? <span className="before-after">Before &amp; After</span> : null}
					<button
						type="button"
						className="gallery-save-favorite-btn"
						data-fav-style-id={item.id ?? ""}
						aria-pressed="false"
					>
						♡ Save
					</button>
				</div>
			</div>
		)
	})
}

export function SalonTestimonials({
	items,
}: Readonly<{ items: readonly SalonReviewItem[] }>): ReactNode {
	return items.map((review, index) => (
		<div
			className="testimonial-card"
			data-review-index={index}
			data-review-rating={review.rating}
			data-review-created-at={review.createdAt ?? ""}
			key={review.id ?? review.name + index}
		>
			<div className="testimonial-stars" aria-label={`${review.rating} out of 5 stars`}>
				{Array.from({ length: Math.max(0, Math.min(5, review.rating)) }, (_, star) => (
					<svg key={star} viewBox="0 0 24 24" aria-hidden="true">
						<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
					</svg>
				))}
			</div>
			<p className="testimonial-text">&quot;{review.text}&quot;</p>
			<div className="testimonial-author">
				<div className="testimonial-avatar">{review.name.charAt(0).toUpperCase()}</div>
				<div className="testimonial-author-info">
					<h4>{review.name}</h4>
					<span>Verified Client</span>
				</div>
			</div>
			<div className="testimonial-social" aria-hidden="true">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
					<path d="M20 6 9 17l-5-5" />
				</svg>
			</div>
		</div>
	))
}

export function SalonBlogs({
	items,
	}: Readonly<{ items: readonly SalonBlogItem[] }>): ReactNode {
	return items.map((blog, index) => (
		<article
			className="blog-card"
			data-blog-index={index}
			data-blog-publish-date={blog.publishDate ?? ""}
			key={blog.id ?? blog.slug ?? blog.title + index}
		>
			<div className="blog-card-image">
				<img
					src={safeImageUrl(blog.imageUrl)}
					alt={blog.title}
					loading="lazy"
					decoding="async"
				/>
			</div>
			<div className="blog-card-content">
				<div className="blog-card-meta">
					<span>{blog.category ?? "Salon Journal"}</span>
					<span>{blog.readTime ?? "5 min read"}</span>
				</div>
				<h3>{blog.title}</h3>
				<p className="blog-card-excerpt">{blog.excerpt}</p>
				<a href={blog.readMoreUrl ?? "#blog"} className="read-more">
					Read More
					<svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
						<line x1="5" y1="12" x2="19" y2="12" />
						<polyline points="12 5 19 12 12 19" />
					</svg>
				</a>
			</div>
		</article>
	))
}

export function SalonServiceOptions({
	items,
}: Readonly<{ items: readonly SalonServiceItem[] }>): ReactNode {
	const categories = Array.from(new Set(items.map((item) => item.category)))
	return (
		<>
			{categories.map((category) => (
				<optgroup key={category} label={CATEGORY_LABELS[category] ?? category}>
					{items
						.filter((item) => item.category === category)
						.map((item) => (
							<option
								key={item.name}
								value={item.name}
								data-order-only={String(Boolean(item.orderOnly))}
							>
								{item.name} ({item.price}){item.orderOnly ? " - Order via WhatsApp" : ""}
							</option>
						))}
				</optgroup>
			))}
			<option value="" disabled>
				◆ OTHER SERVICES ◆
			</option>
			<option value="__custom_service__">✨ Other Service (Type Yours)</option>
		</>
	)
}
