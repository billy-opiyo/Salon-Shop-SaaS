import "server-only"

import { prisma } from "@backend/db/prisma"
import { normalizeKenyanMpesaPhone, requestInvoicePayment } from "@backend/services/darajaPaymentService"
import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"
import type { PlanTier } from "@shared/types/tenant"

export class MerchantBillingError extends Error {
	readonly code = "MERCHANT_BILLING_ERROR" as const
}

export async function getBillingSnapshotForUser(
	userId: string,
	tenantSlug: string,
) {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: {
			id: true,
			businessName: true,
			status: true,
			currency: true,
			memberships: {
				where: { userId, status: "ACTIVE" },
				select: { role: true, canManageContent: true },
			},
			subscription: {
				select: {
					billingPhoneNumber: true,
					status: true,
					trialStartsAt: true,
					trialEndsAt: true,
					currentPeriodEnd: true,
					cancelAtPeriodEnd: true,
					plan: { select: { displayName: true, tier: true } },
				},
			},
			invoices: {
				orderBy: { createdAt: "desc" },
				take: 12,
				select: {
					id: true,
					invoiceNumber: true,
					kind: true,
					status: true,
					amountMinor: true,
					currency: true,
					description: true,
					dueAt: true,
					paidAt: true,
					receiptNumber: true,
					createdAt: true,
					paymentAttempts: {
						orderBy: { requestedAt: "desc" },
						take: 1,
						select: { status: true, phoneNumber: true, requestedAt: true, mpesaReceiptNumber: true, resolutionType: true, resultDescription: true },
					},
				},
			},
			notifications: {
				where: { userId, channel: "DASHBOARD" },
				orderBy: { createdAt: "desc" },
				take: 20,
				select: { id: true, templateKey: true, status: true, createdAt: true },
			},
		},
	})
	if (!tenant || tenant.memberships.length === 0)
		throw new MerchantBillingError(
			"You are not authorized to view this billing account.",
		)
	if (tenant.memberships[0].role !== "OWNER")
		throw new MerchantBillingError(
			"Only the salon owner can access billing.",
		)
	return tenant
}

export async function requestRenewalPaymentForUser(
	userId: string,
	tenantSlug: string,
	phoneInput?: string,
) {
	const tenant = await getBillingSnapshotForUser(userId, tenantSlug)
	const invoice = tenant.invoices.find(
		(candidate) =>
			candidate.kind === "monthly" && candidate.status === "pending",
	)
	if (!invoice)
		throw new MerchantBillingError("No monthly payment is currently due.")
	const phone = phoneInput?.trim() || tenant.subscription?.billingPhoneNumber
	if (!phone)
		throw new MerchantBillingError("A billing phone number is required.")
	const result = await requestInvoicePayment(
		invoice.id,
		phone,
		"Beauty Sphia monthly subscription",
	)
	if (result.status === "pending") {
		await prisma.subscription.updateMany({
			where: { tenantId: tenant.id },
			data: { billingPhoneNumber: result.phoneNumber },
		})
	}
	return result
}

export async function submitManualTransferForReview(
	userId: string,
	tenantSlug: string,
	invoiceId: string,
	senderPhoneInput: string,
	receiptInput: string,
) {
	const design = await getPlatformStorefrontDesign()
	if (design.billing.paymentMode !== "registered-phone")
		throw new MerchantBillingError("Manual M-Pesa transfers are not enabled.")
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: {
			id: true,
			memberships: { where: { userId, status: "ACTIVE" }, select: { role: true } },
			subscription: { select: { status: true } },
		},
	})
	if (!tenant || tenant.memberships[0]?.role !== "OWNER")
		throw new MerchantBillingError("Only the salon owner can submit invoice payments.")
	const invoice = await prisma.billingInvoice.findFirst({
		where: { id: invoiceId, tenantId: tenant.id, status: "pending" },
		select: { id: true, kind: true, invoiceNumber: true },
	})
	if (!invoice) throw new MerchantBillingError("This invoice is no longer awaiting payment.")
	if (invoice.kind === "setup" && tenant.subscription?.status !== "setup_payment_required")
		throw new MerchantBillingError("The setup invoice is not available for payment review.")
	if (invoice.kind === "monthly" && !["payment_due", "suspended"].includes(tenant.subscription?.status ?? ""))
		throw new MerchantBillingError("The monthly invoice is not available for payment review.")
	const phoneNumber = normalizeKenyanMpesaPhone(senderPhoneInput)
	const receiptNumber = receiptInput.trim().toUpperCase()
	if (!/^[A-Z0-9]{6,16}$/.test(receiptNumber))
		throw new MerchantBillingError("Enter a valid M-Pesa receipt reference (6–16 letters or numbers).")
	const existingReview = await prisma.paymentAttempt.findFirst({
		where: { invoiceId: invoice.id, status: "manual_review", resolutionType: "manual_transfer" },
		select: { id: true, mpesaReceiptNumber: true },
	})
	if (existingReview) {
		if (existingReview.mpesaReceiptNumber === receiptNumber)
			return { status: "manual_review" as const, alreadySubmitted: true as const }
		throw new MerchantBillingError("A receipt for this invoice is already awaiting platform-owner review.")
	}
	const duplicateReceipt = await prisma.paymentAttempt.findFirst({
		where: { mpesaReceiptNumber: receiptNumber },
		select: { id: true },
	})
	if (duplicateReceipt)
		throw new MerchantBillingError("That M-Pesa receipt reference has already been submitted.")
	await prisma.paymentAttempt.create({
		data: {
			invoiceId: invoice.id,
			phoneNumber,
			mpesaReceiptNumber: receiptNumber,
			status: "manual_review",
			resolutionType: "manual_transfer",
			resultDescription: `Receipt submitted for ${invoice.invoiceNumber}; awaiting Beauty Sphia platform-owner verification.`,
		},
	})
	return { status: "manual_review" as const, alreadySubmitted: false as const }
}

