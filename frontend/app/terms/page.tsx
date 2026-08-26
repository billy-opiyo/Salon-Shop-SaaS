import Link from "next/link"

export default function TermsPage() {
	return (
		<main className="policy-page">
			<Link className="brand-mark" href="/">
				Beauty Sphia
			</Link>
			<p className="eyebrow">Platform policy</p>
			<h1>Terms of Service</h1>
			<p>
				These terms govern salon workspace creation, storefront publishing,
				bookings, customer communication, and responsible use of the Salon Store
				Beauty Sphia.
			</p>
			<h2>Workspace responsibility</h2>
			<p>
				Owners are responsible for accurate salon information, lawful content,
				customer consent, and the services offered through their storefront.
			</p>
			<h2>Platform use</h2>
			<p>
				Do not misuse the platform, attempt unauthorized access, upload harmful
				content, or use customer information outside the purposes disclosed to
				customers.
			</p>
			<h2>Agreement</h2>
			<p>
				By creating a salon workspace, you confirm that you have read and agree
				to these terms.
			</p>
		</main>
	)
}
