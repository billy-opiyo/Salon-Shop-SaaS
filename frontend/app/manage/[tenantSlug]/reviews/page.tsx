import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
	listReviewsForUser,
	MerchantReviewError,
} from "@backend/services/merchantReviewService"
import { deleteReview, updateReview } from "./actions"

interface ReviewsPageProps {
	readonly params: Promise<{ tenantSlug: string }>
}

export default async function MerchantReviewsPage({
	params,
}: ReviewsPageProps) {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const { tenantSlug } = await params
	let reviews
	try {
		reviews = await listReviewsForUser(session.user.id, tenantSlug)
	} catch (error) {
		if (error instanceof MerchantReviewError) redirect(`/manage/${tenantSlug}`)
		throw error
	}
	return (
		<main className="manage-page">
			<header className="manage-header">
				<div>
					<p className="eyebrow">Storefront management</p>
					<h1>Reviews</h1>
					<p className="auth-card__intro">
						Moderate customer feedback before it appears on the public salon
						storefront.
					</p>
				</div>
			</header>
			<section className="manage-store-list" aria-label="Reviews">
				{reviews.length === 0 ? (
					<p className="manage-empty">No reviews have been submitted.</p>
				) : (
					reviews.map((review) => (
						<article className="manage-store" key={review.id}>
							<div>
								<p className="eyebrow">
									{review.status.toLowerCase()} · {"★".repeat(review.rating)}
									{review.featured ? " · Featured" : ""}
								</p>
								<h2>{review.name}</h2>
								<p>{review.serviceName ?? "Salon visit"}</p>
								<p>{review.text}</p>
								{review.replyText && <p>Reply: {review.replyText}</p>}
							</div>
							<div className="manage-store__actions">
								<form action={updateReview}>
									<input type="hidden" name="tenantSlug" value={tenantSlug} />
									<input type="hidden" name="reviewId" value={review.id} />
									<input type="hidden" name="status" value="APPROVED" />
									<button
										className="button button--outline button--small"
										type="submit"
									>
										Approve
									</button>
								</form>
								<form action={updateReview}>
									<input type="hidden" name="tenantSlug" value={tenantSlug} />
									<input type="hidden" name="reviewId" value={review.id} />
									<input type="hidden" name="status" value="REJECTED" />
									<button
										className="button button--outline button--small"
										type="submit"
									>
										Reject
									</button>
								</form>
								<form action={updateReview}>
									<input type="hidden" name="tenantSlug" value={tenantSlug} />
									<input type="hidden" name="reviewId" value={review.id} />
									<input
										type="hidden"
										name="featured"
										value={String(!review.featured)}
									/>
									<button
										className="button button--outline button--small"
										type="submit"
									>
										{review.featured ? "Unfeature" : "Feature"}
									</button>
								</form>
								<form action={deleteReview}>
									<input type="hidden" name="tenantSlug" value={tenantSlug} />
									<input type="hidden" name="reviewId" value={review.id} />
									<button
										className="button button--outline button--small"
										type="submit"
									>
										Delete
									</button>
								</form>
							</div>
						</article>
					))
				)}
			</section>
		</main>
	)
}
