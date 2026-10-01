import "server-only"

import { randomUUID } from "node:crypto"
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { Prisma } from "@prisma/client"
import { prisma } from "@backend/db/prisma"
import {
	DEFAULT_PLATFORM_STOREFRONT,
	platformStorefrontDesignSchema,
	type PlatformStorefrontDesign,
} from "@shared/constants/platformStorefront"
import { getImageUploadError } from "@shared/validation/media"

export class PlatformAdminActionError extends Error {
	readonly code = "PLATFORM_ADMIN_ACTION_FAILED" as const
}

function mergePlatformStorefrontConfig(value: unknown): PlatformStorefrontDesign {
	const current = value && typeof value === "object"
		? (value as Partial<PlatformStorefrontDesign>)
		: {}
	const currentContent = current.content && typeof current.content === "object"
		? current.content
		: {}
	return {
		...DEFAULT_PLATFORM_STOREFRONT,
		...current,
		content: { ...DEFAULT_PLATFORM_STOREFRONT.content, ...currentContent },
	}
}

export async function getPlatformStorefrontDesign(): Promise<PlatformStorefrontDesign> {
	// The public platform must remain renderable while the database is being
	// configured (and during a deployment where the new table is not available
	// yet). The admin editor still requires the database for writes; public
	// rendering can safely use the checked-in defaults until a saved design is
	// available.
	if (!process.env.DATABASE_URL?.trim()) return DEFAULT_PLATFORM_STOREFRONT
	try {
		const record = await prisma.platformStorefrontConfig.findUnique({ where: { id: "default" } })
		return mergePlatformStorefrontConfig(record ?? undefined)
	} catch {
		return DEFAULT_PLATFORM_STOREFRONT
	}
}

export async function updatePlatformStorefrontDesign(
	actorUserId: string,
	rawInput: unknown,
): Promise<PlatformStorefrontDesign> {
	const input = platformStorefrontDesignSchema.parse(rawInput)
	const current = await getPlatformStorefrontDesign()
	const design = platformStorefrontDesignSchema.parse({
		...current,
		...input,
		content: { ...current.content, ...input.content },
	})
	await prisma.$transaction([
		prisma.platformStorefrontConfig.upsert({
			where: { id: "default" },
			create: {
				id: "default",
				logoUrl: design.logoUrl,
				heroDesktopUrl: design.heroDesktopUrl,
				heroMobileUrl: design.heroMobileUrl,
				heroAlt: design.heroAlt,
				content: design.content as unknown as Prisma.InputJsonValue,
			},
			update: {
				logoUrl: design.logoUrl,
				heroDesktopUrl: design.heroDesktopUrl,
				heroMobileUrl: design.heroMobileUrl,
				heroAlt: design.heroAlt,
				content: design.content as unknown as Prisma.InputJsonValue,
			},
		}),
		prisma.platformAuditLog.create({
			data: {
				actorUserId,
				action: "platform.storefront-design.updated",
				resourceType: "platform-storefront",
				resourceId: "default",
			},
		}),
	])
	return design
}

function platformR2Client(): S3Client {
	const accountId = process.env.R2_ACCOUNT_ID?.trim()
	const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim()
	const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim()
	if (!accountId || !accessKeyId || !secretAccessKey)
		throw new PlatformAdminActionError("R2 media storage is not configured.")
	return new S3Client({
		region: "auto",
		endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
		credentials: { accessKeyId, secretAccessKey },
	})
}

