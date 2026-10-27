import { auth, unstable_update } from "@/auth"
import { NextResponse } from "next/server"

import {
	ClientAccountMutationError,
	updateClientAvatar,
} from "@backend/services/clientAccountMutationService"

export const runtime = "nodejs"

export async function POST(request: Request): Promise<NextResponse> {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json({ error: "Authentication required." }, { status: 401 })
	const origin = request.headers.get("origin")
	if (origin && origin !== new URL(request.url).origin)
		return NextResponse.json({ error: "Invalid request origin." }, { status: 403 })
	try {
		const formData = await request.formData()
		const file = formData.get("avatar")
		if (!(file instanceof File) || file.size === 0)
			return NextResponse.json({ error: "Choose a profile image first." }, { status: 400 })
		const image = await updateClientAvatar(
			session.user.id,
			Buffer.from(await file.arrayBuffer()),
			file.type,
		)
		await unstable_update({})
		return NextResponse.json({ image })
	} catch (error) {
		if (error instanceof ClientAccountMutationError)
			return NextResponse.json({ error: error.message }, { status: 400 })
		console.error("Client avatar update failed:", error)
		return NextResponse.json({ error: "Profile photo could not be saved." }, { status: 500 })
	}
}
