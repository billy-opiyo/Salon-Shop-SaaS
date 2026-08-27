import "server-only"

import { prisma } from "@backend/db/prisma"
import { requestInvoicePayment } from "@backend/services/darajaPaymentService"
import { PLAN_PRICING } from "@shared/constants/plans"
import type { PlanTier } from "@shared/types/tenant"

function invoiceNumber(subscriptionId: string, periodEnd: Date): string {
	return `BS-MONTHLY-${subscriptionId}-${periodEnd.getTime()}`
}

export async function createDueRenewalInvoices(now = new Date()) {
	const cancellations = await prisma.subscription.findMany({
		where: {
			cancelAtPeriodEnd: true,
			currentPeriodEnd: { lte: now },
			status: { not: "cancelled" },
		},
		select: { id: true, tenantId: true },
	})
	for (const cancellation of cancellations) {
		await prisma.$transaction([
			prisma.subscription.update({
				where: { id: cancellation.id },
				data: {
					status: "cancelled",
					cancelAtPeriodEnd: false,
					cancelledAt: now,
					dataRetentionUntil: new Date(now.getTime() + 90 * 86400000),
				},
			}),
			prisma.tenant.updateMany({
				where: { id: cancellation.tenantId, status: "ACTIVE" },
				data: { status: "ARCHIVED" },
			}),
		])
	}
	const subscriptions = await prisma.subscription.findMany({
		where: {
			status: { in: ["trialing", "active"] },
			currentPeriodEnd: { lte: now },
			cancelAtPeriodEnd: false,
		},
		select: {
			id: true,
			tenantId: true,
			currentPeriodEnd: true,
			billingPhoneNumber: true,
			pendingPlanTier: true,
			plan: { select: { tier: true } },
		},
	})

	let created = 0
	for (const subscription of subscriptions) {
		if (!subscription.currentPeriodEnd) continue
		const periodEnd = subscription.currentPeriodEnd
		const tier = (
			subscription.pendingPlanTier ?? subscription.plan.tier
		).toLowerCase() as PlanTier
		const pricing = PLAN_PRICING[tier]
		const number = invoiceNumber(subscription.id, periodEnd)
		const existing = await prisma.billingInvoice.findUnique({
			where: { invoiceNumber: number },
			select: { id: true },
		})
		if (existing) continue

		await prisma.$transaction(async (transaction) => {
			const pendingPlan = await transaction.plan.findUnique({
				where: { tier: subscription.pendingPlanTier ?? subscription.plan.tier },
				select: { id: true },
			})
			await transaction.billingInvoice.create({
				data: {
					tenantId: subscription.tenantId,
					subscriptionId: subscription.id,
					invoiceNumber: number,
					kind: "monthly",
					amountMinor: pricing.monthlyAmountMinor,
					currency: "KES",
					description: "Beauty Sphia monthly subscription",
					dueAt: now,
				},
			})
			await transaction.subscription.update({
				where: { id: subscription.id },
				data: {
					status: "payment_due",
					planId: pendingPlan?.id,
					pendingPlanTier: null,
				},
			})
		})
		created += 1
	}

	const dueInvoices = await prisma.billingInvoice.findMany({
		where: {
			kind: "monthly",
			status: "pending",
			dueAt: { lte: now },
			subscription: { status: "payment_due" },
		},
		select: {
			id: true,
			dueAt: true,
			retryCount: true,
			lastAttemptAt: true,
			subscription: {
				select: { tenantId: true, billingPhoneNumber: true },
			},
		},
	})
	let dispatched = 0
	let suspended = 0
	for (const invoice of dueInvoices) {
		if (!invoice.subscription) continue
		const dueAt = invoice.dueAt ?? now
		const graceEndsAt = new Date(dueAt.getTime() + 3 * 86400000)
		if (now >= graceEndsAt) {
			await prisma.$transaction([
				prisma.subscription.updateMany({
					where: {
						tenantId: invoice.subscription.tenantId,
						status: "payment_due",
					},
					data: { status: "suspended", gracePeriodEndsAt: graceEndsAt },
				}),
				prisma.tenant.updateMany({
					where: { id: invoice.subscription.tenantId, status: "ACTIVE" },
					data: { status: "SUSPENDED" },
				}),
			])
			suspended += 1
			continue
		}
		if (!invoice.subscription.billingPhoneNumber || invoice.retryCount >= 2)
			continue
		const retryDue =
			!invoice.lastAttemptAt ||
			now.getTime() - invoice.lastAttemptAt.getTime() >= 86400000
		if (!retryDue) continue
		try {
			await requestInvoicePayment(
				invoice.id,
				invoice.subscription.billingPhoneNumber,
				"Beauty Sphia monthly subscription",
			)
			await prisma.billingInvoice.update({
				where: { id: invoice.id },
				data: { retryCount: { increment: 1 }, lastAttemptAt: now },
			})
			dispatched += 1
		} catch {
			await prisma.billingInvoice.update({
				where: { id: invoice.id },
				data: { retryCount: { increment: 1 }, lastAttemptAt: now },
			})
		}
	}

	return { examined: subscriptions.length, created, dispatched, suspended }
}
