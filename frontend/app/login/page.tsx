import Link from "next/link"
import { AuthCloseButton } from "@/components/shared/AuthCloseButton"
import { LoginForm } from "./LoginForm"
import { getSafeAuthCallbackUrl } from "@shared/authCallback"

interface LoginPageProps {
	readonly searchParams: Promise<{ readonly callbackUrl?: string | string[] }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
	const { callbackUrl } = await searchParams
	const safeCallbackUrl = getSafeAuthCallbackUrl(callbackUrl)
	return (
		<main className="auth-page">
			<section className="auth-card" aria-labelledby="login-title">
				<AuthCloseButton label="Close sign in" />
				<Link className="brand-mark" href="/">
					Beauty Sphia
				</Link>
				<div className="auth-card-head">
					<p className="section-subtitle">Welcome back</p>
					<h1 id="login-title">Sign in to your salon workspace</h1>
					<p className="auth-card__intro">
						Manage your storefront, bookings, services, and team from one place.
					</p>
				</div>
				<LoginForm callbackUrl={safeCallbackUrl} />
			</section>
		</main>
	)
}
