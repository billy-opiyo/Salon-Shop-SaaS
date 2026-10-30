import "server-only"

import { headers } from "next/headers"

export async function canPreviewRoyalBraidsDraft(): Promise<boolean> {
	if (
		process.env.NODE_ENV !== "production" ||
		process.env.VERCEL_GIT_COMMIT_REF === "staging" ||
		process.env.PLATFORM_DEMO_STORES === "true"
	)
		return true

	const host = (await headers()).get("host")?.split(":", 1)[0].toLowerCase()
	return host === "beauty-sphia-staging.vercel.app"
}

export async function tenantAllowsPublicActions(
	slug: string,
	status: string,
): Promise<boolean> {
	if (status === "ACTIVE") return true
	return (
		status === "DRAFT" &&
		slug.trim().toLowerCase() === "royal-braids" &&
		(await canPreviewRoyalBraidsDraft())
	)
}
