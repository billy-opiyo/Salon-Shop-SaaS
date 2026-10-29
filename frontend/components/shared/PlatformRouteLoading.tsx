export function PlatformRouteLoading() {
	return (
		<main className="platform-route-loading" role="status" aria-live="polite" aria-label="Loading Beauty Sphia">
			<span className="platform-route-loading__eyebrow">Beauty Sphia</span>
			<span className="platform-route-loading__title" aria-hidden="true" />
			<span className="platform-route-loading__copy" aria-hidden="true" />
			<div className="platform-route-loading__cards" aria-hidden="true">
				<span />
				<span />
				<span />
			</div>
			<span className="platform-route-loading__sr-only">Loading page content…</span>
		</main>
	)
}
