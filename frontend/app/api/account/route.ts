import { NextResponse } from "next/server"

import { auth } from "@/auth"
import {
	changeClientPassword,
	ClientAccountMutationError,
	deleteClientAccount,
	updateClientThemePreference,
	updateClientProfile,
	updateClientPreferences,
} from "@backend/services/clientAccountMutationService"
import {
	ClientAccountError,
	getClientAccountSnapshot,
} from "@backend/services/clientAccountService"
import {
	ClientWaitlistError,
	getClientWaitlistQueueInfo,
} from "@backend/services/clientWaitlistService"
import { clientWaitlistQueueSchema } from "@shared/validation/clientWaitlist"
import { emailChangeSchema } from "@shared/validation/auth"
import {
	AuthTokenError,
	createEmailChangeToken,
} from "@backend/services/authTokenService"
import {
	platformBaseUrl,
	sendPlatformEmail,
} from "@backend/services/notificationService"
import {
	consumeRateLimit,
	hashRateLimitSubject,
	RateLimitExceededError,
} from "@backend/services/rateLimit"

export const dynamic = "force-dynamic"

export async function GET(request: Request): Promise<NextResponse> {
	const session = await auth()
	const userId = session?.user?.id
	if (!userId)
		return NextResponse.json(
			{ error: "Authentication required." },
			{ status: 401 },
		)

	const tenantSlug =
		new URL(request.url).searchParams.get("tenantSlug")?.trim() ?? ""
	if (tenantSlug && (tenantSlug.length < 3 || tenantSlug.length > 48)) {
		return NextResponse.json(
			{ error: "A valid salon is required." },
			{ status: 400 },
		)
	}

	try {
		const query = new URL(request.url).searchParams
		const queueRequest = clientWaitlistQueueSchema.safeParse({
			tenantSlug,
			bookingId: query.get("bookingId") || undefined,
			waitlistId: query.get("waitlistId") || undefined,
		})
		if (
			(query.has("bookingId") || query.has("waitlistId")) &&
			!queueRequest.success
		) {
			return NextResponse.json(
				{ error: "A valid booking or waitlist request is required." },
				{ status: 400 },
			)
		}
		if (queueRequest.success) {
			const queueInfo = await getClientWaitlistQueueInfo({
				userId,
				...queueRequest.data,
			})
			return NextResponse.json(queueInfo, { status: 200 })
		}
		if ((query.has("bookingId") || query.has("waitlistId")) && !tenantSlug)
			return NextResponse.json({ error: "A salon is required for waitlist details." }, { status: 400 })
		const snapshot = await getClientAccountSnapshot(userId, tenantSlug || undefined)
		return NextResponse.json(snapshot, { status: 200 })
	} catch (error) {
		if (error instanceof ClientAccountError || error instanceof ClientWaitlistError) {
			return NextResponse.json({ error: error.message }, { status: 400 })
		}
		return NextResponse.json(
			{ error: "Account data could not be loaded." },
			{ status: 500 },
		)
	}
}

export async function PATCH(request: Request): Promise<NextResponse> {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json(
			{ error: "Authentication required." },
			{ status: 401 },
		)
	let body: unknown
	try {
		body = await request.json()
	} catch {
		return NextResponse.json(
			{ error: "Invalid request body." },
			{ status: 400 },
		)
	}
	try {
		if (typeof body === "object" && body !== null && "currentPassword" in body)
			await changeClientPassword(session.user.id, body)
		else if (
			typeof body === "object" &&
			body !== null &&
			"theme" in body &&
			Object.keys(body).length === 1
		)
			await updateClientThemePreference(session.user.id, body)
		else if (typeof body === "object" && body !== null && "theme" in body)
			await updateClientPreferences(session.user.id, body)
		else await updateClientProfile(session.user.id, body)
		return new NextResponse(null, { status: 204 })
	} catch (error) {
		if (
			error instanceof ClientAccountMutationError ||
			(error instanceof Error && error.name === "ZodError")
		)
			return NextResponse.json({ error: error.message }, { status: 400 })
		return NextResponse.json(
			{ error: "Account changes could not be saved." },
			{ status: 500 },
		)
	}
}

export async function POST(request: Request): Promise<NextResponse> {
	const session = await auth()
	const userId = session?.user?.id
	if (!userId)
		return NextResponse.json(
			{ error: "Authentication required." },
			{ status: 401 },
		)
	let body: unknown
	try {
		body = await request.json()
	} catch {
		return NextResponse.json(
			{ error: "Invalid request body." },
			{ status: 400 },
		)
	}
	const parsed = emailChangeSchema.safeParse(body)
	if (!parsed.success)
		return NextResponse.json(
			{ error: "Enter a valid email address." },
			{ status: 400 },
		)
	try {
		await consumeRateLimit({
			subjectKey: hashRateLimitSubject(userId),
			kind: "account-email-change",
			intervalMs: 15 * 60 * 1000,
		})
		const { token } = await createEmailChangeToken(userId, parsed.data.email)
		const tenantValue = new URL(request.url).searchParams.get("tenant") ?? ""
		const tenantQuery = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(tenantValue)
			? `&tenant=${encodeURIComponent(tenantValue)}`
			: ""
		const sent = await sendPlatformEmail({
			templateKey: "verify.address",
			destination: parsed.data.email,
			subject: {
				businessName: "Beauty Sphia",
				customerName: session.user.name ?? "",
				link: `${platformBaseUrl()}/verify-email?token=${encodeURIComponent(token)}${tenantQuery}`,
			},
		})
		if (!sent.ok)
			return NextResponse.json(
				{ error: "The confirmation email could not be sent. Please try again later." },
				{ status: 503 },
			)
		return NextResponse.json({ ok: true })
	} catch (error) {
		if (error instanceof RateLimitExceededError)
			return NextResponse.json({ error: error.message }, { status: 429 })
		if (error instanceof AuthTokenError)
			return NextResponse.json({ error: error.message }, { status: 400 })
		return NextResponse.json(
			{ error: "Email change could not be requested." },
			{ status: 500 },
		)
	}
}

export async function DELETE(): Promise<NextResponse> {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json(
			{ error: "Authentication required." },
			{ status: 401 },
		)
	try {
		await deleteClientAccount(session.user.id)
		return new NextResponse(null, { status: 204 })
	} catch (error) {
		if (error instanceof ClientAccountMutationError)
			return NextResponse.json({ error: error.message }, { status: 409 })
		return NextResponse.json(
			{ error: "Account could not be deleted." },
			{ status: 500 },
		)
	}
}
