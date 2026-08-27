import Link from "next/link"

import { LoginForm } from "./LoginForm"

export default function LoginPage() {
	return (
		<main className="auth-page">
			<section className="auth-card" aria-labelledby="login-title">
				<Link className="auth-close-button" href="/" aria-label="Close sign in">
					<span aria-hidden="true">×</span>
				</Link>
				<Link className="brand-mark" href="/">
					Beauty Sphia
				</Link>
				<p className="eyebrow">Secure workspace access</p>
				<h1 id="login-title">Welcome back.</h1>
				<p className="auth-card__intro">
					Sign in to manage your salon workspace and storefront.
				</p>
				<LoginForm />
			</section>
		</main>
	)
}
