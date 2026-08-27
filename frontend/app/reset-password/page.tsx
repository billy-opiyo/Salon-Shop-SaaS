import { ResetPasswordForm } from "./ResetPasswordForm"

interface ResetPasswordPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = searchParams ? await searchParams : {}
  const rawToken = params.token
  const initialToken =
    typeof rawToken === "string"
      ? rawToken
      : Array.isArray(rawToken)
        ? (rawToken[0] ?? "")
        : ""

  return (
    <main className="auth-page">
      <section className="auth-card" aria-label="Password reset">
        <span className="brand-mark">Beauty Sphia</span>
        <p className="eyebrow">Account recovery</p>
        <h1>Reset your password.</h1>
        <ResetPasswordForm initialToken={initialToken} />
      </section>
    </main>
  )
}