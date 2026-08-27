import "server-only";

import { NotificationChannel, NotificationStatus, WaitlistStatus } from "@prisma/client";

import { prisma } from "@backend/db/prisma";

/**
 * Notification dispatch service (server-only).
 *
 * The legacy Firebase project delivered booking confirmations, booking
 * reminders, waitlist updates, contact-message alerts, email verification,
 * and password-reset emails through Cloud Functions using Resend and the
 * WhatsApp Cloud API. This module restores that behaviour inside the SaaS
 * using the same providers over their public REST APIs. It degrades safely
 * (marks SKIPPED/FAILED/cannot dispatch) when a provider is not configured,
 * so booking/waitlist flows never break due to missing keys.
 */

const RESEND_API_URL = "https://api.resend.com/emails";
const WHATSAPP_API_VERSION = "v20.0";
const WHATSAPP_MESSAGES_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/`;

export type NotificationSubject = { [key: string]: unknown };

type DeliveryResult = {
	readonly ok: boolean;
	readonly providerMessageId?: string;
	readonly error?: string;
};

function env(name: string): string {
	return (process.env[name] ?? "").trim();
}

function escapeHtml(value: unknown): string {
	return String(value ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}

/** Normalizes a phone to the E.164-style form required by WhatsApp Cloud API. */
export function normalizePhoneForWhatsApp(value: string): string {
	const digits = String(value ?? "").replace(/\D/g, "");
	if (digits.startsWith("0")) {
		const rest = digits.slice(1);
		if (rest.length === 9) return "254" + rest;
	}
	if (digits.startsWith("7") && digits.length === 9) return "254" + digits;
	if (digits.startsWith("254") && digits.length === 12) return digits;
	return digits;
}

/* -------------------------------------------------------------------------- */
/* Low-level provider senders (REST, no extra dependencies)                    */
/* -------------------------------------------------------------------------- */

async function sendResendEmail(
	to: string,
	subject: string,
	html: string,
): Promise<DeliveryResult> {
	const apiKey = env("RESEND_API_KEY");
	const from = env("RESEND_FROM_EMAIL");
	if (!apiKey || !from) {
		return { ok: false, error: "Resend is not configured." };
	}
	try {
		const response = await fetch(RESEND_API_URL, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"content-type": "application/json",
			},
			body: JSON.stringify({ from, to: [to], subject, html }),
		});
		if (!response.ok) {
			return {
				ok: false,
				error: `Email provider rejected the message (${response.status}).`,
			};
		}
		const data = (await response.json().catch(() => null)) as {
			id?: string;
		} | null;
		return { ok: true, providerMessageId: data?.id };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : "Email send failed.",
		};
	}
}

async function sendWhatsAppText(
	to: string,
	text: string,
): Promise<DeliveryResult> {
	const token = env("WHATSAPP_CLOUD_ACCESS_TOKEN");
	const phoneNumberId = env("WHATSAPP_CLOUD_PHONE_NUMBER_ID");
	const phone = normalizePhoneForWhatsApp(to);
	if (!token || !phoneNumberId || !phone) {
		return { ok: false, error: "WhatsApp is not configured." };
	}
	try {
		const response = await fetch(
			`${WHATSAPP_MESSAGES_URL}${phoneNumberId}/messages`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"content-type": "application/json",
				},
				body: JSON.stringify({
					messaging_product: "whatsapp",
					to: phone,
					type: "text",
					text: { body: text },
				}),
			},
		);
		if (!response.ok) {
			return {
				ok: false,
				error: `WhatsApp provider rejected the message (${response.status}).`,
			};
		}
		return { ok: true, providerMessageId: phone };
	} catch (error) {
		return {
			ok: false,
			error:
				error instanceof Error ? error.message : "WhatsApp send failed.",
		};
	}
}
/* -------------------------------------------------------------------------- */
/* Template helpers                                                            */
/* -------------------------------------------------------------------------- */

type TemplateLike = NotificationSubject;

function stringValue(value: unknown, fallback = ""): string {
	const text = String(value ?? "").trim();
	return text || fallback;
}

function customerDisplayName(data: TemplateLike): string {
	const full = [stringValue(data.firstName), stringValue(data.lastName)]
		.filter(Boolean)
		.join(" ");
	return full || stringValue(data.customerName, "there");
}

function appointmentLine(data: TemplateLike): string {
	return (
		[stringValue(data.appointmentDate), stringValue(data.timeLabel)]
			.filter(Boolean)
			.join(" · ") || "your selected time"
	);
}

function emailShell(
	subject: string,
	heading: string,
	bodyHtml: string,
	link?: string,
): string {
	const button = link
		? `<p style="margin:24px 0;"><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 20px;background:#d7a84f;color:#111;border-radius:6px;font-weight:700;text-decoration:none;">Continue</a></p>`
		: "";
	return `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#1c1917;"><div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;"><div style="padding:20px 28px;background:#1c1917;color:#d7a84f;font-size:20px;font-weight:800;">${escapeHtml(subject)}</div><div style="padding:28px;"><h2 style="margin:0 0 16px;">${escapeHtml(heading)}</h2>${bodyHtml}${button}</div><div style="padding:18px 28px;background:#f4f1ea;font-size:12px;color:#6b7280;">You are receiving this email because you interacted with a salon store on the Beauty Sphia platform.</div></div></body></html>`;
}

