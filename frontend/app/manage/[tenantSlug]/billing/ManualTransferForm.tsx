"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

export function ManualTransferForm({
	tenantSlug,
	invoiceId,
	invoiceNumber,
	amountMinor,
	currency,
	registeredPhoneNumber,
	priorStatus,
	priorResultMessage,
}: {
	readonly tenantSlug: string
	readonly invoiceId: string
	readonly invoiceNumber: string
	readonly amountMinor: number
	readonly currency: string
	readonly registeredPhoneNumber: string
	readonly priorStatus?: string
	readonly priorResultMessage?: string | null
}) {
	const router = useRouter()
	const [senderPhoneNumber, setSenderPhoneNumber] = useState("")
	const [receiptNumber, setReceiptNumber] = useState("")
	const [message, setMessage] = useState("")
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [isSuccess, setIsSuccess] = useState(false)
	const waitingForReview = priorStatus === "manual_review"
	const amount = new Intl.NumberFormat("en-KE", {
		style: "currency",
		currency,
		currencyDisplay: "code",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amountMinor / 100)

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setIsSubmitting(true)
		setMessage("")
		setIsSuccess(false)
		try {
			const response = await fetch(`/api/billing/${encodeURIComponent(tenantSlug)}/manual-transfer`, {
				method: "POST",
				credentials: "same-origin",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ invoiceId, senderPhoneNumber, receiptNumber }),
			})
			const result = await response.json() as { error?: string; alreadySubmitted?: boolean }
			if (!response.ok) throw new Error(result.error ?? "The transfer could not be submitted.")
			setIsSuccess(true)
			setMessage(result.alreadySubmitted
				? "This receipt is already waiting for platform-owner review."
				: "Receipt submitted. Your invoice remains pending until the Beauty Sphia platform owner verifies and approves the transfer.")
			setReceiptNumber("")
			router.refresh()
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "The transfer could not be submitted.")
		} finally {
			setIsSubmitting(false)
		}
	}

	if (waitingForReview) return <p className="merchant-billing-owner-note" role="status">A receipt has been submitted and is awaiting Beauty Sphia platform-owner review. Your invoice will remain pending until it is approved.</p>

	return (
		<form className="auth-form merchant-manual-transfer-form" onSubmit={submit}>
			{priorStatus === "failed" && priorResultMessage && <p className="form-message form-message--error" role="alert">{priorResultMessage}</p>}
			<div className="merchant-billing-transfer-details">
				<p><strong>Exact invoice amount:</strong> <span>{amount}</span></p>
				<p><strong>Send the exact invoice amount to:</strong> <span>{registeredPhoneNumber}</span></p>
				<p><strong>Payment reference:</strong> <span>{invoiceNumber}</span></p>
			</div>
			<label>
				Phone number used for the transfer
				<input type="tel" inputMode="tel" autoComplete="tel" value={senderPhoneNumber} onChange={(event) => setSenderPhoneNumber(event.target.value)} placeholder="0712 345 678" required />
			</label>
			<label>
				M-Pesa receipt reference
				<input value={receiptNumber} onChange={(event) => setReceiptNumber(event.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off" minLength={6} maxLength={16} pattern="[A-Za-z0-9]{6,16}" placeholder="e.g. QWE1234567" required />
				<small>Enter the receipt code from the M-Pesa confirmation message.</small>
			</label>
			<p className="merchant-billing-owner-note">Submitting a receipt does not mark the invoice paid. Beauty Sphia’s platform owner will verify the transfer before approving it.</p>
			<button className="button button--primary" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
				{isSubmitting ? "Submitting receipt…" : "Submit transfer for review"}
			</button>
			{message && <p className={`form-message form-message--${isSuccess ? "success" : "error"}`} role={isSuccess ? "status" : "alert"} aria-live={isSuccess ? "polite" : "assertive"}>{message}</p>}
		</form>
	)
}
