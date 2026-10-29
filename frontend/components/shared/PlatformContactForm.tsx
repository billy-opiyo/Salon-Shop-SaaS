"use client"

import { useState, type FormEvent } from "react"

import { TurnstileWidget } from "@/components/shared/TurnstileWidget"

type FormStatus = "idle" | "sending" | "success" | "error"

export function PlatformContactForm() {
	const [status, setStatus] = useState<FormStatus>("idle")
	const [message, setMessage] = useState("")
	const [token, setToken] = useState("")
	const [turnstileAttempt, setTurnstileAttempt] = useState(0)

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (!token) {
			setStatus("error")
			setMessage("Please complete the security check before sending.")
			return
		}
		const form = event.currentTarget
		const values = new FormData(form)
		setStatus("sending")
		setMessage("")
		try {
			const response = await fetch("/api/platform-contact", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name: String(values.get("name") ?? ""),
					email: String(values.get("email") ?? ""),
					subject: String(values.get("subject") ?? ""),
					message: String(values.get("message") ?? ""),
					turnstileToken: token,
				}),
			})
			const result = await response.json() as { error?: string }
			if (!response.ok) throw new Error(result.error ?? "The message could not be sent.")
			setStatus("success")
			setMessage("Thanks, your message has been sent to the Beauty Sphia team.")
			form.reset()
			setToken("")
		} catch (error) {
			setStatus("error")
			setMessage(error instanceof Error ? error.message : "The message could not be sent.")
		} finally {
			setStatus((current) => current === "sending" ? "idle" : current)
			setToken("")
			setTurnstileAttempt((attempt) => attempt + 1)
		}
	}

	return (
		<form className="platform-contact__form" onSubmit={handleSubmit}>
			<div className="platform-contact__row">
				<label><span>Your name <span className="platform-contact__required" aria-hidden="true">*</span></span><input name="name" required minLength={2} maxLength={160} placeholder="Jane Doe" /></label>
				<label><span>Email address <span className="platform-contact__required" aria-hidden="true">*</span></span><input name="email" type="email" required maxLength={320} placeholder="you@example.com" /></label>
			</div>
			<label><span>Subject <span className="platform-contact__required" aria-hidden="true">*</span></span><input name="subject" required minLength={2} maxLength={160} placeholder="How can we help?" /></label>
			<label><span>Message <span className="platform-contact__required" aria-hidden="true">*</span></span><textarea name="message" required minLength={2} maxLength={5000} rows={5} placeholder="Tell us about your salon or your question…" /></label>
			<TurnstileWidget key={turnstileAttempt} onToken={setToken} />
			{message && <p className={status === "error" ? "form-message--error" : "form-message--success"} role={status === "error" ? "alert" : "status"}>{message}</p>}
			<button className="button button--primary" type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Send message"}</button>
			<p className="turnstile-note">Submissions are protected by a security check and rate limiting.</p>
		</form>
	)
}
