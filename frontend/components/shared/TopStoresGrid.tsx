import { getTopStores } from "@/lib/platformStores"
import { StoreTransitionLink } from "@/components/shared/StoreTransitionLink"

function RatingStars({
	rating,
	reviewCount,
}: {
	readonly rating: number
	readonly reviewCount: number
}) {
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
}

export function TopStoresGrid({ limit = 3 }: TopStoresGridProps) {
	const stores = getTopStores(limit)

	return (
		<div className="top-stores-list">
			{stores.map((store) => (
				<article
					className={`top-store${store.available ? "" : " top-store--soon"}`}
					key={store.slug}
				>
					<div
						className="top-store__image"
						style={{ backgroundImage: `url("${store.imageUrl}")` }}
						role="img"
						aria-label={`${store.name} storefront`}
					/>
					<div className="top-store__content">
						<span className="eyebrow">
							{store.available
								? `Available Store · ${store.location}`
								: `Opening soon · ${store.location}`}
						</span>
						<h3>{store.name}</h3>
						<p>{store.tagline}</p>
						<RatingStars
							rating={store.rating}
							reviewCount={store.reviewCount}
						/>
						{store.available ? (
							<StoreTransitionLink
								className="top-store__link"
								href={store.href}
							>
								Open {store.name} Store →
							</StoreTransitionLink>
						) : (
							<span className="top-store__soon-label">
								Coming to Beauty Sphia
							</span>
						)}
					</div>
				</article>
			))}
		</div>
	)
}
