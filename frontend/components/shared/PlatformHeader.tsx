import { auth } from "@/auth"
import { PlatformHeaderClient } from "@/components/shared/PlatformHeaderClient"
import { isPlatformAdmin } from "@backend/services/platformAuthorization"

interface PlatformHeaderProps {
	readonly page?: "home" | "stores" | "about" | "support"
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
		? isPlatformAdmin(session.user.id, session.user.email)
		: false

	return <PlatformHeaderClient page={page} logoUrl={logoUrl} brandName={brandName} brandTagline={brandTagline} isSignedIn={Boolean(session?.user)} canAccessPlatformAdmin={canAccessPlatformAdmin} />
}
