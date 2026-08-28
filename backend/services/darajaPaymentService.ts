import "server-only"

import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
} from "@backend/services/authorization"
import { dispatchNotification } from "@backend/services/notificationService"
import { normalizeKenyanMpesaPhone } from "@shared/validation/mpesa"

type DarajaTokenResponse = { access_token?: string }
type StkPushResponse = {
	MerchantRequestID?: string
	CheckoutRequestID?: string
	ResponseCode?: string
	ResponseDescription?: string
}
type StkQueryResponse = {
	ResultCode?: string
	ResultDesc?: string
}

function env(name: string): string {
	return (process.env[name] ?? "").trim()
}

export { normalizeKenyanMpesaPhone }

function darajaBaseUrl(): string {
	return env("DARAJA_BASE_URL") || "https://sandbox.safaricom.co.ke"
}

async function getAccessToken(): Promise<string> {
	const consumerKey = env("DARAJA_CONSUMER_KEY")
	const consumerSecret = env("DARAJA_CONSUMER_SECRET")
	if (!consumerKey || !consumerSecret)
		throw new Error("Daraja credentials are not configured.")
	const response = await fetch(
		`${darajaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
		{
			headers: {
				Authorization: `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`,
			},
			cache: "no-store",
		},
	)
	if (!response.ok) throw new Error("Daraja authentication failed.")
	const data = (await response.json()) as DarajaTokenResponse
	if (!data.access_token)
		throw new Error("Daraja did not return an access token.")
	return data.access_token
}

function stkPassword(timestamp: string): string {
	const shortCode = env("DARAJA_SHORTCODE")
	const passkey = env("DARAJA_PASSKEY")
	if (!shortCode || !passkey || !env("DARAJA_CALLBACK_URL"))
		throw new Error("Daraja shortcode, passkey, and callback URL are required.")
	return Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64")
}

async function verifyDarajaPayment(checkoutRequestId: string): Promise<void> {
	const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14)
	const response = await fetch(
		`${darajaBaseUrl()}/mpesa/stkpushquery/v1/query`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${await getAccessToken()}`,
				"content-type": "application/json",
			},
			body: JSON.stringify({
				BusinessShortCode: env("DARAJA_SHORTCODE"),
				Password: stkPassword(timestamp),
				Timestamp: timestamp,
				CheckoutRequestID: checkoutRequestId,
			}),
		},
	)
	const data = (await response.json()) as StkQueryResponse
	if (!response.ok || data.ResultCode !== "0")
		throw new Error(data.ResultDesc || "Daraja payment verification failed.")
}

