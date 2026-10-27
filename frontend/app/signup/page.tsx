import Link from "next/link"
import { AuthCloseButton } from "@/components/shared/AuthCloseButton"
import { SignupForm } from "./SignupForm"

export default function SignupPage() {
	return (
		<main className="auth-page">
			<section className="auth-card" aria-labelledby="signup-title">
				<AuthCloseButton label="Close account creation" />
				<Link className="brand-mark" href="/">
					Beauty Sphia
				</Link>
				<div className="auth-card-head">
					<p className="section-subtitle">Start your salon journey</p>
					<h1 id="signup-title">Create your workspace account</h1>
					<p className="auth-card__intro">
						Set up your account first. You can add your salon details and choose a plan next.
					</p>
				</div>
				<SignupForm />
			</section>
		</main>
	)
}
