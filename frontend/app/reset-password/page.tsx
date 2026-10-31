import { ResetPasswordForm } from "./ResetPasswordForm"
import { getSafeAuthCallbackUrl } from "@shared/authCallback"
import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"
import { platformThemeStyle } from "@/lib/platformTheme"

interface ResetPasswordPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = searchParams ? await searchParams : {}
  const rawToken = params.token
  const rawCallbackUrl = params.callbackUrl
  const initialToken =
    typeof rawToken === "string"
      ? rawToken
      : Array.isArray(rawToken)
        ? (rawToken[0] ?? "")
        : ""
  const callbackUrl = getSafeAuthCallbackUrl(
    typeof rawCallbackUrl === "string"
      ? rawCallbackUrl
      : Array.isArray(rawCallbackUrl)
        ? rawCallbackUrl[0]
        : undefined,
  )
  const design = await getPlatformStorefrontDesign()

  return (
    <div className="platform-site" style={platformThemeStyle(design.theme)}>
      <main className="auth-page">
        <section className="auth-card" aria-label="Password reset">
          <span className="brand-mark">Beauty Sphia</span>
          <p className="eyebrow">Account recovery</p>
          <h1>Reset your password.</h1>
          <ResetPasswordForm initialToken={initialToken} callbackUrl={callbackUrl} />
        </section>
      </main>
    </div>
  )
}
