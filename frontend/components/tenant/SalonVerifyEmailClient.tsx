"use client"

import Link from "next/link"
import { useCallback, useState } from "react"

type VerificationState = "idle" | "verifying" | "success" | "error"

interface SalonVerifyEmailClientProps {
	readonly businessName: string
	readonly logoSrc: string
	readonly homeHref: string
	readonly initialToken: string
}

export function SalonVerifyEmailClient({
	businessName,
	logoSrc,
	homeHref,
	initialToken,
}: SalonVerifyEmailClientProps) {
	const [state, setState] = useState<VerificationState>("idle")
	const [message, setMessage] = useState(
		initialToken
			? "Confirm that you want to verify this email address."
			: "Open the verification link from your email to continue.",
	)

	const verify = useCallback(async (token: string) => {
		setState("verifying")
		setMessage("Confirming your secure verification request…")
		try {
			const response = await fetch("/api/auth/verify-email", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ token }),
			})
			const result = (await response.json().catch(() => null)) as {
				error?: string
			} | null
			if (!response.ok) {
				setState("error")
				setMessage(result?.error ?? "This verification link has expired or was already used.")
				return
			}
			setState("success")
			setMessage("Your email has been verified. You can now sign in and manage your salon activity.")
		} catch {
			setState("error")
			setMessage("Email verification is temporarily unavailable. Please try again shortly.")
		}
	}, [])

	return (
		<main className="salon-verify-page" aria-labelledby="salonVerifyTitle">
			<section className="salon-verify-card" aria-live="polite">
				<Link className="salon-verify-brand" href={homeHref} aria-label={`Return to ${businessName} home page`}>
					<img src={logoSrc} alt={`${businessName} logo`} width={58} height={58} />
					<span><strong>{businessName}</strong><small>Luxury salon experience</small></span>
				</Link>
				<div className="salon-verify-icon" aria-hidden="true">✉</div>
				<p className="salon-verify-eyebrow">Account security</p>
				<h1 id="salonVerifyTitle">Verify your <span>email</span></h1>
				<p className={`salon-verify-message salon-verify-message--${state}`} role={state === "error" ? "alert" : "status"}>{message}</p>
				<div className="salon-verify-actions">
					{state !== "success" ? (
						<button
							className="btn btn-primary"
							type="button"
							disabled={!initialToken || state === "verifying"}
							onClick={() => void verify(initialToken)}
						>
							{state === "verifying" ? "Verifying…" : "Verify email"}
						</button>
					) : <Link className="btn btn-primary" href="/login">Continue to sign in</Link>}
					<Link className="btn btn-outline" href={homeHref}>Return to website <span aria-hidden="true">→</span></Link>
				</div>
				<p className="salon-verify-note">For your protection, verification only happens after you confirm the secure link sent to your email.</p>
			</section>
		</main>
	)
}
