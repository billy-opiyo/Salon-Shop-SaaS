import { getAllPublicStores, getTopStores } from "@/lib/platformStores"
import { StoreTransitionLink } from "@/components/shared/StoreTransitionLink"
import Image from "next/image"
import Link from "next/link"

function RatingStars({
	rating,
	reviewCount,
}: {
	readonly rating: number | null
	readonly reviewCount: number
}) {
	if (rating === null || reviewCount === 0) {
		return <span className="top-store__rating">New on Beauty Sphia</span>
	}
	return (
		<span
			className="top-store__rating"
			aria-label={`${rating.toFixed(1)} out of 5 stars from ${reviewCount} reviews`}
		>
			<span className="top-store__stars" aria-hidden="true">
				{Array.from({ length: 5 }, (_, index) => {
					const filled = rating >= index + 1
					const half = !filled && rating > index + 0.25
					return (
						<i
							key={index}
							className={`${
								half
									? "fas fa-star-half-alt"
									: filled
										? "fas fa-star"
										: "far fa-star"
							}`}
						/>
					)
				})}
			</span>
			<strong>{rating.toFixed(1)}</strong>
			<span className="top-store__review-count">
				{reviewCount.toLocaleString()} reviews
			</span>
		</span>
	)
}

interface TopStoresGridProps {
	readonly limit?: number
	readonly showAll?: boolean
}

export async function TopStoresGrid({ limit = 3, showAll = false }: TopStoresGridProps) {
	const stores = showAll ? await getAllPublicStores() : await getTopStores(limit)

	if (stores.length === 0) {
		return (
			<div className="platform-stores-empty">
				<p>Salon listings are unavailable right now. You can still start your salon or check back shortly.</p>
				<Link className="button button--outline" href="/onboarding">Be the first to start your salon</Link>
			</div>
		)
	}

	return (
		<div className="top-stores-list">
			{stores.map((store, index) => (
				<article className={`top-store${store.isDemo ? " top-store--soon" : ""}`} key={store.slug}>
					<div className="top-store__image">
						<Image
							className="top-store__image-content"
							src={store.imageUrl}
							alt={`${store.name} storefront`}
							fill
							sizes="(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 33vw"
							loading={index === 0 ? "eager" : "lazy"}
							unoptimized={/^https?:\/\//i.test(store.imageUrl)}
						/>
					</div>
					<div className="top-store__content">
						<span className="eyebrow">{store.isDemo ? "Demo salon" : "Salon"} · {store.location}</span>
						<h3>{store.name}</h3>
						<p>{store.tagline}</p>
						{store.isDemo ? (
							<span className="top-store__soon-label">Coming soon</span>
						) : (
							<>
								<RatingStars
									rating={store.rating}
									reviewCount={store.reviewCount}
								/>
								<StoreTransitionLink className="top-store__link" href={store.href} prefetch={!showAll}>
									Open {store.name} Salon →
								</StoreTransitionLink>
							</>
						)}
					</div>
				</article>
			))}
		</div>
	)
}
