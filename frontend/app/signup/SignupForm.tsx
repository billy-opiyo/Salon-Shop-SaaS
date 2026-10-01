"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"

import { TurnstileWidget } from "@/components/shared/TurnstileWidget"

import { registerAccount } from "./actions"

export function SignupForm() {
	const [message, setMessage] = useState<string>("")
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [turnstileToken, setTurnstileToken] = useState("")

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setMessage("")
		setIsSubmitting(true)
		const result = await registerAccount(new FormData(event.currentTarget))
		setIsSubmitting(false)
		if (!result.ok) {
			setMessage(result.message)
			return
		}
		setMessage(
			"Account created. Email verification will be enabled when Resend is configured.",
		)
		event.currentTarget.reset()
	}

	return (
		<form className="auth-form auth-form--salon-parity" onSubmit={handleSubmit}>
			<div className="form-group">
				<label htmlFor="platformSignupName">Your name</label>
				<input id="platformSignupName" name="name" type="text" autoComplete="name" required />
			</div>
			<div className="form-group">
				<label htmlFor="platformSignupEmail">Email address</label>
				<input id="platformSignupEmail" name="email" type="email" autoComplete="email" required />
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
			<TurnstileWidget onToken={setTurnstileToken} />
			<button
				className="button button--primary auth-submit-btn"
				type="submit"
				disabled={isSubmitting}
			>
				{isSubmitting ? "Creating account…" : "Create account"}
			</button>
			{message && (
				<p className="form-message" role="status">
					{message}
				</p>
			)}
			<div className="auth-links">
				<p className="auth-form__switch">
					Already have a Beauty Sphia account? <Link href="/login">Sign in</Link>
				</p>
			</div>
		</form>
	)
}