interface BuiltTemplate {
	readonly subject: string;
	readonly heading: string;
	readonly bodyHtml: string;
	readonly whatsapp: string;
	readonly link?: string;
}

function buildTemplate(templateKey: string, data: TemplateLike): BuiltTemplate {
	const business = stringValue(data.businessName, "the salon");
	const name = customerDisplayName(data);
	const when = appointmentLine(data);
	const service = stringValue(data.serviceName, "your selected service");
	const contactName = stringValue(data.contactName, "Someone");

	switch (templateKey) {
		case "booking.pending":
		case "booking.confirmed":
		case "booking.enquiry":
			return {
				subject: `Booking request received — ${business}`,
				heading: `Thanks ${name}! We've received your request.`,
				bodyHtml: `<p>We've noted your request for <strong>${escapeHtml(service)}</strong> at <strong>${escapeHtml(when)}</strong>. Our team will confirm your appointment and reach out if anything needs adjusting.</p><p>See you soon at <strong>${escapeHtml(business)}</strong>.</p>`,
				whatsapp: `Hi ${name}, thank you for booking ${service} at ${business} for ${when}. We will confirm your appointment shortly.`,
			};
		case "booking.cancelled":
			return {
				subject: `Booking cancelled — ${business}`,
				heading: `Your ${service} booking has been cancelled.`,
				bodyHtml:
					"<p>This booking has been cancelled. If that was a mistake, please reach out and we'll be happy to help rebook a time that suits you.</p>",
				whatsapp: `Hi ${name}, your booking (${service}, ${when}) at ${business} has been cancelled.`,
			};
		case "booking.rescheduled":
			return {
				subject: `Booking updated — ${business}`,
				heading: "Your appointment has been rescheduled.",
				bodyHtml: `<p>Your <strong>${escapeHtml(service)}</strong> appointment at <strong>${escapeHtml(business)}</strong> is now set for <strong>${escapeHtml(when)}</strong>.</p>`,
				whatsapp: `Hi ${name}, your ${service} at ${business} has been moved to ${when}.`,
			};
		case "booking.reminder":
			return {
				subject: `Reminder: your appointment at ${business}`,
				heading: `See you soon, ${name}!`,
				bodyHtml: `<p>Just a friendly reminder that your <strong>${escapeHtml(service)}</strong> appointment at <strong>${escapeHtml(business)}</strong> is booked for <strong>${escapeHtml(when)}</strong>.</p>`,
				whatsapp: `Hi ${name}, a reminder that your ${service} at ${business} is coming up on ${when}. We can't wait to see you!`,
			};
		case "booking.completed":
			return {
				subject: `Thanks for visiting ${business}!`,
				heading: "We hope you loved your appointment.",
				bodyHtml: `<p>${escapeHtml(name)}, your <strong>${escapeHtml(service)}</strong> appointment at <strong>${escapeHtml(business)}</strong> is complete. We would love to see you again soon!</p>`,
				whatsapp: `Hi ${name}, thank you for visiting ${business}! Your ${service} appointment is complete. We hope to see you again soon.`,
			};
		case "waitlist.created":
			return {
				subject: `You're on the ${business} waitlist`,
				heading: "You're on the list!",
				bodyHtml: `<p>We'll notify you as soon as an opening is available for <strong>${escapeHtml(service)}</strong>.</p>`,
				whatsapp: `Hi ${name}, you're on the ${business} waitlist for ${service}. We'll let you know the moment a spot opens.`,
			};
case "waitlist.available":
			return {
				subject: `A spot opened at ${business}!`,
				heading: "Your spot is ready!",
				bodyHtml: `<p>Great news ${name} — an opening for <strong>${escapeHtml(service)}</strong> at <strong>${escapeHtml(business)}</strong> just became available. Reach out soon to claim it.</p>`,
				whatsapp: `Hi ${name}, a spot for ${service} at ${business} just opened up. Reach out to claim it!`,
			};
		case "contact.alert":
			return {
				subject: `New message from ${contactName}`,
				heading: "New contact message",
				bodyHtml: `<p><strong>From:</strong> ${escapeHtml(contactName)} (${escapeHtml(stringValue(data.contactEmail))})</p><p><strong>Subject:</strong> ${escapeHtml(stringValue(data.contactSubject))}</p><p style="white-space:pre-wrap;">${escapeHtml(stringValue(data.message))}</p>`,
				whatsapp: "",
			};
		case "verify.address":
			return {
				subject: `Verify your email — ${business}`,
				heading: "Confirm your email address",
				bodyHtml: `<p>Hello ${name}, please confirm your email address to finish creating your account. The link will expire in 30 minutes.</p>`,
				whatsapp: "",
				link: stringValue(data.link),
			};
		case "reset.password":
			return {
				subject: `Password reset — ${business}`,
				heading: "Reset your password",
				bodyHtml: `<p>We received a request to reset the password for <strong>${escapeHtml(stringValue(data.email))}</strong>. Use the link below (valid for 30 minutes) to choose a new password.</p>`,
				whatsapp: "",
				link: stringValue(data.link),
			};
		default:
			return {
				subject: "Notification",
				heading: "Notification",
				bodyHtml: "<p>You have a new update.</p>",
				whatsapp: "",
			};
	}
}
/* -------------------------------------------------------------------------- */
/* Public dispatch API                                                         */
/* -------------------------------------------------------------------------- */

