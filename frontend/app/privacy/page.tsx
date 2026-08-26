import Link from "next/link"

export default function PrivacyPage() {
	return (
		<main className="policy-page">
			<Link className="brand-mark" href="/">
				Beauty Sphia
			</Link>
			<p className="eyebrow">Platform policy</p>
			<h1>Privacy Policy</h1>
			<p>
				We use account, salon, booking, and operational data to provide the
				platform, protect accounts, and support customer workflows.
			</p>
			<h2>Data stewardship</h2>
			<p>
				Salon owners must collect and use customer information lawfully, explain
				their own salon practices, and keep access limited to authorized team
				members.
			</p>
			<h2>Security</h2>
			<p>
				We use authentication, authorization, rate limits, audit records, and
				provider safeguards appropriate to the platform services enabled for a
				workspace.
			</p>
			<h2>Agreement</h2>
			<p>By creating a salon workspace, you acknowledge this privacy policy.</p>
		</main>
	)
}