export async function uploadPlatformStorefrontImage(
	actorUserId: string,
	file: Buffer,
	mimeType: string,
	fileName: string,
	kind: "LOGO" | "HERO_DESKTOP" | "HERO_MOBILE",
): Promise<string> {
	const validationError = getImageUploadError(file.length, mimeType)
	if (validationError) throw new PlatformAdminActionError(validationError)
	const bucket = process.env.R2_BUCKET_NAME?.trim()
	const publicBase = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, "")
	if (!bucket || !publicBase)
		throw new PlatformAdminActionError("R2 media storage is not configured.")
	const safeName = fileName.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(-100) || "image"
	const objectKey = `platform/storefront/${kind.toLowerCase()}/${randomUUID()}-${safeName}`
	await platformR2Client().send(new PutObjectCommand({
		Bucket: bucket,
		Key: objectKey,
		Body: file,
		ContentType: mimeType,
		ContentLength: file.length,
	}))
	const url = `${publicBase}/${objectKey}`
	await prisma.platformAuditLog.create({
		data: {
			actorUserId,
			action: "platform.storefront-image.uploaded",
			resourceType: "platform-storefront",
			resourceId: kind,
			metadata: { url, byteSize: file.length } as Prisma.InputJsonValue,
		},
	})
	return url
}

export async function setTenantSuspension(
	actorUserId: string,
	tenantId: string,
	suspended: boolean,
): Promise<void> {
	const tenant = await prisma.tenant.findUnique({
		where: { id: tenantId },
		select: {
			id: true,
			status: true,
			subscription: { select: { status: true } },
		},
	})
	if (!tenant) throw new PlatformAdminActionError("Salon store not found.")
	if (suspended && tenant.status !== "ACTIVE")
		throw new PlatformAdminActionError("Only active stores can be suspended.")
	if (!suspended && tenant.status !== "SUSPENDED")
		throw new PlatformAdminActionError(
			"Only suspended stores can be reactivated.",
		)
	if (!suspended && tenant.subscription?.status === "suspended")
		throw new PlatformAdminActionError(
			"Resolve the suspended subscription before reactivating this store.",
		)
	await prisma.$transaction([
		prisma.tenant.update({
			where: { id: tenantId },
			data: { status: suspended ? "SUSPENDED" : "ACTIVE" },
		}),
		prisma.adminAuditLog.create({
			data: {
				tenantId,
				actorUserId,
				action: suspended
					? "platform.tenant.suspended"
					: "platform.tenant.reactivated",
				resourceType: "tenant",
				resourceId: tenantId,
			},
		}),
	])
}

export async function resolvePaymentAttempt(
	actorUserId: string,
	attemptId: string,
	resolutionType: "credit" | "refund" | "verified_payment" = "verified_payment",
	resolutionReference?: string,
): Promise<void> {
	const attempt = await prisma.paymentAttempt.findUnique({
		where: { id: attemptId },
		select: { id: true, status: true, invoice: { select: { tenantId: true } } },
	})
	if (!attempt) throw new PlatformAdminActionError("Payment attempt not found.")
	if (attempt.status !== "manual_review")
		throw new PlatformAdminActionError(
			"Only manual-review payments can be resolved.",
		)
	await prisma.$transaction([
		prisma.paymentAttempt.update({
			where: { id: attemptId },
			data: {
				status: "resolved",
				completedAt: new Date(),
				resultDescription: `Resolved by Beauty Sphia platform operator as ${resolutionType}.`,
				resolutionType,
				resolutionReference: resolutionReference?.trim() || null,
			},
		}),
		prisma.adminAuditLog.create({
			data: {
				tenantId: attempt.invoice.tenantId,
				actorUserId,
				action: "platform.payment-attempt.resolved",
				resourceType: "payment-attempt",
				resourceId: attemptId,
			},
		}),
	])
}

export async function resolvePlatformSecurityAlert(
	actorUserId: string,
	alertId: string,
): Promise<void> {
	const alert = await prisma.securityAlert.findUnique({
		where: { id: alertId },
		select: { id: true, tenantId: true, resolvedAt: true },
	})
	if (!alert) throw new PlatformAdminActionError("Security alert not found.")
	if (alert.resolvedAt)
		throw new PlatformAdminActionError("Security alert is already resolved.")
	await prisma.$transaction([
		prisma.securityAlert.update({
			where: { id: alertId },
			data: { resolvedAt: new Date() },
		}),
		prisma.adminAuditLog.create({
			data: {
				tenantId: alert.tenantId,
				actorUserId,
				action: "platform.security-alert.resolved",
				resourceType: "security-alert",
				resourceId: alertId,
			},
		}),
	])
}

