import { NextResponse } from "next/server"

import { auth } from "@/auth"
import {
	FavoriteRequestError,
	removeFavoriteForClient,
	saveFavoriteForClient,
} from "@backend/services/favoriteService"

export const dynamic = "force-dynamic"

async function getInput(request: Request) {
	const body = (await request.json()) as {
		tenantSlug?: unknown
		galleryStyleId?: unknown
	}
	return {
		tenantSlug: typeof body.tenantSlug === "string" ? body.tenantSlug : "",
		galleryStyleId:
			typeof body.galleryStyleId === "string" ? body.galleryStyleId : "",
	}
}

export async function POST(request: Request): Promise<NextResponse> {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json(
			{ error: "Authentication required." },
			{ status: 401 },
		)
	try {
		const input = await getInput(request)
		if (input.tenantSlug.length < 3 || input.galleryStyleId.length < 1)
			return NextResponse.json(
				{ error: "A valid gallery style is required." },
				{ status: 400 },
			)
		const favorite = await saveFavoriteForClient(
			session.user.id,
			input.tenantSlug,
			input.galleryStyleId,
		)
		return NextResponse.json({ favoriteId: favorite.id }, { status: 201 })
	} catch (error) {
		if (error instanceof FavoriteRequestError)
			return NextResponse.json({ error: error.message }, { status: 400 })
		return NextResponse.json(
			{ error: "The favorite could not be saved." },
			{ status: 500 },
		)
	}
}

export async function DELETE(request: Request): Promise<NextResponse> {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json(
			{ error: "Authentication required." },
			{ status: 401 },
		)
	try {
		const input = await getInput(request)
		if (input.tenantSlug.length < 3 || input.galleryStyleId.length < 1)
			return NextResponse.json(
				{ error: "A valid gallery style is required." },
				{ status: 400 },
			)
		await removeFavoriteForClient(
			session.user.id,
			input.tenantSlug,
			input.galleryStyleId,
		)
		return new NextResponse(null, { status: 204 })
	} catch (error) {
		if (error instanceof FavoriteRequestError)
			return NextResponse.json({ error: error.message }, { status: 400 })
		return NextResponse.json(
			{ error: "The favorite could not be removed." },
			{ status: 500 },
		)
	}
}
