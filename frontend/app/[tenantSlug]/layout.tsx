import type { Viewport } from "next"
import { cache } from "react"
import "../../styles/salon-storefront.css"
import { getTenantStorefront } from "@backend/services/tenantDirectory"
import {
	TenantNotFoundProvider,
	type TenantNotFoundBrand,
} from "@/components/tenant/NotFoundMarkup"

const getTenant = cache(getTenantStorefront)

export async function generateViewport({
	params,
}: Readonly<{ params: Promise<{ tenantSlug: string }> }>): Promise<Viewport> {
	const { tenantSlug } = await params
	const tenant = await getTenant(tenantSlug)
	const isLight = tenant?.theme.mode === "light"
	return {
		colorScheme: isLight ? "light" : "dark",
		themeColor: isLight ? "#f8f5f0" : "#0a0a0a",
	}
}

export default async function TenantStorefrontLayout({
	params,
	children,
}: Readonly<{
	params: Promise<{ tenantSlug: string }>
	children: React.ReactNode
}>) {
	const { tenantSlug } = await params
	const tenant = await getTenant(tenantSlug)
	const brand: TenantNotFoundBrand | null = tenant
		? {
			slug: tenant.slug,
			businessName: tenant.businessName,
			logoUrl: tenant.logoUrl,
			theme: tenant.theme,
		}
		: null

	return <TenantNotFoundProvider brand={brand}>{children}</TenantNotFoundProvider>
}
