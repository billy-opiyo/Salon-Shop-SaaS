"use client"

import { FormEvent, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

export function SetupPaymentForm({
	tenantSlug,
	mode = "setup",
}: {
	readonly tenantSlug: string
	readonly mode?: "setup" | "renewal"
}) {
	const router = useRouter()
	const [phoneNumber, setPhoneNumber] = useState("")
	const [message, setMessage] = useState("")
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [requestAccepted, setRequestAccepted] = useState(false)

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setMessage("")
		setRequestAccepted(false)
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
					? "Payment request sent. Approve it on your M-Pesa phone, then refresh the status here."
					: (data.error ?? "Payment could not be started."),
			)
			setRequestAccepted(response.ok)
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
				<span className="mpesa-payment-button__content">
					<span>
						{isSubmitting
							? "Sending STK Push..."
							: mode === "setup"
								? "Pay setup fee"
								: "Pay monthly invoice"}
					</span>
					<Image src="/platform/Mpesa_logo_image.png" alt="M-Pesa" className="mpesa-payment-button__logo" width={78} height={26} />
				</span>
			</button>
			{message && (
				<p className="form-message" role="status">
					{message}
				</p>
			)}
			{requestAccepted && (
				<button className="button button--outline button--small" type="button" onClick={() => router.refresh()}>
					I approved the request — refresh payment status
				</button>
			)}
		</form>
	)
}