export interface DispatchNotificationInput {
	readonly tenantId: string;
	readonly userId?: string | null;
	readonly bookingId?: string | null;
	readonly channel: NotificationChannel;
	readonly templateKey: string;
	readonly destination: string;
	readonly subject?: NotificationSubject;
	/** Optional extra uniqueness scoping (e.g. booking id) for repeatable sends. */
	readonly idempotencyKeySuffix?: string;
	/** When true, an already SENT delivery short-circuits without re-sending. */
	readonly skipIfAlreadySent?: boolean;
}



/**
 * Sends a single notification for a subject and records its delivery outcome.
 * The caller supplies the template data directly (the Prisma delivery row does
 * not persist arbitrary template payloads). Never throws: a provider outage or
 * missing configuration records FAILED, keeping the booking/waitlist flow alive.
 */
export async function dispatchNotification(
	input: DispatchNotificationInput,
): Promise<{ readonly id: string; readonly status: NotificationStatus }> {
	const idempotencyKey = [
		"manual",
		input.tenantId,
		input.templateKey,
		input.destination,
		input.idempotencyKeySuffix ?? "",
	]
		.filter((part) => part.length > 0)
		.join(":");
	let delivery = await prisma.notificationDelivery.findUnique({
		where: { idempotencyKey },
		select: { id: true, status: true },
	});

	if (!delivery) {
		try {
			delivery = await prisma.notificationDelivery.create({
				data: {
					tenantId: input.tenantId,
					userId: input.userId ?? null,
					bookingId: input.bookingId ?? null,
					channel: input.channel,
					templateKey: input.templateKey,
					destination: input.destination,
					idempotencyKey,
				},
				select: { id: true, status: true },
			});
		} catch {
			delivery = await prisma.notificationDelivery.findUnique({
				where: { idempotencyKey },
				select: { id: true, status: true },
			});
		}
	}
	if (!delivery) {
		// Concurrency lost the race; skip so the caller's flow is never blocked.
		return {
			id: "",
			status: NotificationStatus.FAILED,
		};
	}

	if (input.skipIfAlreadySent && delivery.status === NotificationStatus.SENT) {
		// Repeatable notifications (e.g. cron reminders) must fire only once.
		return { id: delivery.id, status: delivery.status };
	}

	const built = buildTemplate(input.templateKey, input.subject ?? {});
	let result: DeliveryResult;
	if (input.channel === NotificationChannel.EMAIL) {
		result = await sendResendEmail(
			input.destination,
			built.subject,
			emailShell(built.subject, built.heading, built.bodyHtml, built.link),
		);
	} else {
		result = await sendWhatsAppText(input.destination, built.whatsapp);
	}

	const nextStatus = result.ok
		? NotificationStatus.SENT
		: NotificationStatus.FAILED;
	await prisma.notificationDelivery.update({
		where: { id: delivery.id },
		data: {
			status: nextStatus,
			providerMessageId: result.providerMessageId ?? null,
			errorMessage: result.error ?? null,
			sentAt: result.ok ? new Date() : null,
		},
	}).catch(() => {
		// Status bookkeeping must never break the caller.
	});
	return { id: delivery.id, status: nextStatus };
}

/**
 * Returns whether a provider is configured. Used by callers to skip work that
 * can never succeed (e.g. checking for a reminder phone) without querying.
 */
