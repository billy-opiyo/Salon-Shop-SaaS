import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

import {
	acceptTeamInvitation,
	TeamInvitationError,
} from "@backend/services/teamInvitationService"

export async function POST(request: NextRequest) {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json(
			{ error: "Authentication required." },
			{ status: 401 },
		)
	try {
		const body = (await request.json()) as { code?: unknown }
		if (typeof body.code !== "string" || body.code.length !== 64) {
			return NextResponse.json(
				{ error: "A valid invitation code is required." },
				{ status: 400 },
			)
		}
		const result = await acceptTeamInvitation(session.user.id, body.code)
		return NextResponse.json({ ok: true, ...result })
	} catch (error) {
		if (error instanceof TeamInvitationError)
			return NextResponse.json({ error: error.message }, { status: 400 })
		return NextResponse.json(
			{ error: "Invitation could not be accepted." },
			{ status: 500 },
		)
	}
}
