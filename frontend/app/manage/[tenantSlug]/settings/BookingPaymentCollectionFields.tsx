"use client"

import { useState } from "react"

type CollectionMethod = "paybill" | "till" | "registered-phone"

export function BookingPaymentCollectionFields({
	initialMethod,
	initialNumber,
}: {
	readonly initialMethod: CollectionMethod
	readonly initialNumber: string
}) {
	const [method, setMethod] = useState<CollectionMethod>(initialMethod)
	const [number, setNumber] = useState(initialNumber)
	const numberLabel = method === "paybill"
		? "Salon Paybill number"
		: method === "till"
			? "Salon Buy Goods Till number"
			: "Registered M-Pesa phone number"
	return (
		<div className="booking-payment-collection-fields">
			<div className="booking-payment-collection-field">
				<label htmlFor="bookingCollectionMethod">Booking payment collection method</label>
				<select
					id="bookingCollectionMethod"
					name="bookingCollectionMethod"
					value={method}
					required
					onChange={(event) => setMethod(event.target.value as CollectionMethod)}
				>
					<option value="paybill">Salon Paybill · manual M-Pesa transfer</option>
					<option value="till">Salon Buy Goods Till · manual M-Pesa transfer</option>
					<option value="registered-phone">Salon registered phone · manual M-Pesa transfer</option>
				</select>
			</div>
			<div className="booking-payment-collection-field">
				<label htmlFor="bookingCollectionNumber">{numberLabel}</label>
				<input
					id="bookingCollectionNumber"
					name="bookingCollectionNumber"
					type="tel"
					inputMode="tel"
					autoComplete="tel"
					value={number}
					onChange={(event) => setNumber(event.target.value)}
					placeholder={method === "registered-phone" ? "0712 345 678" : "e.g. 123456"}
				/>
			</div>
			<p className="form-help">
				Booking payments go directly to this salon-owned destination. Clients submit the M-Pesa receipt, and the salon owner reviews it before confirming payment.
			</p>
		</div>
	)
}
