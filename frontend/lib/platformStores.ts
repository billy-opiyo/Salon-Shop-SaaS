import { headers } from "next/headers"
import { listPublicTenantCards, type PublicTenantCard } from "@backend/services/tenantDirectory"

export type PlatformStore = PublicTenantCard & { readonly isDemo?: boolean }

const demoStores: readonly PlatformStore[] = [
	{
		slug: "lush-locks-studio",
		name: "Lush Locks Studio",
		location: "Mombasa, Kenya",
		tagline: "Knotless, goddess and box braids finished with a soft, natural shine.",
		rating: null,
		reviewCount: 0,
		imageUrl: "/platform/Lush Locks Studio logo.png",
		href: "#",
		createdAt: new Date(0),
		isDemo: true,
	},
	{
		slug: "glow-atelier",
		name: "Glow Atelier",
		location: "Nakuru, Kenya",
		tagline: "Facials, lash extensions, brows and event-ready glam in one calm studio.",
		rating: null,
		reviewCount: 0,
		imageUrl: "/platform/Glow Atelier logo.png",
		href: "#",
		createdAt: new Date(0),
		isDemo: true,
	},
]

async function includeDemoStores() {
	// Local previews and staging can show the reference salons. Other production
	// hosts require an explicit opt-in before these demo listings are included.
	const host = (await headers()).get("host")?.split(":", 1)[0].toLowerCase()
	return process.env.NODE_ENV !== "production" ||
		host === "beauty-sphia-staging.vercel.app" ||
		process.env.VERCEL_GIT_COMMIT_REF === "staging" ||
		process.env.PLATFORM_DEMO_STORES === "true"
}

async function withDemoStores(stores: PublicTenantCard[]): Promise<PlatformStore[]> {
	if (!(await includeDemoStores())) return stores
	const existingSlugs = new Set(stores.map((store) => store.slug))
	return [
		...stores,
		...demoStores.filter((store) => !existingSlugs.has(store.slug)),
	]
}

export async function getTopStores(limit = 3): Promise<PlatformStore[]> {
	if (limit < 1) return []
	const stores = await withDemoStores(await listPublicTenantCards())
	return stores.slice(0, limit)
}

export async function getAllPublicStores(): Promise<PlatformStore[]> {
	return withDemoStores(await listPublicTenantCards())
}
