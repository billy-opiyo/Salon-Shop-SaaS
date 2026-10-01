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
				<div className="auth-card-head">
					<p className="section-subtitle">Welcome Back</p>
					<h1 id="login-title">Log in to Manage Bookings, Reviews, Favorites styles &amp; Account</h1>
				</div>
				<LoginForm />
			</section>
		</main>
	)
}