export async function requestInvoicePayment(
	invoiceId: string,
	phoneInput: string,
	transactionDescription: string,
) {
	const phoneNumber = normalizeKenyanMpesaPhone(phoneInput)
	const invoice = await prisma.billingInvoice.findUnique({
		where: { id: invoiceId },
		select: { id: true, invoiceNumber: true, amountMinor: true, status: true },
	})
	if (!invoice) throw new Error("Billing invoice not found.")
	if (invoice.status === "paid") return { status: "paid" as const }
	const existingAttempt = await prisma.paymentAttempt.findFirst({
		where: { invoiceId, status: "pending" },
		select: { id: true },
	})
	if (existingAttempt)
		return { status: "pending" as const, attemptId: existingAttempt.id }
	const attempt = await prisma.paymentAttempt.create({
		data: { invoiceId, phoneNumber },
	})
	try {
		const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14)
		const response = await fetch(
			`${darajaBaseUrl()}/mpesa/stkpush/v1/processrequest`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${await getAccessToken()}`,
					"content-type": "application/json",
				},
				body: JSON.stringify({
					BusinessShortCode: env("DARAJA_SHORTCODE"),
					Password: stkPassword(timestamp),
					Timestamp: timestamp,
					TransactionType: "CustomerPayBillOnline",
					Amount: Math.ceil(invoice.amountMinor / 100),
					PartyA: phoneNumber,
					PartyB: env("DARAJA_SHORTCODE"),
					PhoneNumber: phoneNumber,
					CallBackURL: env("DARAJA_CALLBACK_URL"),
					AccountReference: invoice.invoiceNumber,
					TransactionDesc: transactionDescription,
				}),
			},
		)
		const data = (await response.json()) as StkPushResponse
		if (!response.ok || data.ResponseCode !== "0" || !data.CheckoutRequestID)
			throw new Error(
				data.ResponseDescription || "Daraja rejected the payment request.",
			)
		await prisma.$transaction([
			prisma.paymentAttempt.update({
				where: { id: attempt.id },
				data: {
					merchantRequestId: data.MerchantRequestID,
					checkoutRequestId: data.CheckoutRequestID,
				},
			}),
			prisma.billingInvoice.update({
				where: { id: invoiceId },
				data: { lastAttemptAt: new Date() },
			}),
		])
		return { status: "pending" as const, attemptId: attempt.id }
	} catch (error) {
		await prisma.paymentAttempt.update({
			where: { id: attempt.id },
			data: {
				status: "failed",
				resultDescription:
					error instanceof Error ? error.message : "Daraja request failed.",
			},
		})
		throw error
	}
}

export async function requestSetupPayment(
	userId: string,
	tenantSlug: string,
	phoneInput: string,
) {
	const phoneNumber = normalizeKenyanMpesaPhone(phoneInput)
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: {
			id: true,
			subscription: { select: { id: true, status: true } },
			memberships: {
				where: { userId, status: "ACTIVE" },
				select: {
					tenantId: true,
					userId: true,
					role: true,
					status: true,
					canManageAdmins: true,
					canManageBookings: true,
					canManageContent: true,
					canManageSecurity: true,
					canManageBilling: true,
				},
			},
		},
	})
	if (!tenant) throw new Error("Salon store not found.")
	const membership = assertTenantMembership(
		tenant.memberships[0] ?? null,
		tenant.id,
	)
	const canManageBilling = tenant.memberships[0]?.canManageBilling === true
	if (
		membership.role !== "OWNER" &&
		(membership.role !== "ADMIN" || !canManageBilling)
	)
		throw new Error(
			"Only the salon owner or an authorized billing administrator can make payments.",
		)
	if (tenant.subscription?.status !== "setup_payment_required")
		throw new Error("This salon does not have a setup payment due.")

	const invoice = await prisma.billingInvoice.findFirst({
		where: { tenantId: tenant.id, kind: "setup", status: "pending" },
		orderBy: { createdAt: "asc" },
	})
	if (!invoice) throw new Error("No setup invoice is available for this salon.")
	const existingAttempt = await prisma.paymentAttempt.findFirst({
		where: { invoiceId: invoice.id, status: "pending" },
		select: { id: true, checkoutRequestId: true },
	})
	if (existingAttempt)
		return { status: "pending", attemptId: existingAttempt.id }

	const attempt = await prisma.paymentAttempt.create({
		data: { invoiceId: invoice.id, phoneNumber },
	})
	try {
		const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14)
		const response = await fetch(
			`${darajaBaseUrl()}/mpesa/stkpush/v1/processrequest`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${await getAccessToken()}`,
					"content-type": "application/json",
				},
				body: JSON.stringify({
					BusinessShortCode: env("DARAJA_SHORTCODE"),
					Password: stkPassword(timestamp),
					Timestamp: timestamp,
					TransactionType: "CustomerPayBillOnline",
					Amount: Math.ceil(invoice.amountMinor / 100),
					PartyA: phoneNumber,
					PartyB: env("DARAJA_SHORTCODE"),
					PhoneNumber: phoneNumber,
					CallBackURL: env("DARAJA_CALLBACK_URL"),
					AccountReference: invoice.invoiceNumber,
					TransactionDesc: "Beauty Sphia salon store setup fee",
				}),
			},
		)
		const data = (await response.json()) as StkPushResponse
		if (!response.ok || data.ResponseCode !== "0" || !data.CheckoutRequestID)
			throw new Error(
				data.ResponseDescription || "Daraja rejected the payment request.",
			)
		await prisma.paymentAttempt.update({
			where: { id: attempt.id },
			data: {
				merchantRequestId: data.MerchantRequestID,
				checkoutRequestId: data.CheckoutRequestID,
			},
		})
		await prisma.subscription.update({
			where: { tenantId: tenant.id },
			data: { billingPhoneNumber: phoneNumber },
		})
		return { status: "pending", attemptId: attempt.id }
	} catch (error) {
		await prisma.paymentAttempt.update({
			where: { id: attempt.id },
			data: {
				status: "failed",
				resultDescription:
					error instanceof Error ? error.message : "Daraja request failed.",
			},
		})
		throw error
	}
}

