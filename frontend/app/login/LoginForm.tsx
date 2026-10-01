"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import { signIn } from "next-auth/react"

import { GoogleIcon } from "@/components/shared/GoogleIcon"

export function LoginForm() {
	const router = useRouter()
	const [message, setMessage] = useState<string>("")
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [showPassword, setShowPassword] = useState(false)

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setMessage("")
		setIsSubmitting(true)
		const formData = new FormData(event.currentTarget)
		try {
			const result = await signIn("credentials", {
				email: formData.get("email"),
				password: formData.get("password"),
				redirect: false,
			})
			if (result?.error) {
				setMessage("Sign-in failed. Check your details and verify your email.")
				return
			}
			router.push("/manage")
		} catch {
			setMessage("Sign-in is temporarily unavailable. Please try again.")
		} finally {
			setIsSubmitting(false)
		}
	}

	async function handleGoogleSignIn() {
		setMessage("")
		setIsSubmitting(true)
		try {
			await signIn("google", { callbackUrl: "/manage" })
		} catch {
			setIsSubmitting(false)
			setMessage("Google sign-in is temporarily unavailable. Please try again.")
		}
	}

	return (
		<form className="auth-form auth-form--salon-parity" onSubmit={handleSubmit}>
			<button
				className="auth-provider-btn auth-provider-btn--google"
				type="button"
				onClick={handleGoogleSignIn}
				disabled={isSubmitting}
			>
				<GoogleIcon />
				Continue with Google
			</button>
			<div className="auth-separator" aria-hidden="true">
				<span>or</span>
			</div>
			<div className="form-group">
				<label htmlFor="platformAuthEmail">Email</label>
				<input
					id="platformAuthEmail"
					name="email"
					type="email"
					placeholder="you@email.com"
					autoComplete="email"
					required
				/>
			</div>
			<div className="form-group auth-password-field">
				<label htmlFor="platformAuthPassword">Password</label>
				<div className="auth-password-input-wrap">
					<input
						id="platformAuthPassword"
						name="password"
						type={showPassword ? "text" : "password"}
						placeholder="••••••••"
						autoComplete="current-password"
						minLength={12}
						required
					/>
					<button
						className="auth-password-toggle"
						type="button"
						aria-label={showPassword ? "Hide password" : "Show password"}
						aria-pressed={showPassword}
						onClick={() => setShowPassword((visible) => !visible)}
					>
						<i className={showPassword ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} aria-hidden="true" />
					</button>
				</div>
			</div>
			<button
				className="button button--primary auth-submit-btn"
				type="submit"
				disabled={isSubmitting}
			>
				{isSubmitting ? "Signing in…" : "Log In"}
			</button>
			{message && (
				<p className="form-message" role="alert">
					{message}
				</p>
			)}
			<div className="auth-links">
				<Link href="/signup">Don&apos;t have an account? Register</Link>
				<Link href="/reset-password">Forgot Password?</Link>
				<Link href="/">Continue as Guest</Link>
			</div>
		</form>
	)
}
