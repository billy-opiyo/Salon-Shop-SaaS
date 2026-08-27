export interface PlatformStore {
	readonly slug: string
	readonly name: string
	readonly location: string
	readonly tagline: string
	readonly rating: number
	readonly reviewCount: number
	readonly addedAt: string
	readonly imageUrl: string
	readonly href: string
	readonly available: boolean
}

/**
 * The live store directory. Royal Braids is the only fully-provisioned store
 * today, so it is always guaranteed to appear in the top picks. The remaining
 * entries are light showcase cards so the "top stores" grid is demonstrable;
 * they render with an "Opening soon" badge and do not route to a broken page.
 */
const STORE_CATALOG: readonly PlatformStore[] = [
	{
		slug: "royal-braids",
		name: "Royal Braids",
		location: "Nairobi, Kenya",
		tagline:
			"Premium African hair braiding, beauty spa rituals, nails, makeup & bridal-ready glam.",
		rating: 4.8,
		reviewCount: 312,
		addedAt: "2024-01-12",
		imageUrl: "/platform/Royal Braids logo.png",
		href: "/royal-braids",
		available: true,
	},
	{
		slug: "lush-locks-studio",
		name: "Lush Locks Studio",
		location: "Mombasa, Kenya",
		tagline:
			"Knotless, goddess and box braids finished with a soft, natural shine.",
		rating: 4.9,
		reviewCount: 204,
		addedAt: "2024-06-03",
		imageUrl: "/platform/Lush Locks Studio logo.png",
		href: "#lush-locks-studio",
		available: false,
	},
	{
		slug: "glow-atelier",
		name: "Glow Atelier",
		location: "Nakuru, Kenya",
		tagline:
			"Facials, lash extensions, brows and event-ready glam in one calm studio.",
		rating: 4.7,
		reviewCount: 158,
		addedAt: "2024-03-21",
		imageUrl: "/platform/Glow Atelier logo.png",
		href: "#glow-atelier",
		available: false,
	},
]

/**
 * Returns the top stores, sorted so the newest, most highly rated salons rise
 * to the top. At most `limit` (default 3) stores are returned and Royal Braids
 * is always preserved in the results.
 */
export function getTopStores(limit = 3): PlatformStore[] {
	if (limit < 1) return []

	const sorted = [...STORE_CATALOG].sort(
		(a, b) =>
			b.rating - a.rating ||
			Date.parse(b.addedAt) - Date.parse(a.addedAt),
	)

	const royalBraids = sorted.find((store) => store.slug === "royal-braids")
	const royaltySorted = royalBraids
		? [royalBraids, ...sorted.filter((store) => store.slug !== "royal-braids")]
		: sorted

	return royaltySorted.slice(0, limit)
}
