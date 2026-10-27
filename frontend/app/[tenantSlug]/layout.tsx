import "../../styles/salon-storefront.css"
import { getTenantStorefront } from "@backend/services/tenantDirectory"
import {
	TenantNotFoundProvider,
	type TenantNotFoundBrand,
} from "@/components/tenant/NotFoundMarkup"

export default async function TenantStorefrontLayout({
	params,
	children,
}: Readonly<{
	params: Promise<{ tenantSlug: string }>
	children: React.ReactNode
}>) {
	const { tenantSlug } = await params
	const tenant = await getTenantStorefront(tenantSlug)
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
