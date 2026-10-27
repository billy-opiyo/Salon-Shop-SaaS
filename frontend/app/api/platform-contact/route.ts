import { NextResponse } from "next/server"

import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"
import { dispatchPlatformContactEmail } from "@backend/services/notificationService"
import { consumeRateLimit, hashRateLimitSubject } from "@backend/services/rateLimit"
import { verifyTurnstileToken } from "@backend/services/turnstile"
import { platformContactRequestSchema } from "@shared/validation/contact"

export const dynamic = "force-dynamic"

export async function POST(request: Request): Promise<NextResponse> {
	let body: unknown
	try {
		body = await request.json()
	} catch {
		return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
	}
	const parsed = platformContactRequestSchema.safeParse(body)
	if (!parsed.success) {
		return NextResponse.json({ error: "Please complete the contact details correctly." }, { status: 400 })
	}
	const remoteAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
	if (!(await verifyTurnstileToken(parsed.data.turnstileToken, remoteAddress))) {
		return NextResponse.json({ error: "Security verification failed. Please try again." }, { status: 403 })
	}
	try {
		await consumeRateLimit({
			subjectKey: hashRateLimitSubject(`${remoteAddress ?? "unknown"}:${parsed.data.email}`),
			kind: "platform-contact",
			intervalMs: 60_000,
		})
		const design = await getPlatformStorefrontDesign()
		const result = await dispatchPlatformContactEmail({
			to: design.contact.supportEmail,
			name: parsed.data.name,
			fromEmail: parsed.data.email,
			subject: parsed.data.subject,
			message: parsed.data.message,
		})
		if (!result.ok) {
			return NextResponse.json({ error: "The message could not be delivered right now. Please email platform support directly." }, { status: 503 })
		}
		return NextResponse.json({ status: "sent" }, { status: 201 })
	} catch {
		return NextResponse.json({ error: "The platform contact message could not be sent." }, { status: 500 })
	}
}