export function isNotificationProviderConfigured(
	channel: NotificationChannel,
): boolean {
	return channel === NotificationChannel.EMAIL
		? Boolean(env("RESEND_API_KEY") && env("RESEND_FROM_EMAIL"))
		: Boolean(
				env("WHATSAPP_CLOUD_ACCESS_TOKEN") &&
					env("WHATSAPP_CLOUD_PHONE_NUMBER_ID"),
			);
}
/**
 * Sends a non-tenant platform email (email verification, password reset) that
 * does not belong to any NotificationDelivery row. Returns whether the provider
 * accepted the message. Used by account workflows where no tenant context exists.
 */
export async function sendPlatformEmail(input: {
	readonly templateKey: string;
	readonly destination: string;
	readonly subject?: NotificationSubject;
}): Promise<{ readonly ok: boolean; readonly error?: string }> {
	const built = buildTemplate(input.templateKey, input.subject ?? {});
	const result = await sendResendEmail(
		input.destination,
		built.subject,
		emailShell(built.subject, built.heading, built.bodyHtml, built.link),
	);
	return { ok: result.ok, error: result.error };
}

/**
 * Base URL used to build links inside platform emails (verification, reset).
 */
export function platformBaseUrl(): string {
	return (
		env("NEXT_PUBLIC_APP_URL") ||
		env("APP_URL") ||
		"http://localhost:3000"
	).replace(/\/+$/, "");
}

type BookingCustomerDetails = {
	readonly firstName: string;
	readonly lastName: string;
	readonly email: string;
	readonly phone: string | null;
};

/**
 * Sends the customer-facing email + WhatsApp pair for a booking lifecycle
 * event (pending/confirmed/completed/cancelled/rescheduled), matching the
 * legacy Firebase automations. Never throws: provider failures are recorded
 * as FAILED deliveries and never break the booking flow itself.
 */
export async function notifyBookingCustomer(input: {
	readonly tenantId: string;
	readonly bookingId: string;
	readonly businessName: string;
	readonly templateKey: string;
	readonly customer: BookingCustomerDetails;
	readonly serviceName?: string | null;
	readonly appointmentDate: Date;
	readonly timeLabel: string;
}): Promise<void> {
	if (!input.customer.email || !input.bookingId) return;

	const subject: NotificationSubject = {
		businessName: input.businessName,
		firstName: input.customer.firstName,
		lastName: input.customer.lastName,
		serviceName: input.serviceName ?? "",
		appointmentDate: input.appointmentDate.toISOString().slice(0, 10),
		timeLabel: input.timeLabel,
	};

	const jobs: Promise<unknown>[] = [
		dispatchNotification({
			tenantId: input.tenantId,
			bookingId: input.bookingId,
			channel: NotificationChannel.EMAIL,
			templateKey: input.templateKey,
			destination: input.customer.email.toLowerCase(),
			subject,
		}),
	];
	if (input.customer.phone) {
		jobs.push(
			dispatchNotification({
				tenantId: input.tenantId,
				bookingId: input.bookingId,
				channel: NotificationChannel.WHATSAPP,
				templateKey: input.templateKey,
				destination: input.customer.phone,
				subject,
			}),
		);
	}
	await Promise.allSettled(jobs);
}

/**
 * Alerts the next waiting customer that an opening just became available,
 * matching the legacy slot-release waitlist automation. Never throws.
 */
export async function notifyNextWaitlistedCustomer(
	tenantId: string,
): Promise<void> {
	const tenant = await prisma.tenant.findUnique({
		where: { id: tenantId },
		select: { businessName: true },
	});
	if (!tenant) return;
	const entry = await prisma.waitlistEntry.findFirst({
		where: { tenantId, status: WaitlistStatus.WAITING },
		orderBy: [{ queuePosition: "asc" }, { createdAt: "asc" }],
		select: {
			email: true,
			phone: true,
			serviceName: true,
			preferredDate: true,
			preferredTime: true,
		},
	});
	if (!entry?.email) return;

	const subject: NotificationSubject = {
		businessName: tenant.businessName,
		customerName: "",
		serviceName: entry.serviceName,
		appointmentDate: entry.preferredDate?.toISOString().slice(0, 10) ?? "",
		timeLabel: entry.preferredTime ?? "",
	};

	const jobs: Promise<unknown>[] = [
		dispatchNotification({
			tenantId,
			channel: NotificationChannel.EMAIL,
			templateKey: "waitlist.available",
			destination: entry.email,
			subject,
		}),
	];
	if (entry.phone) {
		jobs.push(
			dispatchNotification({
				tenantId,
				channel: NotificationChannel.WHATSAPP,
				templateKey: "waitlist.available",
				destination: entry.phone,
				subject,
			}),
		);
	}
	await Promise.allSettled(jobs);
}