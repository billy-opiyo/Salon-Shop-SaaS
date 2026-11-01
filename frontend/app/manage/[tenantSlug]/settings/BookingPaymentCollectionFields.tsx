"use client"

import { useState } from "react"

type CollectionMethod = "platform-stk" | "paybill" | "till" | "registered-phone"

export function BookingPaymentCollectionFields({
	initialMethod,
	initialNumber,
}: {
	readonly initialMethod: CollectionMethod
	readonly initialNumber: string
}) {
	const [method, setMethod] = useState<CollectionMethod>(initialMethod)
	const [number, setNumber] = useState(initialNumber)
	const usesManualCollection = method !== "platform-stk"
	const numberLabel = method === "paybill"
		? "Salon Paybill number"
		: method === "till"
			? "Salon Buy Goods Till number"
			: "Registered M-Pesa phone number"
	return (
		<div className="booking-payment-collection-fields">
			<label htmlFor="bookingCollectionMethod">Booking payment collection method</label>
			<select
				id="bookingCollectionMethod"
				name="bookingCollectionMethod"
				value={method}
				required
				onChange={(event) => setMethod(event.target.value as CollectionMethod)}
			>
				<option value="platform-stk">Beauty Sphia managed M-Pesa STK</option>
				<option value="paybill">Salon Paybill · manual M-Pesa transfer</option>
				<option value="till">Salon Buy Goods Till · manual M-Pesa transfer</option>
				<option value="registered-phone">Salon registered phone · manual M-Pesa transfer</option>
			</select>
			{usesManualCollection ? (
				<>
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
						required
					/>
					<p className="form-help">
						Clients will see this destination with their booking payment amount and submit the M-Pesa receipt. The payment remains unconfirmed until the salon owner reviews it.
					</p>
				</>
			) : (
				<p className="form-help">
					This keeps the existing Beauty Sphia managed STK flow. Its destination is controlled by the platform Daraja configuration.
				</p>
			)}
		</div>
	)
}