export async function getPlatformAdminSnapshot() {
	const now = new Date()
	const [
		totalTenants,
		activeTenants,
		draftTenants,
		suspendedTenants,
		archivedTenants,
		activeSubscriptions,
		paymentDueSubscriptions,
		suspendedSubscriptions,
		pendingInvoices,
		overdueInvoices,
		manualReviewPayments,
		failedNotifications,
		unresolvedSecurityAlerts,
		recentTenants,
		recentInvoices,
		recentNotifications,
		recentAlerts,
		recentManualReviewPayments,
	] = await Promise.all([
		prisma.tenant.count(),
		prisma.tenant.count({ where: { status: "ACTIVE" } }),
		prisma.tenant.count({ where: { status: "DRAFT" } }),
		prisma.tenant.count({ where: { status: "SUSPENDED" } }),
		prisma.tenant.count({ where: { status: "ARCHIVED" } }),
		prisma.subscription.count({
			where: { status: { in: ["active", "trialing"] } },
		}),
		prisma.subscription.count({ where: { status: "payment_due" } }),
		prisma.subscription.count({ where: { status: "suspended" } }),
		prisma.billingInvoice.count({ where: { status: "pending" } }),
		prisma.billingInvoice.count({
			where: { status: "pending", dueAt: { lt: now } },
		}),
		prisma.paymentAttempt.count({ where: { status: "manual_review" } }),
		prisma.notificationDelivery.count({ where: { status: "FAILED" } }),
		prisma.securityAlert.count({ where: { resolvedAt: null } }),
		prisma.tenant.findMany({
			orderBy: { createdAt: "desc" },
			take: 12,
			select: {
				id: true,
				slug: true,
				businessName: true,
				status: true,
				createdAt: true,
				subscription: {
					select: { status: true, plan: { select: { displayName: true } } },
				},
			},
		}),
		prisma.billingInvoice.findMany({
			where: { status: "pending" },
			orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
			take: 10,
			select: {
				id: true,
				invoiceNumber: true,
				amountMinor: true,
				currency: true,
				dueAt: true,
				tenant: { select: { businessName: true, slug: true } },
			},
		}),
		prisma.notificationDelivery.findMany({
			where: { status: "FAILED" },
			orderBy: { createdAt: "desc" },
			take: 10,
			select: {
				id: true,
				channel: true,
				templateKey: true,
				destination: true,
				errorMessage: true,
				createdAt: true,
				tenant: { select: { businessName: true, slug: true } },
			},
		}),
		prisma.securityAlert.findMany({
			where: { resolvedAt: null },
			orderBy: { createdAt: "desc" },
			take: 10,
			select: {
				id: true,
				severity: true,
				alertType: true,
				message: true,
				createdAt: true,
				tenant: { select: { businessName: true, slug: true } },
			},
		}),
		prisma.paymentAttempt.findMany({
			where: { status: "manual_review" },
			orderBy: { requestedAt: "desc" },
			take: 10,
			select: {
				id: true,
				phoneNumber: true,
				resultDescription: true,
				requestedAt: true,
				invoice: {
					select: {
						invoiceNumber: true,
						tenant: { select: { businessName: true } },
					},
				},
			},
		}),
	])

	return {
		generatedAt: now,
		counts: {
			totalTenants,
			activeTenants,
			draftTenants,
			suspendedTenants,
			archivedTenants,
			activeSubscriptions,
			paymentDueSubscriptions,
			suspendedSubscriptions,
			pendingInvoices,
			overdueInvoices,
			manualReviewPayments,
			failedNotifications,
			unresolvedSecurityAlerts,
		},
		recentTenants,
		recentInvoices,
		recentNotifications,
		recentAlerts,
		recentManualReviewPayments,
	}
}
