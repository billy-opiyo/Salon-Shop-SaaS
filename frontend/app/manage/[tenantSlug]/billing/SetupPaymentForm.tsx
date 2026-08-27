"use client"

import { FormEvent, useState } from "react"

export function SetupPaymentForm({
	tenantSlug,
	mode = "setup",
}: {
	readonly tenantSlug: string
	readonly mode?: "setup" | "renewal"
}) {
	const [phoneNumber, setPhoneNumber] = useState("")
	const [message, setMessage] = useState("")
	const [isSubmitting, setIsSubmitting] = useState(false)

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setMessage("")
		setIsSubmitting(true)
		try {
			const response = await fetch(`/api/billing/${tenantSlug}/${mode}`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ phoneNumber }),
			})
			const data = (await response.json()) as {
				error?: string
				status?: string
			}
			setMessage(
				response.ok
					? "STK Push sent. Check the M-Pesa phone for approval."
					: (data.error ?? "Payment could not be started."),
			)
		} catch {
			setMessage("Payment could not be started. Please try again.")
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<form className="auth-form" onSubmit={handleSubmit}>
			<label>
				M-Pesa billing phone number
				<input
					name="phoneNumber"
					type="tel"
					value={phoneNumber}
					onChange={(event) => setPhoneNumber(event.target.value)}
					placeholder="0712 345 678"
					required
				/>
			</label>
			<button
				className="button button--primary"
				type="submit"
				disabled={isSubmitting}
			>
				{isSubmitting
					? "Sending STK Push..."
					: mode === "setup"
						? "Pay setup fee"
						: "Pay monthly invoice"}
			</button>
			{message && (
				<p className="form-message" role="status">
					{message}
				</p>
			)}
		</form>
	)
}
