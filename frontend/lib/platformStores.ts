import { listPublicTenantCards, type PublicTenantCard } from "@backend/services/tenantDirectory"

export type PlatformStore = PublicTenantCard

export async function getTopStores(limit = 3): Promise<PlatformStore[]> {
	if (limit < 1) return []
	const stores = await listPublicTenantCards()
	return stores.slice(0, limit)
}

export async function getAllPublicStores(): Promise<PlatformStore[]> {
	return listPublicTenantCards()
}
