"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState, useTransition } from "react"

import { createStore } from "./actions"
import type { PlatformPlanDisplay } from "@shared/constants/platformStorefront"
import type { PlanTier } from "@shared/types/tenant"

export function StoreSetupForm({
	freeUsageMonths,
	currency,
	plans,
}: {
	readonly freeUsageMonths: number
	readonly currency: string
	readonly plans: Readonly<Record<PlanTier, PlatformPlanDisplay>>
}) {
	const router = useRouter()
	const [message, setMessage] = useState("")
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [isOpeningBilling, startBillingNavigation] = useTransition()
	const formatAmount = (amountMinor: number) => new Intl.NumberFormat("en-KE", {
		style: "currency",
		currency,
		currencyDisplay: "code",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amountMinor / 100)

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setMessage("")
		setIsSubmitting(true)
		try {
			const result = await createStore(new FormData(event.currentTarget))
			if (!result.ok) {
				setMessage(result.message)
				return
			}
			const billingPath =
				`/manage/${encodeURIComponent(result.slug)}/billing?setup=required`
			startBillingNavigation(() => router.push(billingPath))
		} catch {
			setMessage("We could not finish creating your salon. Please check your details and try again.")
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<form className="auth-form onboarding-form" onSubmit={handleSubmit}>
			<label>
				Salon or business name <span className="onboarding-required" aria-hidden="true">*</span>
				<input name="businessName" type="text" required maxLength={120} />
			</label>
			<label>
				Homepage headline
				<input
					name="heroTitle"
					type="text"
					maxLength={140}
					placeholder="Feel confident in your signature look"
				/>
			</label>
			<label>
				Homepage supporting line
				<input
					name="heroSubtitle"
					type="text"
					maxLength={160}
					placeholder="Hair, beauty, and self-care made personal"
				/>
			</label>
			<label>
				Salon web address <span className="onboarding-required" aria-hidden="true">*</span>
				<input
					name="slug"
					type="text"
					required
					minLength={3}
					maxLength={48}
					pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
					placeholder="your-salon"
				/>
				<span className="form-help">Choose the short name for your public salon link. You can add the full physical address in the salon settings.</span>
			</label>
			<label>
				Starting plan
				<select name="planTier" defaultValue="starter">
					{(["starter", "business", "enterprise"] as const).map((tier) => (
						<option value={tier} key={tier}>
							{plans[tier].name} · {formatAmount(plans[tier].monthlyAmountMinor)}/month · {formatAmount(plans[tier].setupFeeMinor)} setup
						</option>
					))}
				</select>
			</label>
			<p className="form-help">
				A one-time setup fee activates your salon. The selected plan then
				includes {freeUsageMonths} {freeUsageMonths === 1 ? "month" : "months"} of free usage before monthly billing begins.
			</p>
			<div className="onboarding-form__row">
				<label>
					City
					<input name="city" type="text" maxLength={80} placeholder="Nairobi" />
				</label>
				<label>
					Country <span className="onboarding-required" aria-hidden="true">*</span>
					<input
						name="country"
						type="text"
						defaultValue="Kenya"
						required
						maxLength={80}
					/>
				</label>
			</div>
			<input name="timezone" type="hidden" value="Africa/Nairobi" readOnly />
			<input name="locale" type="hidden" value="en-KE" readOnly />
			<input name="currency" type="hidden" value={currency} readOnly />
			<fieldset className="legal-consent">
				<legend>Platform agreement</legend>
				<p className="legal-consent__help">All three acknowledgments are required to create your salon.</p>
				<label>
					<input name="termsAccepted" type="checkbox" required />
					<span>
						I agree to the <span className="onboarding-required" aria-hidden="true">*</span>{" "}
						<Link href="/terms" target="_blank">
							Terms of Service
						</Link>
						.
					</span>
				</label>
				<label>
					<input name="privacyAccepted" type="checkbox" required />
					<span>
						I acknowledge the <span className="onboarding-required" aria-hidden="true">*</span>{" "}
						<Link href="/privacy" target="_blank">
							Privacy Policy
						</Link>
						.
					</span>
				</label>
				<label>
					<input name="cookiesAccepted" type="checkbox" required />
					<span>
						I acknowledge the <span className="onboarding-required" aria-hidden="true">*</span>{" "}
						<Link href="/cookies" target="_blank">
							Cookie Policy
						</Link>
						.
					</span>
				</label>
			</fieldset>
			<button
				className="button button--primary"
				type="submit"
				disabled={isSubmitting || isOpeningBilling}
				aria-busy={isSubmitting || isOpeningBilling}
			>
				{isSubmitting
					? "Creating salon…"
					: isOpeningBilling
						? "Opening billing…"
						: "Create my salon"}
			</button>
			{message && (
				<p className="form-message" role="alert">
					{message}
				</p>
			)}
			<p className="auth-form__switch">
				<Link href="/account">Return to your account</Link>
			</p>
		</form>
	)
}
