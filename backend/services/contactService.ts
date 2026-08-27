import "server-only"

import { NotificationChannel } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import {
	consumeRateLimit,
	hashRateLimitSubject,
} from "@backend/services/rateLimit"
import { verifyTurnstileToken } from "@backend/services/turnstile"
import { dispatchNotification } from "@backend/services/notificationService"
import type { ContactRequestInput } from "@shared/validation/contact"

export class ContactRequestError extends Error {
	readonly code = "CONTACT_REQUEST_FAILED" as const

	constructor(message: string) {
		super(message)
		this.name = "ContactRequestError"
	}
}

export async function createPublicContactMessage(
	input: ContactRequestInput,
	remoteAddress?: string,
	userId?: string,
): Promise<{ readonly id: string; readonly status: string }> {
	if (!(await verifyTurnstileToken(input.turnstileToken, remoteAddress))) {
		throw new ContactRequestError(
			"Security verification failed. Please try again.",
		)
	}

	const tenant = await prisma.tenant.findUnique({
		where: { slug: input.tenantSlug.toLowerCase() },
		select: {
			id: true,
			status: true,
			businessName: true,
			settings: { select: { emailPrimary: true, emailBookings: true } },
		},
	})
	if (!tenant || tenant.status !== "ACTIVE") {
		throw new ContactRequestError("This salon is not currently available.")
	}

	await consumeRateLimit({
		tenantId: tenant.id,
		subjectKey: hashRateLimitSubject(
			`${remoteAddress ?? "unknown"}:${input.email}`,
		),
		kind: "public-contact",
		intervalMs: 60_000,
	})

	const message = await prisma.contactMessage.create({
		data: {
			tenantId: tenant.id,
			userId,
			name: input.name,
			email: input.email.toLowerCase(),
			subject: input.subject,
			message: input.message,
		},
		select: { id: true, status: true },
	})

	// Notify the salon owner, matching the legacy contact-message email.
	const salonEmail = tenant.settings?.emailBookings || tenant.settings?.emailPrimary
	if (salonEmail) {
		await dispatchNotification({
			tenantId: tenant.id,
			userId,
			channel: NotificationChannel.EMAIL,
			templateKey: "contact.alert",
			destination: salonEmail,
			subject: {
				businessName: tenant.businessName,
				contactName: input.name,
				contactEmail: input.email.toLowerCase(),
				contactSubject: input.subject,
				message: input.message,
			},
		}).catch(() => {})
	}

	return { id: message.id, status: message.status.toLowerCase() }
}
