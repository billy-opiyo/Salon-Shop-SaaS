import "server-only"

import { prisma } from "@backend/db/prisma"
import { requestInvoicePayment } from "@backend/services/darajaPaymentService"
import { PLAN_PRICING } from "@shared/constants/plans"
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
				select: { role: true, canManageBilling: true },
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
						select: { status: true, phoneNumber: true, requestedAt: true },
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
	if (
		tenant.memberships[0].role !== "OWNER" &&
		(tenant.memberships[0].role !== "ADMIN" ||
			!tenant.memberships[0].canManageBilling)
	)
		throw new MerchantBillingError(
			"Only the salon owner or an authorized administrator can view billing.",
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
	return requestInvoicePayment(
		invoice.id,
		phone,
		"Beauty Sphia monthly subscription",
	)
}

async function ownerBillingContext(userId: string, tenantSlug: string) {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: {
			id: true,
			subscription: {
				select: { id: true, status: true, plan: { select: { tier: true } } },
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
	const nextPlan = await prisma.plan.findUnique({
		where: {
			tier: tier.toUpperCase() as "STARTER" | "BUSINESS" | "ENTERPRISE",
		},
	})
	if (!nextPlan)
		throw new MerchantBillingError("The selected plan is unavailable.")
	const currentTier = subscription.plan.tier.toLowerCase() as PlanTier
	const currentAmount = PLAN_PRICING[currentTier].monthlyAmountMinor
	const nextAmount = PLAN_PRICING[tier].monthlyAmountMinor
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
			data: { planId: nextPlan.id },
		})
		await transaction.billingInvoice.create({
			data: {
				tenantId: tenant.id,
				subscriptionId: updatedSubscription.id,
				invoiceNumber: `BS-UPGRADE-${subscription.id}-${now.getTime()}`,
				kind: "plan_upgrade",
				status: "pending",
				amountMinor: nextAmount - currentAmount,
				currency: "KES",
				description: "Beauty Sphia plan upgrade adjustment",
				dueAt: now,
			},
		})
		return updatedSubscription
	})
}
