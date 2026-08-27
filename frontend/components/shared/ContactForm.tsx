"use client"

import { FormEvent, useState } from "react"

import { TurnstileWidget } from "@/components/shared/TurnstileWidget"

interface ContactFormProps {
	/** Slug of the salon receiving the message (defaults to Royal Braids). */
	readonly tenantSlug?: string
}

type FormStatus = "idle" | "sending" | "success" | "error"

export function ContactForm({ tenantSlug = "royal-braids" }: ContactFormProps) {
	const [status, setStatus] = useState<FormStatus>("idle")
	const [message, setMessage] = useState("")
	const [token, setToken] = useState("")

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (!token) {
			setStatus("error")
			setMessage("Please complete the security check before sending.")
			return
		}
		const form = event.currentTarget
		const payload = {
			tenantSlug,
			name: String(new FormData(form).get("name") ?? ""),
			email: String(new FormData(form).get("email") ?? ""),
			subject: String(new FormData(form).get("subject") ?? ""),
			message: String(new FormData(form).get("message") ?? ""),
			turnstileToken: token,
		}

		setStatus("sending")
		setMessage("")
		try {
			const response = await fetch("/api/contact", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(payload),
			})
			const result: unknown = await response.json().catch(() => ({}))
			const error =
				typeof result === "object" &&
				result !== null &&
				"error" in result &&
				typeof result.error === "string"
					? result.error
					: null
			if (response.ok) {
				setStatus("success")
				setMessage("Thanks, your message has been sent. We'll be in touch soon.")
				form.reset()
				setToken("")
			} else {
				setStatus("error")
				setMessage(error ?? "The message could not be sent.")
			}
		} catch {
			setStatus("error")
			setMessage("The message could not be sent. Please try again.")
		}
	}

	return (
		<form className="platform-contact__form" onSubmit={handleSubmit} noValidate>
			<div className="platform-contact__row">
				<label>
					<span>Your name</span>
					<input name="name" required minLength={2} maxLength={160} placeholder="Jane Doe" />
				</label>
				<label>
					<span>Email address</span>
					<input
						name="email"
						type="email"
						required
						maxLength={320}
						placeholder="you@example.com"
					/>
				</label>
			</div>
			<label>
				<span>Subject</span>
				<input
					name="subject"
					required
					minLength={2}
					maxLength={160}
					placeholder="How can we help?"
				/>
			</label>
			<label>
				<span>Message</span>
				<textarea
					name="message"
					required
					minLength={2}
					maxLength={5000}
					rows={5}
					placeholder="Tell us about your salon or your question…"
				/>
			</label>
			<TurnstileWidget onToken={setToken} />
			{status === "success" && (
				<p className="form-message--success" role="status">
					{message}
				</p>
			)}
			{status === "error" && (
				<p className="form-message--error" role="alert">
					{message}
				</p>
			)}
			<button
				className="button button--primary"
				type="submit"
				disabled={status === "sending"}
			>
				{status === "sending" ? "Sending…" : "Send message"}
			</button>
			<p className="turnstile-note">
				Submissions are protected by a security check and rate limiting.
			</p>
		</form>
	)
}
