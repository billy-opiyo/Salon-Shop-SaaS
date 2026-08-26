import Link from "next/link"

export default function CookiesPage() {
	return (
		<main className="policy-page">
			<Link className="brand-mark" href="/">
				Salon Store Platform
			</Link>
			<p className="eyebrow">Platform policy</p>
			<h1>Cookie Policy</h1>
			<p>
				The platform may use essential cookies for authentication, security,
				preferences, and reliable navigation.
			</p>
			<h2>Essential cookies</h2>
			<p>
				These support secure sessions and platform operation. They cannot be
				disabled while using protected workspace features.
			</p>
			<h2>Preferences</h2>
			<p>
				Theme and accessibility preferences may be stored locally or in your
				account when the relevant feature is enabled.
			</p>
			<h2>Agreement</h2>
			<p>By using the platform, you acknowledge this cookie policy.</p>
		</main>
	)
}
