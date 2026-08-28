import "server-only"

import { NotificationChannel, Prisma, WaitlistStatus } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import {
	consumeRateLimit,
	hashRateLimitSubject,
} from "@backend/services/rateLimit"
import { verifyTurnstileToken } from "@backend/services/turnstile"
import { hasEntitlement } from "@shared/constants/plans"
import { dispatchNotification } from "@backend/services/notificationService"
import type { WaitlistRequestInput } from "@shared/validation/booking"

export class WaitlistRequestError extends Error {
	readonly code = "WAITLIST_REQUEST_FAILED" as const

	constructor(message: string) {
		super(message)
		this.name = "WaitlistRequestError"
	}
}

function toUtcDate(date: string | undefined): Date | undefined {
	return date ? new Date(`${date}T00:00:00.000Z`) : undefined
}

export async function createPublicWaitlistEntry(
	input: WaitlistRequestInput,
	remoteAddress?: string,
	userId?: string,
) {
	if (!(await verifyTurnstileToken(input.turnstileToken, remoteAddress))) {
		throw new WaitlistRequestError(
			"Security verification failed. Please try again.",
		)
	}

	const tenant = await prisma.tenant.findUnique({
		where: { slug: input.tenantSlug.toLowerCase() },
		select: {
			id: true,
			status: true,
			businessName: true,
			subscription: { select: { plan: { select: { tier: true } } } },
		},
	})
	if (!tenant || tenant.status !== "ACTIVE")
		throw new WaitlistRequestError(
			"This salon is not currently accepting requests.",
		)

	const planTier = tenant.subscription?.plan.tier.toLowerCase()
	if (planTier !== "business" && planTier !== "enterprise") {
		throw new WaitlistRequestError(
			"Waitlist requests are not enabled for this salon plan.",
		)
	}
	if (!hasEntitlement(planTier, "waitlist"))
		throw new WaitlistRequestError(
			"Waitlist requests are not enabled for this salon plan.",
		)

	await consumeRateLimit({
		tenantId: tenant.id,
		subjectKey: hashRateLimitSubject(
			`${remoteAddress ?? "unknown"}:${input.email}`,
		),
		kind: "public-waitlist",
		intervalMs: 30_000,
	})

	const preferredDate = toUtcDate(input.preferredDate)
	if (
		preferredDate &&
		preferredDate.getTime() <
			toUtcDate(new Date().toISOString().slice(0, 10))!.getTime()
	) {
		throw new WaitlistRequestError(
			"Please choose a current or future preferred date.",
		)
	}

	let entry: { id: string; queuePosition: number; status: WaitlistStatus }
	try {
		entry = await prisma.$transaction(async (transaction) => {
			const queuePosition =
				(await transaction.waitlistEntry.count({
					where: {
						tenantId: tenant.id,
						status: { in: [WaitlistStatus.WAITING, WaitlistStatus.CONTACTED] },
					},
				})) + 1
			const created = await transaction.waitlistEntry.create({
				data: {
					tenantId: tenant.id,
					userId,
					serviceName: input.serviceName,
					preferredDate,
					preferredTime: input.preferredTime,
					preferredStylist: input.preferredStylist,
					email: input.email.toLowerCase(),
					phone: input.phone,
					queuePosition,
					status: WaitlistStatus.WAITING,
				},
				select: { id: true, queuePosition: true, status: true },
			})
			await transaction.notificationDelivery.create({
				data: {
					tenantId: tenant.id,
					userId,
					channel: "EMAIL" as NotificationChannel,
					templateKey: "waitlist.created",
					destination: input.email.toLowerCase(),
					idempotencyKey: `manual:${tenant.id}:waitlist.created:${created.id}`,
				},
			})
			return created
		})
	} catch (error) {
		if (error instanceof WaitlistRequestError) throw error
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			throw new WaitlistRequestError("This request has already been received.")
		}
		throw new WaitlistRequestError(
			"The waitlist request could not be created. Please try again.",
		)
	}

	// Notify the customer, matching the legacy waitlist join automation.
	const subject = {
		businessName: tenant.businessName,
		customerName: input.name,
		preferredStylist: input.preferredStylist ?? null,
		serviceName: input.serviceName,
		appointmentDate: input.preferredDate,
		timeLabel: input.preferredTime,
		phone: input.phone,
		queuePosition: entry.queuePosition,
	}

	await Promise.allSettled([
		dispatchNotification({
			tenantId: tenant.id,
			userId,
			channel: NotificationChannel.EMAIL,
			templateKey: "waitlist.created",
			destination: input.email.toLowerCase(),
			subject,
		}),
		...(input.phone
			? [
					dispatchNotification({
						tenantId: tenant.id,
						userId,
						channel: NotificationChannel.WHATSAPP,
						templateKey: "waitlist.created",
						destination: input.phone,
						subject,
					}),
				]
			: []),
	])

	return {
		id: entry.id,
		queuePosition: entry.queuePosition,
		status: entry.status,
	}
}
