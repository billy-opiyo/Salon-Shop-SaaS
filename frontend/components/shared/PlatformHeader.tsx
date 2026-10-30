import { auth } from "@/auth"
import { PlatformHeaderClient } from "@/components/shared/PlatformHeaderClient"
import { isPlatformAdminForNavigation } from "@backend/services/platformAuthorization"

interface PlatformHeaderProps {
	readonly page?: "home" | "stores" | "about" | "support" | "account" | "onboarding"
	readonly logoUrl?: string
	readonly brandName?: string
	readonly brandTagline?: string
}

export async function PlatformHeader({
	page = "home",
	logoUrl = "/platform/Beauty Sphia logo.webp",
	brandName = "Beauty Sphia",
	brandTagline = "Manage | Book | Grow",
}: PlatformHeaderProps) {
	const session = await auth()
	const canAccessPlatformAdmin = session?.user?.id
		? await isPlatformAdminForNavigation(session.user.id, session.user.email)
		: false

	return <PlatformHeaderClient key={session?.user?.image ?? "no-account-image"} page={page} logoUrl={logoUrl} brandName={brandName} brandTagline={brandTagline} isSignedIn={Boolean(session?.user)} userEmail={session?.user?.email} userImage={session?.user?.image} canAccessPlatformAdmin={canAccessPlatformAdmin} />
}
