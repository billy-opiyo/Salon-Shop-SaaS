"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { signIn } from "next-auth/react"

import { GoogleIcon } from "@/components/shared/GoogleIcon"
import { TurnstileWidget } from "@/components/shared/TurnstileWidget"
import { getSafeAuthCallbackUrl } from "@shared/authCallback"
import { openNativeGoogleSignIn } from "@/lib/mobileGoogleAuth"

import { registerAccount } from "./actions"

export function SignupForm({ callbackUrl = "/account" }: { readonly callbackUrl?: string }) {
	const [message, setMessage] = useState<string>("")
	const [messageType, setMessageType] = useState<"success" | "error" | "notice" | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [turnstileToken, setTurnstileToken] = useState("")
	const [turnstileAttempt, setTurnstileAttempt] = useState(0)

	async function handleGoogleSignUp() {
		setMessage("")
		setMessageType(null)
		setIsSubmitting(true)
		try {
			if (await openNativeGoogleSignIn(getSafeAuthCallbackUrl(callbackUrl))) {
				setIsSubmitting(false)
				return
			}
			await signIn("google", { callbackUrl: getSafeAuthCallbackUrl(callbackUrl) })
		} catch {
			setIsSubmitting(false)
			setMessage("Google sign-up is temporarily unavailable. Please try again.")
			setMessageType("error")
		}
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const form = event.currentTarget
		setMessage("")
		setMessageType(null)
		setIsSubmitting(true)
		try {
			const result = await registerAccount(new FormData(event.currentTarget))
			setTurnstileToken("")
			setTurnstileAttempt((attempt) => attempt + 1)
			if (!result.ok) {
				setMessage(result.message)
				setMessageType("error")
				return
			}
			setMessage(result.verificationSent
				? "Account created. Check your inbox to verify your email, then sign in to your account."
				: "Account created, but we could not send the verification email. Contact Beauty Sphia support to finish activating your sign-in.")
			setMessageType(result.verificationSent ? "success" : "notice")
			form.reset()
		} catch {
			setTurnstileToken("")
			setTurnstileAttempt((attempt) => attempt + 1)
			setMessage("Account creation is temporarily unavailable. Please try again.")
			setMessageType("error")
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<form className="auth-form auth-form--salon-parity" onSubmit={handleSubmit}>
			<button
				className="auth-provider-btn auth-provider-btn--google"
				type="button"
				onClick={handleGoogleSignUp}
				disabled={isSubmitting}
			>
				<GoogleIcon />
				Continue with Google
			</button>
			<div className="auth-separator" aria-hidden="true">
				<span>or</span>
			</div>
			<div className="form-group">
				<label htmlFor="platformSignupName">Your name</label>
				<input
					id="platformSignupName"
					name="name"
					type="text"
					autoComplete="name"
					required
				/>
			</div>
			<div className="form-group">
				<label htmlFor="platformSignupEmail">Email address</label>
				<input
					id="platformSignupEmail"
					name="email"
					type="email"
					autoComplete="email"
					required
				/>
			</div>
			<div className="form-group">
				<label htmlFor="platformSignupPassword">Create a password</label>
				<input
					id="platformSignupPassword"
					name="password"
					type="password"
					autoComplete="new-password"
					minLength={12}
					required
				/>
			</div>
			<input
				name="turnstileToken"
				type="hidden"
				value={turnstileToken}
				readOnly
			/>
			<input name="callbackUrl" type="hidden" value={getSafeAuthCallbackUrl(callbackUrl)} readOnly />
			<TurnstileWidget key={turnstileAttempt} onToken={setTurnstileToken} />
			<button
				className="button button--primary auth-submit-btn"
				type="submit"
				disabled={isSubmitting}
			>
				{isSubmitting ? "Creating account…" : "Create account"}
			</button>
			{message && (
				<p
					className={`form-message${messageType === "success" ? " form-message--success" : messageType === "error" ? " form-message--error" : ""}`}
					role={messageType === "error" ? "alert" : "status"}
					aria-live={messageType === "error" ? "assertive" : "polite"}
				>
					{message}
				</p>
			)}
			<div className="auth-links">
				<p className="auth-form__switch">
					Already have a Beauty Sphia account?{" "}
					<Link href={`/login?callbackUrl=${encodeURIComponent(getSafeAuthCallbackUrl(callbackUrl))}`} replace>Sign in</Link>
				</p>
			</div>
		</form>
	)
}
