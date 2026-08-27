import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

import {
	activateDomainForUser,
	listDomainsForUser,
	registerDomainForUser,
	removeDomainForUser,
	TenantDomainError,
	verifyDomainForUser,
} from "@backend/services/tenantDomainService"

type RouteProps = { params: Promise<{ tenantSlug: string }> }

function errorResponse(error: unknown) {
	if (
		error instanceof TenantDomainError ||
		(error instanceof Error && error.name === "AuthorizationError")
	)
		return NextResponse.json({ error: error.message }, { status: 400 })
	console.error("Tenant domain operation failed:", error)
	return NextResponse.json(
		{ error: "Domain operation failed." },
		{ status: 500 },
	)
}

export async function GET(_request: NextRequest, props: RouteProps) {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	const { tenantSlug } = await props.params
	try {
		return NextResponse.json(
			await listDomainsForUser(session.user.id, tenantSlug),
			{ headers: { "cache-control": "no-store" } },
		)
	} catch (error) {
		return errorResponse(error)
	}
}

export async function POST(request: NextRequest, props: RouteProps) {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	const { tenantSlug } = await props.params
	const body = (await request.json().catch(() => null)) as Record<
		string,
		unknown
	> | null
	const action = typeof body?.action === "string" ? body.action : ""
	try {
		if (action === "register")
			return NextResponse.json(
				await registerDomainForUser(session.user.id, tenantSlug, body),
				{ status: 201 },
			)
		if (action === "verify" && typeof body?.domainId === "string")
			return NextResponse.json(
				await verifyDomainForUser(session.user.id, tenantSlug, body.domainId),
			)
		if (action === "activate" && typeof body?.domainId === "string")
			return NextResponse.json(
				await activateDomainForUser(session.user.id, tenantSlug, body.domainId),
			)
		return NextResponse.json(
			{ error: "A valid domain action is required." },
			{ status: 400 },
		)
	} catch (error) {
		return errorResponse(error)
	}
}

export async function DELETE(request: NextRequest, props: RouteProps) {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	const { tenantSlug } = await props.params
	const domainId = new URL(request.url).searchParams.get("domainId")
	if (!domainId)
		return NextResponse.json(
			{ error: "Domain id is required." },
			{ status: 400 },
		)
	try {
		return NextResponse.json(
			await removeDomainForUser(session.user.id, tenantSlug, domainId),
		)
	} catch (error) {
		return errorResponse(error)
	}
}
