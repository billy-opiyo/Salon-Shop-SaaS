export default function TenantStorefrontLoading() {
	return (
		<main
			className="salon-storefront-loading"
			aria-live="polite"
			aria-busy="true"
		>
			<span className="salon-storefront-loading__mark" aria-hidden="true">
				✦
			</span>
			<p>Opening salon storefront…</p>
		</main>
	)
}
