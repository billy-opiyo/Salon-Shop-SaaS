import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

import {
	assertPlatformAdmin,
	PlatformAuthorizationError,
} from "@backend/services/platformAuthorization"
import {
	assertPlatformTeamUploadSize,
	createPlatformTeamMember,
	deletePlatformTeamAvatar,
	deletePlatformTeamMember,
	PlatformTeamError,
	uploadPlatformTeamAvatar,
	updatePlatformTeamMember,
} from "@backend/services/platformTeamService"
import { platformTeamMemberSchema } from "@shared/validation/platformTeam"

export const runtime = "nodejs"

type AuthorizedPlatformRequest =
	| { readonly response: NextResponse }
	| {
			readonly session: {
				readonly user: { readonly id: string; readonly email?: string | null }
			}
	  }

function text(formData: FormData, name: string): string {
	return String(formData.get(name) ?? "").trim()
}

function booleanValue(formData: FormData, name: string): boolean {
	const value = text(formData, name).toLowerCase()
	return formData.has(name) && value !== "false" && value !== "0"
}

function inputFromForm(
	formData: FormData,
	avatar?: { readonly url: string; readonly objectKey: string },
) {
	return platformTeamMemberSchema.parse({
		name: text(formData, "name"),
		role: text(formData, "role"),
		bio: text(formData, "bio"),
		avatarUrl: avatar?.url ?? "",
		avatarObjectKey: avatar?.objectKey ?? "",
		websiteUrl: text(formData, "websiteUrl"),
		instagramUrl: text(formData, "instagramUrl"),
		facebookUrl: text(formData, "facebookUrl"),
		linkedinUrl: text(formData, "linkedinUrl"),
		xUrl: text(formData, "xUrl"),
		displayOrder: Number(text(formData, "displayOrder") || 0),
		published: booleanValue(formData, "published"),
	})
}

async function authorize(request: NextRequest): Promise<AuthorizedPlatformRequest> {
	const session = await auth()
	if (!session?.user?.id)
		return {
			response: NextResponse.json(
				{ error: "Authentication required." },
				{ status: 401 },
			),
		}
	const origin = request.headers.get("origin")
	if (origin && origin !== request.nextUrl.origin)
		return {
			response: NextResponse.json(
				{ error: "Invalid request origin." },
				{ status: 403 },
			),
		}
	try {
		assertPlatformAdmin(session.user.id, session.user.email)
	} catch (error) {
		if (error instanceof PlatformAuthorizationError)
			return {
				response: NextResponse.json(
					{ error: error.message },
					{ status: 403 },
				),
			}
		throw error
	}
	return {
		session: {
			user: { id: session.user.id, email: session.user.email },
		},
	}
}

export async function POST(request: NextRequest): Promise<NextResponse> {
	const authorization = await authorize(request)
	if ("response" in authorization) return authorization.response
	const { session } = authorization
	let uploaded: { readonly url: string; readonly objectKey: string } | undefined
	try {
		const formData = await request.formData()
		const action = text(formData, "action")
		const id = text(formData, "id")
		if (action === "delete") {
			if (!id)
				return NextResponse.json(
					{ error: "Member ID is required." },
					{ status: 400 },
				)
			await deletePlatformTeamMember(session.user.id, session.user.email, id)
			return NextResponse.json({ ok: true })
		}
		if (action !== "create" && action !== "update")
			return NextResponse.json(
				{ error: "Unknown team action." },
				{ status: 400 },
			)

		const file = formData.get("avatar")
		let avatar: { readonly url: string; readonly objectKey: string } | undefined
		if (file instanceof File && file.size > 0) {
			assertPlatformTeamUploadSize(file.size)
			uploaded = await uploadPlatformTeamAvatar(
				Buffer.from(await file.arrayBuffer()),
				file.name,
				file.type,
			)
			avatar = uploaded
		}
		const input = inputFromForm(formData, avatar)
		if (action === "create") {
			const member = await createPlatformTeamMember(
				session.user.id,
				session.user.email,
				input,
			)
			return NextResponse.json({ member }, { status: 201 })
		}
		if (!id)
			return NextResponse.json(
				{ error: "Member ID is required." },
				{ status: 400 },
			)
		const member = await updatePlatformTeamMember(
			session.user.id,
			session.user.email,
			id,
			input,
		)
		return NextResponse.json({ member })
	} catch (error) {
		if (uploaded?.objectKey)
			await deletePlatformTeamAvatar(uploaded.objectKey).catch(() => undefined)
		if (
			error instanceof PlatformTeamError ||
			(error instanceof Error && error.name === "ZodError")
		)
			return NextResponse.json({ error: error.message }, { status: 400 })
		console.error("Platform team action failed:", error)
		return NextResponse.json(
			{ error: "Platform team action failed." },
			{ status: 500 },
		)
	}
}
