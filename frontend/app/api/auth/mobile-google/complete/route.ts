import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/auth"
import { issueMobileGoogleTicket, isValidMobileGoogleChallenge, isValidMobileGoogleState } from "@backend/services/mobileGoogleTicketService"
import { resolveAndroidWebsiteChannel } from "@/lib/android-update-channel"

const STAGING_APP_ID = "com.beautysphia.app.staging"
const PRODUCTION_APP_ID = "com.beautysphia.app"

export async function GET(request: NextRequest) {
	const state = request.nextUrl.searchParams.get("state") || ""
	const challenge = request.nextUrl.searchParams.get("challenge") || ""
	const applicationId = request.nextUrl.searchParams.get("applicationId") || ""
	const channel = resolveAndroidWebsiteChannel(request.nextUrl.origin, process.env.BEAUTY_SPHIA_PRODUCTION_URL)
	const expectedApplicationId = channel === "staging" ? STAGING_APP_ID : channel === "production" ? PRODUCTION_APP_ID : null
	if (!isValidMobileGoogleState(state) || !isValidMobileGoogleChallenge(challenge)
		|| !expectedApplicationId || applicationId !== expectedApplicationId) {
		return NextResponse.redirect(new URL("/login?error=MobileAuthState", request.url), { headers: { "Cache-Control": "no-store" } })
	}
	const session = await auth()
	const userId = session?.user?.id
	if (!userId) {
		return NextResponse.redirect(new URL("/login?error=MobileAuthSession", request.url), { headers: { "Cache-Control": "no-store" } })
	}
	const ticket = await issueMobileGoogleTicket({ state, challenge, userId })
	const callback = new URL(`${applicationId}://auth/callback`)
	callback.searchParams.set("ticket", ticket)
	callback.searchParams.set("state", state)
	return new Response(null, {
		status: 302,
		headers: { Location: callback.toString(), "Cache-Control": "no-store, max-age=0" },
	})
}
