export default function MerchantAdminPageLoading() {
	return (
		<main className="manage-page merchant-admin-page-loading" aria-busy="true">
			<header className="manage-header">
				<div>
					<p className="eyebrow">Salon workspace</p>
					<h1>Loading admin page</h1>
					<p className="auth-card__intro" role="status">
						Opening the selected section…
					</p>
				</div>
			</header>
			<div className="merchant-admin-loading-card" aria-hidden="true" />
			<div className="merchant-admin-loading-card" aria-hidden="true" />
		</main>
	)
}
