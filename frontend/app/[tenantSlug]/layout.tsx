import type { Viewport } from "next"
import "../../styles/salon-storefront.css"
import { getTenantStorefrontBrand } from "@backend/services/tenantDirectory"
import {
	TenantNotFoundProvider,
	type TenantNotFoundBrand,
} from "@/components/tenant/NotFoundMarkup"

export async function generateViewport({
	params,
}: Readonly<{ params: Promise<{ tenantSlug: string }> }>): Promise<Viewport> {
	const { tenantSlug } = await params
	const brand = await getTenantStorefrontBrand(tenantSlug)
	const isLight = brand?.theme.mode === "light"
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
	const brand = await getTenantStorefrontBrand(tenantSlug)
	return (
		<TenantNotFoundProvider brand={brand as TenantNotFoundBrand | null}>
			{children}
		</TenantNotFoundProvider>
	)
}
