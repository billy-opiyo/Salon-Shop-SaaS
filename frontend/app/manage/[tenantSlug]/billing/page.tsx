import { redirect } from "next/navigation"

import { auth } from "@/auth"
import {
	getBillingSnapshotForUser,
	MerchantBillingError,
} from "@backend/services/merchantBillingService"
import { PLAN_PRICING } from "@shared/constants/plans"

import { SetupPaymentForm } from "./SetupPaymentForm"
import { cancelSubscription, changePlan } from "./actions"

interface BillingPageProps {
	readonly params: Promise<{ tenantSlug: string }>
}

function formatDate(value: Date | null): string {
	return value ? value.toLocaleDateString("en-KE") : "Not set"
}

function formatAmount(amountMinor: number, currency: string): string {
	return new Intl.NumberFormat("en-KE", { style: "currency", currency }).format(
		amountMinor / 100,
	)
}

export default async function MerchantBillingPage({
	params,
}: BillingPageProps) {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const { tenantSlug } = await params
	let billing
	try {
		billing = await getBillingSnapshotForUser(session.user.id, tenantSlug)
	} catch (error) {
		if (error instanceof MerchantBillingError) redirect(`/manage/${tenantSlug}`)
		throw error
	}
	const planTier = billing.subscription?.plan.tier.toLowerCase() as
		| "starter"
		| "business"
		| "enterprise"
		| undefined
	const pricing = planTier ? PLAN_PRICING[planTier] : null

	return (
		<main className="manage-page">
			<header className="manage-header">
				<div>
					<p className="eyebrow">Beauty Sphia billing</p>
					<h1>{billing.businessName}</h1>
					<p className="auth-card__intro">
						Manage your subscription, setup payment, and billing records.
					</p>
				</div>
			</header>

			<section className="manage-grid" aria-label="Billing summary">
				<article className="manage-card">
					<p className="eyebrow">Current plan</p>
					<h2>{billing.subscription?.plan.displayName ?? "Starter"}</h2>
					<p>
						{pricing
							? `${formatAmount(pricing.monthlyAmountMinor, billing.currency)} / month`
							: "Plan pricing unavailable"}
					</p>
					<p>Status: {billing.subscription?.status ?? "Not configured"}</p>
				</article>
				<article className="manage-card">
					<p className="eyebrow">Trial and renewal</p>
					<h2>{formatDate(billing.subscription?.trialEndsAt ?? null)}</h2>
					<p>Trial end or next billing date</p>
					{billing.subscription?.cancelAtPeriodEnd && (
						<p>Cancellation is scheduled for the end of the paid period.</p>
					)}
				</article>
			</section>

			{billing.subscription?.status === "setup_payment_required" && pricing && (
				<section className="manage-card" aria-labelledby="setup-payment-title">
					<p className="eyebrow">Store setup</p>
					<h2 id="setup-payment-title">
						Pay {formatAmount(pricing.setupFeeMinor, billing.currency)} setup
						fee
					</h2>
					<p>
						Setup begins after payment. Your M-Pesa provider may charge the
						sender a separate transaction fee.
					</p>
					<SetupPaymentForm tenantSlug={tenantSlug} />
				</section>
			)}
			{(billing.subscription?.status === "payment_due" ||
				billing.subscription?.status === "suspended") && (
				<section
					className="manage-card"
					aria-labelledby="renewal-payment-title"
				>
					<p className="eyebrow">Monthly subscription</p>
					<h2 id="renewal-payment-title">Your monthly payment is due</h2>
					<p>
						Approve the M-Pesa STK Push to keep or restore your Beauty Sphia
						store.
					</p>
					<SetupPaymentForm tenantSlug={tenantSlug} mode="renewal" />
				</section>
			)}

			<section className="manage-card" aria-labelledby="invoices-title">
				<p className="eyebrow">Billing records</p>
				<h2 id="invoices-title">Invoices and payment attempts</h2>
				{billing.invoices.length === 0 ? (
					<p>No invoices yet.</p>
				) : (
					<div className="admin-bookings-list">
						{billing.invoices.map((invoice) => (
							<article className="admin-booking-item" key={invoice.id}>
								<div className="admin-booking-item__details">
									<p className="eyebrow">
										{invoice.kind} · {invoice.status}
									</p>
									<h3>{invoice.invoiceNumber}</h3>
									<p>
										{invoice.description} ·{" "}
										{formatAmount(invoice.amountMinor, invoice.currency)}
									</p>
									<p>
										Created {formatDate(invoice.createdAt)} · Paid{" "}
										{formatDate(invoice.paidAt)}
									</p>
									{invoice.receiptNumber && (
										<p>M-Pesa receipt: {invoice.receiptNumber}</p>
									)}
									<a
										href={`/api/billing/${tenantSlug}/invoices/${invoice.id}`}
										download
									>
										Download invoice
									</a>
								</div>
								<p>
									{invoice.paymentAttempts[0]
										? `Latest attempt: ${invoice.paymentAttempts[0].status}`
										: "No payment attempt"}
								</p>
							</article>
						))}
					</div>
				)}
			</section>

			<section className="manage-card" aria-labelledby="billing-actions-title">
				<p className="eyebrow">Subscription controls</p>
				<h2 id="billing-actions-title">Manage subscription</h2>
				<form className="auth-form" action={changePlan}>
					<input type="hidden" name="tenantSlug" value={tenantSlug} />
					<label>
						Change plan
						<select name="tier" defaultValue={planTier ?? "starter"}>
							<option value="starter">Starter</option>
							<option value="business">Business</option>
							<option value="enterprise">Enterprise</option>
						</select>
					</label>
					<button className="button button--outline" type="submit">
						Save plan
					</button>
				</form>
				<form className="auth-form" action={cancelSubscription}>
					<input type="hidden" name="tenantSlug" value={tenantSlug} />
					<label>
						<input
							name="confirmation"
							value="confirmed"
							type="checkbox"
							required
						/>
						I understand the cancellation effective date shown above.
					</label>
					<button className="button button--outline" type="submit">
						Confirm cancellation
					</button>
				</form>
			</section>
		</main>
	)
}
