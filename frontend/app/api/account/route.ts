import { NextResponse } from "next/server"

import { auth } from "@/auth"
import {
	changeClientPassword,
	ClientAccountMutationError,
	deleteClientAccount,
	updateClientProfile,
	updateClientPreferences,
} from "@backend/services/clientAccountMutationService"
import {
	ClientAccountError,
	getClientAccountSnapshot,
} from "@backend/services/clientAccountService"

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
	if (tenantSlug.length < 3 || tenantSlug.length > 48) {
		return NextResponse.json(
			{ error: "A valid salon store is required." },
			{ status: 400 },
		)
	}

	try {
		const snapshot = await getClientAccountSnapshot(userId, tenantSlug)
		return NextResponse.json(snapshot, { status: 200 })
	} catch (error) {
		if (error instanceof ClientAccountError) {
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
