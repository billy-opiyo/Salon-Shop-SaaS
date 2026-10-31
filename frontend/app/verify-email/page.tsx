import { VerifyEmailClient } from "./VerifyEmailClient"
import { SalonVerifyEmailClient } from "@/components/tenant/SalonVerifyEmailClient"
import { getTenantStorefront } from "@backend/services/tenantDirectory"
import { getSafeAuthCallbackUrl } from "@shared/authCallback"
import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"
import { platformThemeStyle } from "@/lib/platformTheme"

interface VerifyEmailPageProps {
	searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
	const params = searchParams ? await searchParams : {}
	const tenantValue = params.tenant
	const tenantSlug =
		typeof tenantValue === "string"
			? tenantValue
			: Array.isArray(tenantValue)
				? (tenantValue[0] ?? "")
				: ""
  const rawToken = params.token
	const rawCallbackUrl = params.callbackUrl
	const callbackUrl = getSafeAuthCallbackUrl(
		typeof rawCallbackUrl === "string" ? rawCallbackUrl : Array.isArray(rawCallbackUrl) ? rawCallbackUrl[0] : undefined,
	)
	const initialToken =
    typeof rawToken === "string"
      ? rawToken
      : Array.isArray(rawToken)
        ? (rawToken[0] ?? "")
		: ""
	if (tenantSlug) {
		const tenant = await getTenantStorefront(tenantSlug)
		if (tenant) {
			return (
				<SalonVerifyEmailClient
					businessName={tenant.businessName}
					logoSrc={
						tenant.logoUrl ??
						(tenant.slug === "royal-braids"
							? "/assets/salon/RoyalBraidsnewlogo.png"
							: "/assets/salon/logo.png")
					}
					homeHref={`/${tenant.slug}#home`}
					initialToken={initialToken}
				/>
			)
		}
	}
	const design = await getPlatformStorefrontDesign()

  return (
    <div className="platform-site" style={platformThemeStyle(design.theme)}>
      <main className="auth-page">
        <section className="auth-card" aria-label="Email verification">
          <span className="brand-mark">Beauty Sphia</span>
				  <VerifyEmailClient initialToken={initialToken} callbackUrl={callbackUrl} />
        </section>
      </main>
    </div>
  )
}
