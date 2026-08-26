import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { MembershipRole } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import {
	cancelTeamInvitation,
	inviteTeamMember,
	listTeamInvitationsForUser,
	resendTeamInvitation,
	TeamInvitationError,
} from "@backend/services/teamInvitationService"

async function resolveTenantId(tenantSlug: string): Promise<string | null> {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: { id: true },
	})
	return tenant?.id ?? null
}

export async function GET(
	_request: NextRequest,
	props: { params: Promise<{ tenantSlug: string }> },
) {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	const { tenantSlug } = await props.params
	try {
		const tenantId = await resolveTenantId(tenantSlug)
		if (!tenantId)
			return NextResponse.json({ error: "Store not found" }, { status: 404 })
		return NextResponse.json(
			await listTeamInvitationsForUser(session.user.id, tenantId),
			{
				headers: { "cache-control": "no-store" },
			},
		)
	} catch (error) {
		if (
			error instanceof TeamInvitationError ||
			(error instanceof Error && error.name === "AuthorizationError")
		) {
			return NextResponse.json({ error: error.message }, { status: 403 })
		}
		return NextResponse.json(
			{ error: "Invitations could not be loaded." },
			{ status: 500 },
		)
	}
}

export async function POST(
	request: NextRequest,
	props: { params: Promise<{ tenantSlug: string }> },
) {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	const { tenantSlug } = await props.params
	try {
		const body = (await request.json()) as Record<string, unknown>
		const tenantId = await resolveTenantId(tenantSlug)
		if (!tenantId)
			return NextResponse.json({ error: "Store not found" }, { status: 404 })
		if (body.action === "cancel" || body.action === "resend") {
			if (typeof body.invitationId !== "string")
				return NextResponse.json(
					{ error: "Invitation id is required" },
					{ status: 400 },
				)
			if (body.action === "cancel") {
				await cancelTeamInvitation(session.user.id, tenantId, body.invitationId)
				return NextResponse.json({ ok: true })
			}
			return NextResponse.json(
				await resendTeamInvitation(
					session.user.id,
					tenantId,
					body.invitationId,
				),
			)
		}
		if (typeof body.email !== "string" || !body.email.trim())
			return NextResponse.json(
				{ error: "Invitee email is required" },
				{ status: 400 },
			)
		const role =
			body.role === "OWNER" || body.role === "ADMIN" || body.role === "STAFF"
				? body.role
				: "STAFF"
		const result = await inviteTeamMember(
			session.user.id,
			tenantId,
			body.email,
			role as MembershipRole,
			{
				canManageBookings: body.canManageBookings === true,
				canManageContent: body.canManageContent === true,
				canManageSecurity: body.canManageSecurity === true,
			},
		)
		return NextResponse.json({ ok: true, ...result }, { status: 201 })
	} catch (error) {
		if (
			error instanceof TeamInvitationError ||
			(error instanceof Error && error.name === "AuthorizationError")
		) {
			return NextResponse.json({ error: error.message }, { status: 400 })
		}
		return NextResponse.json(
			{ error: "Invitation action failed." },
			{ status: 500 },
		)
	}
}
