import { redirect } from "next/navigation"
import Link from "next/link"

import { auth } from "@/auth"
import { getLoginUrlForPath } from "@shared/authCallback"
import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"
import { platformThemeStyle } from "@/lib/platformTheme"
import {
	getBillingSnapshotForUser,
	MerchantBillingError,
} from "@backend/services/merchantBillingService"

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

function formatSubscriptionStatus(status: string | null | undefined): string {
	if (!status) return "Not configured"
	const labels: Record<string, string> = {
		setup_payment_required: "Setup payment required",
		setup_paid_pending_activation: "Ready to publish",
		trialing: "Free usage period",
		active: "Active",
		payment_due: "Payment due",
		suspended: "Suspended",
		cancelled: "Cancelled",
	}
	return (
		labels[status] ??
		status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
	)
}

export default async function MerchantBillingPage({
	params,
}: BillingPageProps) {
	const { tenantSlug } = await params
	const session = await auth()
	if (!session?.user?.id) redirect(getLoginUrlForPath(`/manage/${tenantSlug}/billing`))
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
	const design = await getPlatformStorefrontDesign()
	const pricing = planTier ? design.plans[planTier] : null
	const freeUsageLabel = `${design.billing.freeUsageMonths} ${design.billing.freeUsageMonths === 1 ? "month" : "months"}`
	const subscriptionStatus = billing.subscription?.status
	const trialEndsAt = subscriptionStatus === "cancelled"
		? null
		: billing.subscription?.trialEndsAt ?? null
	const activationPending = subscriptionStatus === "setup_payment_required" || subscriptionStatus === "setup_paid_pending_activation"
	const freeUsageValue = trialEndsAt
		? formatDate(trialEndsAt)
		: activationPending
			? "Starts after publication"
			: subscriptionStatus === "cancelled"
				? "Period ended"
				: "Not scheduled"
	const freeUsageDescription = trialEndsAt
		? `${freeUsageLabel} of free usage ends on this date; monthly billing begins afterward.`
		: subscriptionStatus === "setup_payment_required"
			? `Your ${freeUsageLabel} free usage begins after the setup payment is confirmed and your salon is published.`
			: subscriptionStatus === "setup_paid_pending_activation"
				? `Your ${freeUsageLabel} free usage begins when you publish your salon.`
				: subscriptionStatus === "cancelled"
					? "This subscription has been cancelled."
					: "No free usage period is currently scheduled."

	return (
		<div className="platform-site merchant-billing-page" style={platformThemeStyle(design.theme)}>
		<main className="manage-page">
			<header className="manage-header">
				<div>
					<p className="eyebrow">Beauty Sphia billing</p>
					<h1>{billing.businessName}</h1>
					<p className="auth-card__intro">
						Manage your subscription, setup payment, and billing records.
					</p>
				</div>
				<nav className="manage-header__actions" aria-label="Billing page navigation">
					<Link className="button button--ghost" href="/account">My account</Link>
				</nav>
			</header>

			<section className="manage-grid" aria-label="Billing summary">
				<article className="manage-card">
					<p className="eyebrow">Current plan</p>
					<h2>{pricing?.name ?? billing.subscription?.plan.displayName ?? "Starter"}</h2>
					<p>
						{pricing
							? `${formatAmount(pricing.monthlyAmountMinor, billing.currency)} / month`
							: "Plan pricing unavailable"}
					</p>
					<p>Status: <strong className="merchant-billing-status">{formatSubscriptionStatus(subscriptionStatus)}</strong></p>
				</article>
				<article className="manage-card">
					<p className="eyebrow">Free usage and renewal</p>
					<h2>{freeUsageValue}</h2>
					<p>{freeUsageDescription}</p>
					{billing.subscription?.cancelAtPeriodEnd && (
						<p>Cancellation is scheduled for the end of the paid period.</p>
					)}
				</article>
			</section>

			{billing.subscription?.status === "setup_payment_required" && pricing && (
				<section className="manage-card" aria-labelledby="setup-payment-title">
					<p className="eyebrow">Salon setup</p>
					<h2 id="setup-payment-title">
						Pay {formatAmount(pricing.setupFeeMinor, billing.currency)} setup
						fee
					</h2>
					<p>
						Setup begins after payment. Your M-Pesa provider may charge the
						sender a separate transaction fee. Your first {freeUsageLabel} of salon
						usage are free after the one-time setup fee; recurring billing starts
						after that period.
					</p>
					<p>{design.billing.paymentInstructions}</p>
					{design.billing.businessShortCode && (
						<p>{design.billing.paymentMode === "till-stk" ? "M-Pesa Till" : "M-Pesa Paybill"}: {design.billing.businessShortCode}</p>
					)}
					<SetupPaymentForm tenantSlug={tenantSlug} />
					<div className="merchant-billing-next-step">
						<h3>Next: publish your salon</h3>
						<p>After the setup payment is confirmed, return to your account and choose “Publish salon” to make your storefront live.</p>
						<Link className="button button--outline button--small" href="/account">Go to my account</Link>
					</div>
				</section>
			)}
			{billing.subscription?.status === "setup_payment_required" && !pricing && (
				<section className="manage-card merchant-billing-setup-unavailable" aria-labelledby="setup-unavailable-title">
					<p className="eyebrow">Salon setup</p>
					<h2 id="setup-unavailable-title">Setup payment is temporarily unavailable</h2>
					<p>Your salon details are saved, but the selected plan’s current pricing is unavailable. Contact Beauty Sphia support for help continuing setup.</p>
					<div className="manage-header__actions">
						<Link className="button button--outline" href="/account">Return to my account</Link>
						<a className="button button--ghost" href={`mailto:${design.contact.supportEmail}?subject=${encodeURIComponent(`Help with ${billing.businessName} setup`)}`}>Contact support</a>
					</div>
				</section>
			)}
			{billing.subscription?.status === "setup_paid_pending_activation" && (
				<section className="manage-card merchant-billing-activation" aria-labelledby="setup-complete-title">
					<p className="eyebrow">Setup payment confirmed</p>
					<h2 id="setup-complete-title">Your salon is ready to publish</h2>
					<p>The setup fee has been received. Publish your storefront from your account to make it visible to customers.</p>
					<Link className="button button--primary" href="/account">Continue to publish</Link>
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
						salon.
					</p>
					<p>{design.billing.paymentInstructions}</p>
					{design.billing.businessShortCode && (
						<p>{design.billing.paymentMode === "till-stk" ? "M-Pesa Till" : "M-Pesa Paybill"}: {design.billing.businessShortCode}</p>
					)}
					<SetupPaymentForm tenantSlug={tenantSlug} mode="renewal" />
				</section>
			)}

			<section className="manage-card" aria-labelledby="invoices-title">
				<p className="eyebrow">Billing records</p>
				<h2 id="invoices-title">Invoices and payment attempts</h2>
				<p>{design.billing.receiptInstructions}</p>
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
			<section className="manage-card" aria-labelledby="notifications-title">
				<p className="eyebrow">Dashboard notifications</p>
				<h2 id="notifications-title">Billing updates</h2>
				{billing.notifications.length === 0 ? (
					<p>No billing notifications yet.</p>
				) : (
					<ul>
						{billing.notifications.map((notification) => (
							<li key={notification.id}>
								{notification.templateKey.replace("billing.", "")} ·{" "}
								{formatDate(notification.createdAt)}
							</li>
						))}
					</ul>
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
		</div>
	)
}
