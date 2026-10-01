import Link from "next/link"

import { SignupForm } from "./SignupForm"

export default function SignupPage() {
	return (
		<main className="auth-page">
			<section className="auth-card" aria-labelledby="signup-title">
				<Link className="auth-close-button" href="/" aria-label="Close account creation">
					<span aria-hidden="true">×</span>
				</Link>
				<Link className="brand-mark" href="/">
					Beauty Sphia
				</Link>
				<div className="auth-card-head">
					<p className="section-subtitle">Start your salon journey</p>
					<h1 id="signup-title">Create your workspace account</h1>
					<p className="auth-card__intro">
						Set up your account first. You can add your store details and choose a plan next.
					</p>
				</div>
				<SignupForm />
			</section>
		</main>
	)
}
