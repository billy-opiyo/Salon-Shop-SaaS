"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"

const APP_IDS = new Set(["com.beautysphia.app.staging", "com.beautysphia.app"])

function MobileGoogleStart() {
	const params = useSearchParams()
	const state = params.get("state") || ""
	const challenge = params.get("challenge") || ""
	const applicationId = params.get("applicationId") || ""
	const started = useRef(false)
	const [message, setMessage] = useState("Opening secure Google sign-in…")

	useEffect(() => {
		if (started.current) return
		started.current = true
		if (!/^[0-9a-f-]{36}$/i.test(state) || !/^[A-Za-z0-9_-]{43}$/.test(challenge) || !APP_IDS.has(applicationId)) {
			window.location.replace("/login?error=MobileAuthState")
			return
		}
		const callbackUrl = new URL("/api/auth/mobile-google/complete", window.location.origin)
		callbackUrl.searchParams.set("state", state)
		callbackUrl.searchParams.set("challenge", challenge)
		callbackUrl.searchParams.set("applicationId", applicationId)
		void signIn("google", { callbackUrl: callbackUrl.toString() }).catch(() => {
			setMessage("Google sign-in could not be opened. Return to the Beauty Sphia app and try again.")
		})
	}, [applicationId, challenge, state])

	return (
		<main className="auth-page">
			<section className="auth-card">
				<p className="auth-eyebrow">Beauty Sphia</p>
				<h1>Continue with Google</h1>
				<p aria-live="polite">{message}</p>
			</section>
		</main>
	)
}

export default function MobileGoogleStartPage() {
	return <Suspense fallback={<main className="auth-page"><p>Opening secure sign-in…</p></main>}><MobileGoogleStart /></Suspense>
}