async function ownerBillingContext(userId: string, tenantSlug: string) {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: {
			id: true,
			subscription: {
				select: {
					id: true,
					status: true,
					agreedMonthlyAmountMinor: true,
					plan: { select: { tier: true } },
				},
			},
			memberships: {
				where: { userId, status: "ACTIVE" },
				select: { role: true },
			},
		},
	})
	if (
		!tenant ||
		tenant.memberships[0]?.role !== "OWNER" ||
		!tenant.subscription
	)
		throw new MerchantBillingError(
			"Only the salon owner can change billing settings.",
		)
	return tenant
}

export async function cancelSubscriptionForUser(
	userId: string,
	tenantSlug: string,
) {
	const tenant = await ownerBillingContext(userId, tenantSlug)
	const subscription = tenant.subscription
	if (!subscription)
		throw new MerchantBillingError("Subscription is not configured.")
	const now = new Date()
	if (subscription.status === "trialing") {
		return prisma.$transaction([
			prisma.subscription.update({
				where: { id: subscription.id },
				data: {
					status: "cancelled",
					cancelledAt: now,
					dataRetentionUntil: new Date(now.getTime() + 90 * 86400000),
				},
			}),
			prisma.tenant.update({
				where: { id: tenant.id },
				data: { status: "ARCHIVED" },
			}),
		])
	}
	return prisma.subscription.update({
		where: { id: subscription.id },
		data: { cancelAtPeriodEnd: true },
	})
}

export async function changePlanForUser(
	userId: string,
	tenantSlug: string,
	tier: PlanTier,
) {
	const tenant = await ownerBillingContext(userId, tenantSlug)
	const subscription = tenant.subscription
	if (!subscription)
		throw new MerchantBillingError("Subscription is not configured.")
	const platformDesign = await getPlatformStorefrontDesign()
	const nextPlan = await prisma.plan.findUnique({
		where: {
			tier: tier.toUpperCase() as "STARTER" | "BUSINESS" | "ENTERPRISE",
		},
	})
	if (!nextPlan)
		throw new MerchantBillingError("The selected plan is unavailable.")
	const currentTier = subscription.plan.tier.toLowerCase() as PlanTier
	const currentAmount = subscription.agreedMonthlyAmountMinor ??
		platformDesign.plans[currentTier].monthlyAmountMinor
	const nextAmount = platformDesign.plans[tier].monthlyAmountMinor
	if (nextAmount <= currentAmount) {
		return prisma.subscription.update({
			where: { id: subscription.id },
			data: {
				pendingPlanTier: tier.toUpperCase() as
					| "STARTER"
					| "BUSINESS"
					| "ENTERPRISE",
			},
		})
	}
	const now = new Date()
	return prisma.$transaction(async (transaction) => {
		const updatedSubscription = await transaction.subscription.update({
			where: { id: subscription.id },
			data: {
				pendingPlanTier: tier.toUpperCase() as
					| "STARTER"
					| "BUSINESS"
					| "ENTERPRISE",
			},
		})
		await transaction.billingInvoice.create({
			data: {
				tenantId: tenant.id,
				subscriptionId: updatedSubscription.id,
				invoiceNumber: `BS-UPGRADE-${subscription.id}-${now.getTime()}`,
				kind: "plan_upgrade",
				status: "pending",
				amountMinor: nextAmount - currentAmount,
				currency: platformDesign.billing.currency,
				description: "Beauty Sphia plan upgrade adjustment",
				dueAt: now,
			},
		})
		return updatedSubscription
	})
}
