import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

import {
	PlatformAuthorizationError,
	assertPlatformAdminPermission,
} from "@backend/services/platformAuthorization"
import {
	assignPlatformRole,
	listPlatformRoleAssignments,
	PlatformRoleError,
	removePlatformRoleAssignment,
} from "@backend/services/platformRoleService"

async function authorize(request?: NextRequest) {
	const session = await auth()
	if (!session?.user?.id)
		return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) }
	if (request) {
		const origin = request.headers.get("origin")
		if (origin && origin !== request.nextUrl.origin)
			return { response: NextResponse.json({ error: "Invalid request origin." }, { status: 403 }) }
	}
	try {
		await assertPlatformAdminPermission(session.user.id, session.user.email, "role-assignments:write")
	} catch (error) {
		if (error instanceof PlatformAuthorizationError)
			return { response: NextResponse.json({ error: error.message }, { status: 403 }) }
		throw error
	}
	return { session }
}

export async function GET() {
	try {
		const authorized = await authorize()
		if ("response" in authorized) return authorized.response
		const assignments = await listPlatformRoleAssignments(authorized.session.user.id, authorized.session.user.email)
		return NextResponse.json({ assignments })
	} catch (error) {
		console.error("Platform role assignments could not be loaded:", error)
		return NextResponse.json({ error: "Role assignments could not be loaded." }, { status: 500 })
	}
}

export async function POST(request: NextRequest) {
	try {
		const authorized = await authorize(request)
		if ("response" in authorized) return authorized.response
		const body = await request.json() as { email?: unknown; role?: unknown }
		if (typeof body.email !== "string" || typeof body.role !== "string")
			return NextResponse.json({ error: "Email and role are required." }, { status: 400 })
		const assignment = await assignPlatformRole(authorized.session.user.id, authorized.session.user.email, body.email, body.role)
		return NextResponse.json({ assignment })
	} catch (error) {
		if (error instanceof PlatformRoleError)
			return NextResponse.json({ error: error.message }, { status: 400 })
		console.error("Platform role assignment failed:", error)
		return NextResponse.json({ error: "The role assignment could not be saved." }, { status: 500 })
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const authorized = await authorize(request)
		if ("response" in authorized) return authorized.response
		const id = request.nextUrl.searchParams.get("id")?.trim()
		if (!id) return NextResponse.json({ error: "Role assignment ID is required." }, { status: 400 })
		await removePlatformRoleAssignment(authorized.session.user.id, authorized.session.user.email, id)
		return NextResponse.json({ ok: true })
	} catch (error) {
		if (error instanceof PlatformRoleError)
			return NextResponse.json({ error: error.message }, { status: 400 })
		console.error("Platform role assignment could not be removed:", error)
		return NextResponse.json({ error: "The role assignment could not be removed." }, { status: 500 })
	}
}
