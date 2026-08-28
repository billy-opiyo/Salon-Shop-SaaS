import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

import {
	PlatformAdminActionError,
	resolvePaymentAttempt,
	resolvePlatformSecurityAlert,
	setTenantSuspension,
} from "@backend/services/platformAdminService"
import {
	assertPlatformAdmin,
	PlatformAuthorizationError,
} from "@backend/services/platformAuthorization"

export async function POST(request: NextRequest) {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json(
			{ error: "Authentication required." },
			{ status: 401 },
		)
	const origin = request.headers.get("origin")
	if (origin && origin !== request.nextUrl.origin)
		return NextResponse.json(
			{ error: "Invalid request origin." },
			{ status: 403 },
		)
	try {
		assertPlatformAdmin(session.user.id, session.user.email)
	} catch (error) {
		if (error instanceof PlatformAuthorizationError)
			return NextResponse.json({ error: error.message }, { status: 403 })
		throw error
	}

	try {
		const body = (await request.json()) as { action?: unknown; id?: unknown }
		const action = typeof body.action === "string" ? body.action : ""
		const id = typeof body.id === "string" ? body.id.trim() : ""
		if (!id)
			return NextResponse.json(
				{ error: "Action target is required." },
				{ status: 400 },
			)
		switch (action) {
			case "suspend-tenant":
				await setTenantSuspension(session.user.id, id, true)
				break
			case "reactivate-tenant":
				await setTenantSuspension(session.user.id, id, false)
				break
			case "resolve-payment":
				await resolvePaymentAttempt(session.user.id, id)
				break
			case "resolve-security-alert":
				await resolvePlatformSecurityAlert(session.user.id, id)
				break
			default:
				return NextResponse.json(
					{ error: "Unknown platform admin action." },
					{ status: 400 },
				)
		}
		return NextResponse.json({ ok: true })
	} catch (error) {
		if (error instanceof PlatformAdminActionError)
			return NextResponse.json({ error: error.message }, { status: 400 })
		console.error("Platform admin action failed:", error)
		return NextResponse.json(
			{ error: "Platform admin action failed." },
			{ status: 500 },
		)
	}
}