export async function handleDarajaCallback(payload: unknown) {
	const callback = payload as {
		Body?: {
			stkCallback?: {
				CheckoutRequestID?: string
				ResultCode?: number
				ResultDesc?: string
				CallbackMetadata?: {
					Item?: Array<{ Name?: string; Value?: string | number }>
				}
			}
		}
	}
	const result = callback.Body?.stkCallback
	if (!result?.CheckoutRequestID) return
	const attempt = await prisma.paymentAttempt.findUnique({
		where: { checkoutRequestId: result.CheckoutRequestID },
		include: {
			invoice: {
				include: {
					tenant: {
						select: {
							businessName: true,
							ownerUserId: true,
							owner: { select: { email: true, phone: true } },
						},
					},
				},
			},
		},
	})
	if (!attempt || attempt.status !== "pending") return
	const paid = result.ResultCode === 0
	const metadata = result.CallbackMetadata?.Item ?? []
	const receipt = metadata.find(
		(item) => item.Name === "MpesaReceiptNumber",
	)?.Value
	const amount = metadata.find((item) => item.Name === "Amount")?.Value
	const phoneNumber = metadata.find(
		(item) => item.Name === "PhoneNumber",
	)?.Value
	if (paid) {
		if (
			!receipt ||
			Number(amount) !== Math.ceil(attempt.invoice.amountMinor / 100)
		) {
			throw new Error(
				"Daraja callback payment details do not match the invoice.",
			)
		}
		if (String(phoneNumber) !== attempt.phoneNumber) {
			throw new Error(
				"Daraja callback phone number does not match the payment.",
			)
		}
		await verifyDarajaPayment(result.CheckoutRequestID)
	}
	const processed = await prisma.$transaction(async (transaction) => {
		const claimed = await transaction.paymentAttempt.updateMany({
			where: { id: attempt.id, status: "pending" },
			data: {
				status: paid ? "succeeded" : "failed",
				mpesaReceiptNumber: receipt ? String(receipt) : null,
				resultDescription: result.ResultDesc,
				completedAt: new Date(),
				rawCallback: payload as object,
			},
		})
		if (claimed.count !== 1) return false

		if (paid) {
			const now = new Date()
			await transaction.billingInvoice.update({
				where: { id: attempt.invoiceId },
				data: {
					status: "paid",
					paidAt: now,
					receiptNumber: receipt ? String(receipt) : null,
				},
			})
			if (attempt.invoice.kind === "setup") {
				await transaction.subscription.update({
					where: { tenantId: attempt.invoice.tenantId },
					data: { status: "setup_paid_pending_activation", lastPaymentAt: now },
				})
			} else {
				const subscription = await transaction.subscription.findUnique({
					where: { tenantId: attempt.invoice.tenantId },
					select: { pendingPlanTier: true },
				})
				const pendingPlan = subscription?.pendingPlanTier
					? await transaction.plan.findUnique({
							where: { tier: subscription.pendingPlanTier },
							select: { id: true },
						})
					: null
				await transaction.subscription.update({
					where: { tenantId: attempt.invoice.tenantId },
					data: {
						status: "active",
						currentPeriodEnd: new Date(now.getTime() + 30 * 86400000),
						failedPaymentAttempts: 0,
						gracePeriodEndsAt: null,
						lastPaymentAt: now,
						...(pendingPlan
							? {
									planId: pendingPlan.id,
									pendingPlanTier: null,
								}
							: {}),
					},
				})
				await transaction.tenant.updateMany({
					where: { id: attempt.invoice.tenantId, status: "SUSPENDED" },
					data: { status: "ACTIVE" },
				})
			}
			return true
		}
	})
	if (!processed) return
	if (paid && attempt.invoice.tenant.owner.email) {
		await dispatchNotification({
			tenantId: attempt.invoice.tenantId,
			userId: attempt.invoice.tenant.ownerUserId,
			channel: "EMAIL",
			templateKey: "billing.receipt",
			destination: attempt.invoice.tenant.owner.email,
			subject: {
				businessName: attempt.invoice.tenant.businessName,
				amount: `KES ${(attempt.invoice.amountMinor / 100).toFixed(2)}`,
				receiptNumber: receipt ? String(receipt) : "pending",
				customerName: attempt.invoice.tenant.owner.email,
			},
			idempotencyKeySuffix: attempt.invoiceId,
			skipIfAlreadySent: true,
		})
	}
	await dispatchNotification({
		tenantId: attempt.invoice.tenantId,
		userId: attempt.invoice.tenant.ownerUserId,
		channel: "DASHBOARD",
		templateKey: paid ? "billing.receipt" : "billing.payment_failed",
		destination: attempt.invoice.tenant.ownerUserId,
		subject: {
			businessName: attempt.invoice.tenant.businessName,
			amount: `KES ${(attempt.invoice.amountMinor / 100).toFixed(2)}`,
			receiptNumber: receipt ? String(receipt) : "pending",
			customerName: attempt.invoice.tenant.owner.email,
		},
		idempotencyKeySuffix: `dashboard-${attempt.invoiceId}-${attempt.id}`,
		skipIfAlreadySent: true,
	})
	if (!paid && attempt.invoice.tenant.owner.email) {
		await dispatchNotification({
			tenantId: attempt.invoice.tenantId,
			userId: attempt.invoice.tenant.ownerUserId,
			channel: "EMAIL",
			templateKey: "billing.payment_failed",
			destination: attempt.invoice.tenant.owner.email,
			subject: {
				businessName: attempt.invoice.tenant.businessName,
				customerName: attempt.invoice.tenant.owner.email,
			},
			idempotencyKeySuffix: `${attempt.invoiceId}-${attempt.id}`,
		})
	}
	if (attempt.invoice.tenant.owner.phone) {
		await dispatchNotification({
			tenantId: attempt.invoice.tenantId,
			userId: attempt.invoice.tenant.ownerUserId,
			channel: "SMS",
			templateKey: paid ? "billing.receipt" : "billing.payment_failed",
			destination: attempt.invoice.tenant.owner.phone,
			subject: {
				businessName: attempt.invoice.tenant.businessName,
				amount: `KES ${(attempt.invoice.amountMinor / 100).toFixed(2)}`,
				receiptNumber: receipt ? String(receipt) : "pending",
				customerName: attempt.invoice.tenant.owner.email,
			},
			idempotencyKeySuffix: `sms-${attempt.invoiceId}-${attempt.id}`,
		})
	}
}
